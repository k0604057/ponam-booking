-- 20260816090000_init.sql  (= migration_01 : 초기 스키마)
-- 포남동 예약관리 — 호스트/관리자 업무공유 앱
-- 성격: 추가형 (신규 오브젝트만. DROP / UPDATE / DELETE 없음)
-- 적용: 단일 환경 (운영 프로젝트 하나). 리허설할 dev 없음.
--
-- 설계 원칙
--   * 민감정보는 컬럼이 아니라 "테이블"로 분리한다.
--     Supabase에서 모든 로그인 사용자는 같은 DB 롤(authenticated)이라 컬럼 단위 권한을
--     역할별로 나눌 수 없다. PostgREST는 클라이언트가 ?select= 로 아무 컬럼이나 지정할 수
--     있으므로 "앱 레벨에서 가린다"는 방어가 되지 않는다.
--       reservations        = 전원 조회 가능한 운영 정보 (숙소·기간·상태)
--       reservation_private = 게스트 개인정보 + 크롤 원본  → owner / reservation
--       reservation_finance = 금액                        → owner / reservation / settlement
--   * RLS 정책은 "행"만 제한하고 "컬럼"은 제한하지 못한다.
--     그래서 청소 담당의 쓰기는 UPDATE 정책이 아니라 SECURITY DEFINER 함수(RPC)로만 허용하고,
--     컬럼 변조 방지는 BEFORE UPDATE 가드 트리거로 처리한다.
--   * 청소는 "청소전 / 청소완료 + 메모"만 다룬다. 청소비는 이 앱에서 관리하지 않는다.

-- ============================================================
-- 1. ENUM
-- ============================================================
create type public.user_role          as enum ('owner','reservation','settlement','cleaning');
create type public.reservation_status as enum ('confirmed','cancelled','completed');
create type public.cleaning_status    as enum ('pending','done','skipped');  -- 청소전 / 청소완료 / 해당없음
create type public.entity_type        as enum ('reservation','cleaning','settlement');
create type public.settlement_status  as enum ('draft','confirmed');
create type public.sync_status        as enum ('running','success','failed');

-- ============================================================
-- 2. 사용자 / 초대
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null default '',
  name       text not null default '',
  phone      text,
  role       public.user_role not null default 'cleaning',
  -- 기본값 false : 가입만으로는 아무것도 못 본다. 초대 수락 라우트나 owner 가 활성화해야 멤버가 된다.
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is
  '활성 멤버끼리 서로의 이름·이메일·연락처를 볼 수 있다(업무 연락용). '
  '가입만으로는 is_active=false 라 아무것도 못 본다 — 초대 수락 또는 owner 승인이 있어야 한다.';

create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        public.user_role not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index invites_email_idx on public.invites(email) where accepted_at is null;

-- 역할 헬퍼. SECURITY DEFINER 라 RLS를 우회한다 → profiles 정책의 무한 재귀를 막는다.
-- 비활성 계정은 NULL을 돌려주므로 "app_role() is not null" 이 곧 활성 멤버 조건이 된다.
create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.app_role() is not null
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'owner', false)
$$;

-- auth.users 생성 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'name',''))
  on conflict (id) do nothing;
  return new;
exception when others then
  -- 가입 트랜잭션을 죽이지는 않되 조용히 넘어가지도 않는다.
  -- profiles 가 없는 사용자는 app_role()=null 이라 앱에 못 들어온다 → 로그 보고 수동 생성.
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 본인 프로필 수정 시 email 변조 방지 (auth.users 와 어긋나면 초대·알림이 엉킨다)
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() 가 null 이면 service_role(서버 라우트·크롤러)이므로 통과
  if auth.uid() is not null
     and new.email is distinct from old.email
     and not public.is_owner() then
    raise exception 'email 은 직접 바꿀 수 없습니다';
  end if;

  -- 활성 owner 가 0명이 되면 초대·역할부여 수단이 영구히 사라진다
  if (old.role = 'owner' and old.is_active)
     and (new.role <> 'owner' or not new.is_active)
     and not exists (select 1 from public.profiles
                      where role = 'owner' and is_active and id <> old.id) then
    raise exception '활성 상태의 호스트(owner)가 최소 한 명은 있어야 합니다';
  end if;

  return new;
