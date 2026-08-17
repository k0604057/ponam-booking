-- 20260816090100_storage.sql  (= migration_02 : Storage 버킷 + 정책)
-- 성격: 추가형
--
-- init 마이그레이션과 분리한 이유:
--   storage.objects 에 정책을 만들려면 그 테이블의 소유자 롤(보통 supabase_storage_admin)의
--   멤버여야 한다. 권한이 없으면 "must be owner of table objects" 로 실패하는데,
--   같은 파일 안에 있으면 스키마 마이그레이션 전체가 중간에서 멈춰버린다.
--
-- 적용 전 확인 (SQL 에디터):
--   select rolname from pg_roles
--    where pg_has_role(current_user, oid, 'member') and rolname like 'supabase%';
--   → supabase_storage_admin 이 안 보이면 이 파일 대신 Supabase 대시보드
--     Storage → Policies 화면에서 같은 내용을 수동으로 만든다.
--
-- 버킷을 셋으로 나눈 이유: storage 정책은 comment_attachments 테이블의 RLS를 알지 못한다.
-- 정산 첨부를 일반 버킷에 두면 청소 담당이 파일 목록·다운로드로 우회할 수 있다.

insert into storage.buckets (id, name, public)
values ('cleaning-photos',  'cleaning-photos',  false),   -- 청소 사진      : 활성 멤버 전원
       ('comment-files',    'comment-files',    false),   -- 일반 코멘트 첨부: 활성 멤버 전원
       ('settlement-files', 'settlement-files', false)    -- 정산 첨부      : owner / settlement
on conflict (id) do nothing;

-- 버킷 목록 조회 (클라이언트 listBuckets 용)
create policy storage_buckets_read on storage.buckets
  for select to authenticated using (public.is_member());

-- 파일을 다른 버킷으로 옮기는 것을 막는다.
-- RLS 정책만으로는 못 막는다: permissive 정책은 USING 끼리 OR, WITH CHECK 끼리 OR 로 합쳐지므로
-- "USING 은 A버킷 정책이, WITH CHECK 는 B버킷 정책이" 통과하면 이동이 성립한다.
-- 실제로 정산 첨부를 comment-files 로 옮겨 청소 담당에게 노출시키는 경로가 열린다.
create or replace function public.guard_storage_bucket_move()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.bucket_id is distinct from old.bucket_id then
    raise exception '파일을 다른 버킷으로 옮길 수 없습니다';
  end if;
  return new;
end $$;

create trigger storage_objects_guard_bucket
  before update on storage.objects
  for each row execute function public.guard_storage_bucket_move();

revoke all on function public.guard_storage_bucket_move() from public, anon;

-- ---- 청소 사진 -----------------------------------------------------------
create policy storage_cleaning_photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'cleaning-photos' and public.is_member());
create policy storage_cleaning_photos_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cleaning-photos' and public.is_member() and owner = auth.uid());
-- 같은 경로 재업로드(upsert)·move·copy 에 UPDATE 가 필요하다
-- WITH CHECK 에도 버킷·멤버 조건을 명시한다. 안 그러면 자기 파일을 다른 버킷으로 옮길 수 있다.
create policy storage_cleaning_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'cleaning-photos' and owner = auth.uid() and public.is_member())
  with check (bucket_id = 'cleaning-photos' and owner = auth.uid() and public.is_member());
create policy storage_cleaning_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'cleaning-photos' and (owner = auth.uid() or public.is_owner()));

-- ---- 일반 코멘트 첨부 ----------------------------------------------------
create policy storage_comment_files_read on storage.objects
  for select to authenticated
  using (bucket_id = 'comment-files' and public.is_member());
create policy storage_comment_files_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comment-files' and public.is_member() and owner = auth.uid());
create policy storage_comment_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'comment-files' and owner = auth.uid() and public.is_member())
  with check (bucket_id = 'comment-files' and owner = auth.uid() and public.is_member());
create policy storage_comment_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'comment-files' and (owner = auth.uid() or public.is_owner()));

-- ---- 정산 첨부 : owner / settlement 만 -----------------------------------
create policy storage_settlement_files_read on storage.objects
  for select to authenticated
  using (bucket_id = 'settlement-files' and public.app_role() in ('owner','settlement'));
create policy storage_settlement_files_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'settlement-files'
              and public.app_role() in ('owner','settlement') and owner = auth.uid());
create policy storage_settlement_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'settlement-files' and owner = auth.uid()
         and public.app_role() in ('owner','settlement'))
  with check (bucket_id = 'settlement-files' and owner = auth.uid()
         and public.app_role() in ('owner','settlement'));
create policy storage_settlement_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'settlement-files' and (owner = auth.uid() or public.is_owner()));
