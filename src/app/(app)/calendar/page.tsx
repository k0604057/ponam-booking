import { createClient } from '@/lib/supabase/server';
import { seoulToday } from '@/lib/cleaning';
import { shiftMonth } from '@/lib/stats';
import { reservationVisualStatus } from '@/lib/status';
import { perf, perfStart } from '@/lib/perf';
import MonthCalendar from '@/components/calendar/MonthCalendar';
import type { CalReservation, CalTask } from '@/components/calendar/types';

export const metadata = { title: '달력 · 포남동 예약관리' };
export const preferredRegion = 'icn1';

/** 'YYYY-MM' → 그 달의 마지막 날 */
function endOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export default async function CalendarPage({ searchParams }: PageProps<'/calendar'>) {
  const totalDone = perfStart('calendar:total');

  const today = seoulToday();
  const requested = (await searchParams).m;
  const month = typeof requested === 'string' && /^\d{4}-\d{2}$/.test(requested) ? requested : today.slice(0, 7);

  // 표시 중인 달의 앞뒤 1개월까지 한 번에 받아둔다.
  // 달을 넘길 때마다 서버를 치면 느리다.
  const from = `${shiftMonth(month, -1)}-01`;
  const to = endOfMonth(shiftMonth(month, 1));

  const supabase = await createClient();

  // 서로 의존하지 않으므로 병렬로.
  // 예약은 기간이 겹치는 것을 전부 잡는다 — checkin_date 만으로 거르면
  // '이미 입실해서 지금 거주중' 인 예약이 사라진다.
  const [{ data: reservationRows, error }, { data: taskRows }] = await perf('calendar:queries', async () =>
    Promise.all([
      supabase
        .from('reservations')
        .select(
          `id, checkin_date, checkout_date, status,
           properties!reservations_property_id_fkey ( name, color ),
           reservation_private ( guest_name )`
        )
        .gte('checkout_date', from)
        .lte('checkin_date', to)
        .order('checkin_date', { ascending: true }),
      supabase
        .from('cleaning_tasks')
        .select(
          `id, scheduled_date, planned_date, status, needs_attention,
           properties!cleaning_tasks_property_id_fkey ( name, color ),
           assignee:profiles!cleaning_tasks_assignee_id_fkey ( name )`
        )
        .neq('status', 'skipped')
        .gte('scheduled_date', from)
        .lte('scheduled_date', to),
    ])
  );

  if (error) {
    totalDone();
    return (
      <>
        <h1 className="mb-5 text-xl font-bold">달력</h1>
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          예약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </>
    );
  }

  const reservations: CalReservation[] = (reservationRows ?? []).map((r) => ({
    id: r.id,
    checkinDate: r.checkin_date,
    checkoutDate: r.checkout_date,
    visual: reservationVisualStatus(r.status, r.checkin_date, r.checkout_date, today),
    propertyName: r.properties?.name ?? '숙소',
    propertyColor: r.properties?.color ?? '#3b82f6',
    // reservation_private 은 owner/reservation 만 조회된다. 그 외 역할에는 안 온다.
    guestName: r.reservation_private?.guest_name ?? null,
  }));

  const tasks: CalTask[] = (taskRows ?? []).map((t) => ({
    id: t.id,
    date: t.planned_date ?? t.scheduled_date,
    scheduledDate: t.scheduled_date,
    plannedDate: t.planned_date,
    status: t.status,
    needsAttention: t.needs_attention,
    propertyName: t.properties?.name ?? '숙소',
    propertyColor: t.properties?.color ?? '#3b82f6',
    assigneeName: t.assignee?.name ?? null,
  }));

  totalDone();

  return (
    <>
      <h1 className="mb-5 text-xl font-bold">달력</h1>

      {/* 거주중 예약은 월 그리드의 오늘 칸에 초록 막대로 이미 보인다.
          고정 카드를 두면 같은 정보를 두 번 보여주고 그리드가 아래로 밀린다. */}
      <MonthCalendar
        month={month}
        loadedFrom={from}
        loadedTo={to}
        today={today}
        reservations={reservations}
        tasks={tasks}
      />
    </>
  );
}