end $$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- UPDATE 로 막아둔 "활성 owner 최소 1명"이 DELETE 한 줄로 무너지지 않게
create or replace function public.guard_profile_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() 가 null 이면 service_role / 대시보드에서 auth.users 를 지운 cascade → 통과
  if auth.uid() is null then return old; end if;
  if old.role = 'owner' and old.is_active
     and not exists (select 1 from public.profiles
                      where role = 'owner' and is_active and id <> old.id) then
    raise exception '마지막 호스트(owner) 계정은 삭제할 수 없습니다';
  end if;
  return old;
end $$;

create trigger profiles_guard_delete
  before delete on public.profiles
  for each row execute function public.guard_profile_delete();

-- ============================================================
-- 3. 숙소
-- ============================================================
create table public.properties (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  external_id text unique,               -- 33m2 방 식별자
  color       text not null default '#3b82f6',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 4. 예약 (운영 정보 — 전원 조회)
-- ============================================================
create table public.reservations (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties(id) on delete restrict,
  external_id    text not null,            -- 33m2 예약번호
  status         public.reservation_status not null default 'confirmed',
  checkin_date   date not null,
  checkout_date  date not null,
  checkin_time   time,
  checkout_time  time,
  nights         integer generated always as (checkout_date - checkin_date) stored,
  public_note    text,                     -- 청소 담당까지 보는 공용 메모. 개인정보 금지.
  first_seen_at  timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reservations_external_uniq unique (property_id, external_id),
  constraint reservations_date_order check (checkout_date >= checkin_date)
);
create index reservations_checkin_idx  on public.reservations(checkin_date);
create index reservations_checkout_idx on public.reservations(checkout_date);
create index reservations_property_idx on public.reservations(property_id, checkin_date);

comment on column public.reservations.public_note is
  '전 역할이 읽는다. 게스트 이름·연락처를 넣지 말 것 — reservation_private 를 쓸 것.';

-- 게스트 개인정보 + 크롤 원본 : owner / reservation 만
create table public.reservation_private (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  guest_name     text,
  guest_phone    text,
  guest_memo     text,
  raw            jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- 금액 : owner / reservation / settlement 만
create table public.reservation_finance (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  gross_amount   integer not null default 0,   -- 원 단위
  platform_fee   integer not null default 0,
  net_amount     integer not null default 0,
  updated_at     timestamptz not null default now()
);

-- 크롤링 변경 감사 로그
create table public.reservation_changes (
  id             bigserial primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  field          text not null,
  old_value      text,
  new_value      text,
  detected_at    timestamptz not null default now()
);
create index reservation_changes_res_idx on public.reservation_changes(reservation_id, detected_at desc);

-- ============================================================
-- 5. 청소 (청소전 / 청소완료 + 메모)
-- ============================================================
create table public.cleaning_tasks (
  id                    uuid primary key default gen_random_uuid(),
  property_id           uuid not null references public.properties(id) on delete restrict,
  source_reservation_id uuid unique references public.reservations(id) on delete cascade,
  scheduled_date        date not null,
  status                public.cleaning_status not null default 'pending',
  assignee_id           uuid references public.profiles(id) on delete set null,
  note                  text,
  needs_attention       boolean not null default false,  -- 완료 후 일정이 바뀐 경우 등
  completed_at          timestamptz,
  completed_by          uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index cleaning_tasks_date_idx      on public.cleaning_tasks(scheduled_date, status);
create index cleaning_tasks_assignee_idx  on public.cleaning_tasks(assignee_id) where status = 'pending';
create index cleaning_tasks_attention_idx on public.cleaning_tasks(needs_attention) where needs_attention;

create table public.cleaning_photos (
  id               uuid primary key default gen_random_uuid(),
  cleaning_task_id uuid not null references public.cleaning_tasks(id) on delete cascade,
  storage_path     text not null,
  uploaded_by      uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- 퇴실일 기준 청소 일정 자동 생성/동기화
create or replace function public.sync_cleaning_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' then
    update public.cleaning_tasks
       set status = 'skipped', updated_at = now()
     where source_reservation_id = new.id
       and status = 'pending';
    -- 이미 청소를 마쳤는데 예약이 취소된 경우 → 사람이 봐야 함
    update public.cleaning_tasks
       set needs_attention = true, updated_at = now()
     where source_reservation_id = new.id
       and status = 'done';
    return new;
  end if;

  insert into public.cleaning_tasks (property_id, source_reservation_id, scheduled_date)
  values (new.property_id, new.id, new.checkout_date)
  on conflict (source_reservation_id) do update
    set scheduled_date  = excluded.scheduled_date,
        property_id     = excluded.property_id,
        status          = case when cleaning_tasks.status = 'skipped'
                               then 'pending'::public.cleaning_status
                               else cleaning_tasks.status end,
        -- 이미 끝난 청소인데 날짜가 바뀌면 조용히 지나가지 않게 플래그
        needs_attention = cleaning_tasks.needs_attention
                          or (cleaning_tasks.status = 'done'
                              and cleaning_tasks.scheduled_date is distinct from excluded.scheduled_date),
        updated_at      = now();

  return new;
end $$;

create trigger reservations_sync_cleaning
  after insert or update of checkout_date, status, property_id on public.reservations
  for each row execute function public.sync_cleaning_task();

-- ---- 청소 담당용 RPC ----------------------------------------------------
-- cleaning 역할에는 cleaning_tasks UPDATE 정책을 주지 않는다. RLS가 컬럼을 막지 못해서
-- 정책으로 열어주면 scheduled_date·needs_attention·completed_by 까지 조작할 수 있기 때문.

-- 청소 건 맡기 / 놓기
create or replace function public.claim_cleaning_task(p_task_id uuid, p_claim boolean default true)
returns public.cleaning_tasks
language plpgsql security definer set search_path = public as $$
declare r public.cleaning_tasks;
begin
  if public.app_role() is null or public.app_role() = 'settlement' then
    raise exception '권한이 없습니다';
  end if;

  update public.cleaning_tasks
     set assignee_id = case when p_claim then auth.uid() else null end,
         updated_at  = now()
   where id = p_task_id
     and status = 'pending'
     and (assignee_id is null or assignee_id = auth.uid()
          or public.app_role() in ('owner','reservation'))
  returning * into r;

  if r.id is null then
    raise exception '배정할 수 없는 청소 건입니다';
  end if;
  return r;
end $$;

-- 청소완료 / 완료 취소 + 메모
create or replace function public.set_cleaning_done(
  p_task_id uuid,
  p_done    boolean default true,
  p_note    text    default null)
returns public.cleaning_tasks
language plpgsql security definer set search_path = public as $$
declare r public.cleaning_tasks;
begin
  if public.app_role() is null or public.app_role() = 'settlement' then
    raise exception '권한이 없습니다';
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception '메모는 2000자를 넘을 수 없습니다';
  end if;

  update public.cleaning_tasks
     set status       = case when p_done then 'done' else 'pending' end::public.cleaning_status,
         note         = coalesce(p_note, note),
         -- 최초 완료자만 기록한다. 재호출로 완료자를 갈아치울 수 없게.
         completed_at = case when p_done then coalesce(completed_at, now()) else completed_at end,
         completed_by = case when p_done then coalesce(completed_by, auth.uid()) else completed_by end,
         -- 완료를 되돌리는 건 흔치 않은 일이니 흔적을 남긴다
         needs_attention = case when p_done then needs_attention else true end,
         updated_at   = now()
   where id = p_task_id
     and status <> 'skipped'                    -- 취소된 예약 건은 완료 처리 불가
     -- 이미 완료된 건은 담당자 본인이나 owner/reservation 만 손댈 수 있다
     and (status <> 'done'
          or assignee_id = auth.uid()
          or completed_by = auth.uid()
          or public.app_role() in ('owner','reservation'))
     and (assignee_id = auth.uid()
          or assignee_id is null
          or public.app_role() in ('owner','reservation'))
  returning * into r;

  if r.id is null then
    raise exception '처리할 수 없는 청소 건입니다 (담당자가 아니거나 취소된 예약입니다)';
  end if;
  return r;
end $$;

-- ============================================================
-- 6. 코멘트 (예약 / 청소 / 정산 공용 쓰레드)
-- ============================================================
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id   uuid not null,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index comments_entity_idx on public.comments(entity_type, entity_id, created_at)
  where deleted_at is null;

create table public.comment_attachments (
  id           uuid primary key default gen_random_uuid(),
  comment_id   uuid not null references public.comments(id) on delete cascade,
  storage_path text not null,
  file_name    text,
  created_at   timestamptz not null default now()
);

-- 정산 쓰레드는 정산 권한자만 접근
create or replace function public.can_see_thread(t public.entity_type)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when t = 'settlement' then public.app_role() in ('owner','settlement')
    else public.is_member()
  end
$$;

-- 코멘트 수정 시 손댈 수 없는 것들을 고정한다.
-- (entity_type 을 갈아끼워 정산 쓰레드 글을 전 멤버에게 노출시키는 경로를 막는다)
create or replace function public.guard_comment_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- service_role 통과
  if new.id         is distinct from old.id
     or new.entity_type is distinct from old.entity_type
     or new.entity_id   is distinct from old.entity_id
     or new.author_id   is distinct from old.author_id
     or new.created_at  is distinct from old.created_at then
    raise exception '코멘트의 대상·작성자·작성시각은 바꿀 수 없습니다';
  end if;
  if new.body is distinct from old.body then
    new.edited_at = now();
  elsif new.edited_at is distinct from old.edited_at then
    -- 본문은 그대로 두고 수정 흔적만 지우는 것을 막는다
    raise exception 'edited_at 은 직접 바꿀 수 없습니다';
  end if;
  return new;
end $$;

create trigger comments_guard
  before update on public.comments
  for each row execute function public.guard_comment_update();

-- 소프트 삭제 전용 RPC.
-- comments_select 정책에 "deleted_at is null" 이 있어서 일반 UPDATE로 deleted_at 을 채우면
-- PostgreSQL이 "결과 행이 SELECT 정책을 통과하지 못한다"며 거부한다. 그래서 함수로 처리한다.
create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if public.app_role() is null then
    raise exception '권한이 없습니다';
  end if;
  update public.comments
     set deleted_at = now()
   where id = p_comment_id
     and deleted_at is null
     and (author_id = auth.uid() or public.is_owner());
  get diagnostics n = row_count;
  if n = 0 then
    raise exception '삭제할 수 없는 코멘트입니다';
  end if;
end $$;

-- ============================================================
-- 7. 정산
-- ============================================================
create table public.settlements (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete restrict,
  period_month date not null,            -- 해당 월 1일
  gross        integer not null default 0,
  platform_fee integer not null default 0,
  other_cost   integer not null default 0,
  net          integer not null default 0,
  status       public.settlement_status not null default 'draft',
  memo         text,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint settlements_uniq unique (property_id, period_month)
);

create table public.settlement_items (
  id             uuid primary key default gen_random_uuid(),
  settlement_id  uuid not null references public.settlements(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  kind           text not null check (kind in ('revenue','fee','other')),
  amount         integer not null,
  memo           text,
  created_at     timestamptz not null default now()
);
create index settlement_items_settlement_idx on public.settlement_items(settlement_id);

-- ============================================================
-- 8. 알림 / 동기화 로그
-- ============================================================
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null,
  title         text not null,
  body          text,
  entity_type   public.entity_type,
  entity_id     uuid,
  read_at       timestamptz,
  sent_email_at timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc) where read_at is null;

-- 사용자는 읽음 처리만 할 수 있다
create or replace function public.guard_notification_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- service_role 통과
  if new.id            is distinct from old.id
     or new.user_id    is distinct from old.user_id
     or new.kind       is distinct from old.kind
     or new.title      is distinct from old.title
     or new.body       is distinct from old.body
     or new.entity_type is distinct from old.entity_type
     or new.entity_id  is distinct from old.entity_id
     or new.created_at is distinct from old.created_at
     or new.sent_email_at is distinct from old.sent_email_at then
    raise exception '알림은 읽음 처리만 할 수 있습니다';
  end if;
  return new;
end $$;

create trigger notifications_guard
  before update on public.notifications
  for each row execute function public.guard_notification_update();

create table public.sync_runs (
  id            bigserial primary key,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        public.sync_status not null default 'running',
  found_count   integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  error_message text,
  constraint sync_runs_error_len check (error_message is null or length(error_message) <= 2000)
);
create index sync_runs_started_idx on public.sync_runs(started_at desc);

-- ============================================================
-- 9. updated_at 자동 갱신
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','properties','reservations','reservation_private',
    'reservation_finance','cleaning_tasks','settlements'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- ============================================================
-- 10. RLS
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.invites             enable row level security;
alter table public.properties          enable row level security;
alter table public.reservations        enable row level security;
alter table public.reservation_private enable row level security;
alter table public.reservation_finance enable row level security;
alter table public.reservation_changes enable row level security;
alter table public.cleaning_tasks      enable row level security;
alter table public.cleaning_photos     enable row level security;
alter table public.comments            enable row level security;
alter table public.comment_attachments enable row level security;
alter table public.settlements         enable row level security;
alter table public.settlement_items    enable row level security;
alter table public.notifications       enable row level security;
alter table public.sync_runs           enable row level security;

-- ---- profiles : 활성 멤버끼리 명단 조회. 본인 프로필 수정(역할·활성상태·이메일은 못 바꿈). owner 전권.
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_member());
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.app_role() and is_active);
create policy profiles_owner_all on public.profiles
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---- invites : owner 전용. 초대 수락은 service_role(서버 라우트)로만 처리한다.
create policy invites_owner on public.invites
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---- properties : 활성 멤버 조회, owner만 변경
create policy properties_select on public.properties
  for select to authenticated using (public.is_member());
create policy properties_owner on public.properties
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---- reservations : 활성 멤버 조회. 수정/추가는 owner/reservation. 삭제는 owner만.
--      (삭제하면 private·finance·changes·cleaning_tasks 까지 cascade 되므로 좁혀둔다)
--      크롤러는 service_role 이라 RLS를 우회한다.
create policy reservations_select on public.reservations
  for select to authenticated using (public.is_member());
create policy reservations_insert on public.reservations
  for insert to authenticated with check (public.app_role() in ('owner','reservation'));
create policy reservations_update on public.reservations
  for update to authenticated
  using (public.app_role() in ('owner','reservation'))
  with check (public.app_role() in ('owner','reservation'));
create policy reservations_delete on public.reservations
  for delete to authenticated using (public.is_owner());

-- ---- 게스트 개인정보 + 크롤 원본
create policy reservation_private_rw on public.reservation_private
  for all to authenticated
  using (public.app_role() in ('owner','reservation'))
  with check (public.app_role() in ('owner','reservation'));

-- ---- 금액
create policy reservation_finance_select on public.reservation_finance
  for select to authenticated
  using (public.app_role() in ('owner','reservation','settlement'));
create policy reservation_finance_write on public.reservation_finance
  for all to authenticated
  using (public.app_role() in ('owner','reservation'))
  with check (public.app_role() in ('owner','reservation'));

create policy reservation_changes_select on public.reservation_changes
  for select to authenticated
  using (public.app_role() in ('owner','reservation'));

-- ---- 청소 : 활성 멤버 조회. 직접 쓰기는 owner/reservation 만.
--      cleaning 담당은 claim_cleaning_task() / set_cleaning_done() RPC 로만 상태를 바꾼다.
create policy cleaning_tasks_select on public.cleaning_tasks
  for select to authenticated using (public.is_member());
create policy cleaning_tasks_manage on public.cleaning_tasks
  for all to authenticated
  using (public.app_role() in ('owner','reservation'))
  with check (public.app_role() in ('owner','reservation'));

create policy cleaning_photos_select on public.cleaning_photos
  for select to authenticated using (public.is_member());
-- 사진은 자기가 맡은 건(또는 미배정 건)에만 붙일 수 있다
create policy cleaning_photos_insert on public.cleaning_photos
  for insert to authenticated
  with check (uploaded_by = auth.uid()
              and public.app_role() in ('owner','reservation','cleaning')
              and exists (select 1 from public.cleaning_tasks t
                           where t.id = cleaning_task_id
                             and t.status <> 'skipped'
                             and (t.assignee_id = auth.uid() or t.assignee_id is null
                                  or public.app_role() in ('owner','reservation'))));
create policy cleaning_photos_delete on public.cleaning_photos
  for delete to authenticated using (uploaded_by = auth.uid() or public.is_owner());

-- ---- 코멘트 : 삭제된 건 안 보이고, 정산 쓰레드는 정산 권한자만
create policy comments_select on public.comments
  for select to authenticated
  using (deleted_at is null and public.can_see_thread(entity_type));
create policy comments_insert on public.comments
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_thread(entity_type));
create policy comments_update_own on public.comments
  for update to authenticated
  using (author_id = auth.uid() and deleted_at is null)
  with check (author_id = auth.uid() and deleted_at is null);
-- 삭제는 public.delete_comment() RPC(소프트 삭제)로. 물리 삭제는 owner만.
create policy comments_delete on public.comments
  for delete to authenticated using (public.is_owner());

-- 첨부 정책은 comments 를 조회해야 하는데, 정책 안의 서브쿼리에도 comments 의 RLS가 걸린다.
-- 그래서 "삭제된 코멘트의 첨부는 작성자·owner 만" 같은 예외를 정책 서브쿼리로는 표현할 수 없다.
-- (comments_select 가 이미 걸러버려서 죽은 조건이 된다) → SECURITY DEFINER 헬퍼로 판정한다.
create or replace function public.can_see_attachment(p_comment_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.comments c
     where c.id = p_comment_id
       and public.can_see_thread(c.entity_type)
       -- 삭제된 코멘트의 첨부는 작성자와 owner 만 (스토리지 파일 정리용)
       and (c.deleted_at is null or c.author_id = auth.uid() or public.is_owner()))
$$;

create or replace function public.can_edit_attachment(p_comment_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.comments c
     where c.id = p_comment_id
       and (c.author_id = auth.uid() or public.is_owner()))
$$;

create policy comment_attachments_select on public.comment_attachments
  for select to authenticated using (public.can_see_attachment(comment_id));
create policy comment_attachments_write on public.comment_attachments
  for all to authenticated
  using (public.can_edit_attachment(comment_id))
  with check (public.can_edit_attachment(comment_id) and public.is_member());

-- ---- 정산
create policy settlements_rw on public.settlements
  for all to authenticated
  using (public.app_role() in ('owner','settlement'))
  with check (public.app_role() in ('owner','settlement'));
create policy settlement_items_rw on public.settlement_items
  for all to authenticated
  using (public.app_role() in ('owner','settlement'))
  with check (public.app_role() in ('owner','settlement'));

-- ---- 알림 : 활성 멤버가 본인 것 조회 + 읽음 처리만. 생성은 service_role.
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid() and public.is_member());
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid() and public.is_member())
  with check (user_id = auth.uid() and public.is_member());

