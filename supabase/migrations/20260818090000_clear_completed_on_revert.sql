-- set_cleaning_done: 완료 취소 시 completed_at·completed_by 를 비운다.
-- 기존 동작은 최초 완료자를 영구 보존해서, 완료 → 취소 → 다른 사람이 완료 시
-- 실제 수행자가 집계에 잡히지 않았다. 덮어쓰기 방지는 아래 where 절의
-- "status <> 'done' or assignee_id = auth.uid() or completed_by = auth.uid()" 가 이미 한다.

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
         completed_at = case when p_done then coalesce(completed_at, now()) else null end,
         completed_by = case when p_done then coalesce(completed_by, auth.uid()) else null end,
         needs_attention = case when p_done then needs_attention else true end,
         updated_at   = now()
   where id = p_task_id
     and status <> 'skipped'
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

-- 기존에 어긋난 행 정리: pending 인데 완료 기록이 남아 있는 건
update public.cleaning_tasks
   set completed_at = null, completed_by = null, updated_at = now()
 where status = 'pending' and (completed_at is not null or completed_by is not null);
