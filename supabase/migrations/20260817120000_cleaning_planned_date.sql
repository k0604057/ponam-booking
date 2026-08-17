-- 20260817120000_cleaning_planned_date.sql
-- 담당자가 정하는 실제 청소 예정일. 성격: 추가형

alter table public.cleaning_tasks add column planned_date date;

comment on column public.cleaning_tasks.planned_date is
  '담당자가 정한 실제 청소 예정일. scheduled_date(퇴실일)는 크롤러·트리거가 관리하므로 건드리지 않는다. '
  'null 이면 아직 안 정한 것 — 화면에서는 coalesce(planned_date, scheduled_date) 를 쓴다.';

create index cleaning_tasks_planned_idx
  on public.cleaning_tasks(coalesce(planned_date, scheduled_date), status);

-- 청소 예정일 지정 / 해제
create or replace function public.set_cleaning_planned_date(p_task_id uuid, p_date date)
returns public.cleaning_tasks
language plpgsql security definer set search_path = public as $$
declare r public.cleaning_tasks;
begin
  if public.app_role() is null or public.app_role() = 'settlement' then
    raise exception '권한이 없습니다';
  end if;

  update public.cleaning_tasks
     set planned_date = p_date,
         updated_at   = now()
   where id = p_task_id
     and status = 'pending'
     -- 퇴실일 이전이나 한 달 뒤로는 못 잡는다
     and (p_date is null
          or (p_date >= scheduled_date and p_date <= scheduled_date + 30))
     and (assignee_id = auth.uid()
          or assignee_id is null
          or public.app_role() in ('owner','reservation'))
  returning * into r;

  if r.id is null then
    raise exception '청소 예정일을 정할 수 없습니다 (담당자가 아니거나, 이미 완료됐거나, 날짜가 범위를 벗어났습니다)';
  end if;
  return r;
end $$;

revoke all on function public.set_cleaning_planned_date(uuid, date) from public, anon;
grant execute on function public.set_cleaning_planned_date(uuid, date) to authenticated, service_role;