-- ---- 동기화 로그 : owner / reservation 만 (에러 메시지에 내부 URL이 섞일 수 있음). 쓰기는 service_role.
create policy sync_runs_select on public.sync_runs
  for select to authenticated using (public.app_role() in ('owner','reservation'));

-- ============================================================
-- 11. 권한 (GRANT)
-- ============================================================
-- Supabase는 public 스키마에 default privileges 를 미리 걸어두지만, 그것에만 의존하면
-- 다른 롤로 적용됐을 때 "마이그레이션은 성공했는데 앱에서 permission denied" 가 난다.
-- 실제 접근 통제는 위의 RLS가 하고, 여기서는 테이블 접근 자체만 열어준다.
grant usage on schema public to authenticated, anon, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all  on all tables    in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- 앞으로 추가될 테이블에도 같은 권한이 붙도록
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

-- 로그인하지 않은 사용자(anon)는 이 앱에서 할 수 있는 게 없다.
-- Supabase 기본 default privileges 가 anon 에게 붙여둔 권한을 명시적으로 회수한다.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- PostgreSQL 은 새로 만든 함수의 EXECUTE 를 PUBLIC 에 기본으로 붙인다.
-- anon 에서 회수해도 PUBLIC 경유로 실행 가능하므로 PUBLIC 에서도 회수한다.
-- (트리거 함수는 EXECUTE 권한과 무관하게 동작하므로 이 회수는 안전하다)
revoke all on all functions in schema public from public;

