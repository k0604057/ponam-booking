import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { addDays, computeDeadline, effectiveDate, groupBySection, seoulToday } from '@/lib/cleaning';
import CleaningCard from '@/components/cleaning/CleaningCard';
import type { CleaningTaskView, Viewer } from '@/components/cleaning/types';

export const metadata = { title: '청소 · 포남동 예약관리' };

const PAST_DAYS = 14;
const FUTURE_DAYS = 30;

export default async function CleaningPage({ searchParams }: PageProps<'/cleaning'>) {
  const showSkipped = (await searchParams).skipped === '1';

  const supabase = await createClient();
  const today = seoulToday();
  const from = addDays(today, -PAST_DAYS);
  const to = addDays(today, FUTURE_DAYS);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').maybeSingle();
  const viewer: Viewer = { id: user?.id ?? null, isOwner: me?.role === 'owner' };

  // 금액·게스트 정보는 애초에 select 하지 않는다. RLS 로도 막혀 있지만 화면 코드에서도 안 가져온다.
  // 담당자가 예정일을 잡으면 조회 범위 밖으로 나갈 수 있으므로 scheduled_date 로 넉넉히 받고
  // 그룹핑은 coalesce(planned_date, scheduled_date) 로 한다.
  let query = supabase
    .from('cleaning_tasks')
    .select(
      `id, scheduled_date, planned_date, status, needs_attention, note, completed_at, assignee_id,
       properties!cleaning_tasks_property_id_fkey ( id, name, color ),
       reservations!cleaning_tasks_source_reservation_id_fkey ( public_note ),
       assignee:profiles!cleaning_tasks_assignee_id_fkey ( name ),
       completer:profiles!cleaning_tasks_completed_by_fkey ( name )`
    )
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .order('scheduled_date', { ascending: true });

  if (!showSkipped) query = query.neq('status', 'skipped');

  const { data: rows, error } = await query;

  if (error) {
    return (
      <>
        <Header showSkipped={showSkipped} />
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          청소 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </>
    );
  }

  // 마감일 계산에 쓸 입실일. 퇴실일 이후의 입실만 필요하므로 from 부터 받으면 충분하다.
  const { data: checkins } = await supabase
    .from('reservations')
    .select('property_id, checkin_date')
    .neq('status', 'cancelled')
    .gte('checkin_date', from);

  const checkinsByProperty = new Map<string, string[]>();
  for (const r of checkins ?? []) {
    const list = checkinsByProperty.get(r.property_id);
    if (list) list.push(r.checkin_date);
    else checkinsByProperty.set(r.property_id, [r.checkin_date]);
  }

  const tasks: CleaningTaskView[] = (rows ?? []).map((r) => {
    const propertyId = r.properties?.id ?? '';
    const { nextCheckinDate, deadline, slackDays } = computeDeadline(
      r.scheduled_date,
      checkinsByProperty.get(propertyId) ?? []
    );
    return {
      id: r.id,
      scheduledDate: r.scheduled_date,
      plannedDate: r.planned_date,
      effectiveDate: effectiveDate(r.scheduled_date, r.planned_date),
      nextCheckinDate,
      deadline,
      slackDays,
      status: r.status,
      needsAttention: r.needs_attention,
      note: r.note,
      completedAt: r.completed_at,
      assigneeId: r.assignee_id,
      assigneeName: r.assignee?.name ?? null,
      completerName: r.completer?.name ?? null,
      propertyName: r.properties?.name ?? '숙소',
      propertyColor: r.properties?.color ?? '#3b82f6',
      publicNote: r.reservations?.public_note ?? null,
      isMine: !!user && r.assignee_id === user.id,
    };
  });

  const sections = groupBySection(tasks, today);

  return (
    <>
      <Header showSkipped={showSkipped} />

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">예정된 청소가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.key}>
              <h2
                className={`mb-2.5 flex items-center gap-2 text-sm font-bold ${
                  section.key === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-neutral-500'
                }`}
              >
                {section.label}
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  {section.tasks.length}
                </span>
              </h2>
              <ul className="flex flex-col gap-3">
                {section.tasks.map((task) => (
                  <li key={task.id}>
                    <CleaningCard task={task} viewer={viewer} overdue={section.key === 'overdue'} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Header({ showSkipped }: { showSkipped: boolean }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h1 className="text-xl font-bold">청소</h1>
      <Link
        href={showSkipped ? '/cleaning' : '/cleaning?skipped=1'}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
      >
        {showSkipped ? '취소된 건 숨기기' : '취소된 건 보기'}
      </Link>
    </div>
  );
}