-- ※ 주의: `alter default privileges ... revoke execute on functions from public` 는 동작하지 않는다.
--    pg_default_acl 은 내장 기본값과의 차분만 저장하고, 함수 생성 시 내장 기본값(PUBLIC EXECUTE)이
--    다시 병합되기 때문이다. 따라서 앞으로 함수를 추가할 때마다
--    `revoke all on function <이름>(<인자>) from public, anon;` 를 직접 써야 한다. 선택이 아니라 필수.

-- RPC 는 로그인 사용자만
grant execute on function public.claim_cleaning_task(uuid, boolean)     to authenticated, service_role;
grant execute on function public.set_cleaning_done(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.delete_comment(uuid)                   to authenticated, service_role;

-- RLS 정책 안에서 호출되는 헬퍼는 조회 주체(authenticated)에게 EXECUTE 가 있어야 한다.
-- 위에서 PUBLIC 권한을 회수했으므로 여기서 명시적으로 준다. 빠뜨리면 앱 전체가
-- "permission denied for function app_role" 로 죽는다.
grant execute on function public.app_role()                        to authenticated, service_role;
grant execute on function public.is_member()                       to authenticated, service_role;
grant execute on function public.is_owner()                        to authenticated, service_role;
grant execute on function public.can_see_thread(public.entity_type) to authenticated, service_role;
grant execute on function public.can_see_attachment(uuid)          to authenticated, service_role;
grant execute on function public.can_edit_attachment(uuid)         to authenticated, service_role;
