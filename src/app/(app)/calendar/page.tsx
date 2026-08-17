import { createClient } from '@/lib/supabase/server';
import { addDays, daysBetween, formatShortDate, seoulToday } from '@/lib/cleaning';
import { groupByWeek, type CalendarEvent } from '@/lib/calendar';
import WeekList from '@/components/calendar/WeekList';
import MonthGrid from '@/components/calendar/MonthGrid';
import StayingCard from '@/components/calendar/StayingCard';

export const metadata = { title: '달력 · 포남동 예약관리' };

const PAST_DAYS = 30;
const FUTURE_DAYS = 90;

export default async function CalendarPage() {
  const supabase = await createClient();
  const today = seoulToday();
  const from = addDays(today, -PAST_DAYS);
  const to = addDays(today, FUTURE_DAYS);

  // 기간이 겹치는 예약을 전부 잡는다.
  // checkin_date 만으로 거르면 '이미 입실해서 지금 거주중' 인 예약이 사라진다.
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(
      `id, checkin_date, checkout_date, status,
       properties!reservations_property_id_fkey ( name, color ),
       reservation_private ( guest_name )`
    )
    .neq('status', 'cancelled')
    .gte('checkout_date', from)
    .lte('checkin_date', to)
    .order('checkin_date', { ascending: true });

  if (error) {
    return (
      <>
        <h1 className="mb-5 text-xl font-bold">달력</h1>
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          예약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </>
    );
  }

  const { data: tasks } = await supabase
    .from('cleaning_tasks')
    .select(
      `id, scheduled_date, planned_date, status,
       properties!cleaning_tasks_property_id_fkey ( name, color ),
       assignee:profiles!cleaning_tasks_assignee_id_fkey ( name )`
    )
    .neq('status', 'skipped')
    .gte('scheduled_date', from)
    .lte('scheduled_date', to);

  const events: CalendarEvent[] = [];

  for (const r of reservations ?? []) {
    // reservation_private 은 owner/reservation 만 조회된다. 그 외 역할에는 빈 배열로 온다.
    const guestName = r.reservation_private?.guest_name ?? null;
    const base = {
      propertyName: r.properties?.name ?? '숙소',
      propertyColor: r.properties?.color ?? '#3b82f6',
      guestName,
      reservationId: r.id,
      cleaningTaskId: null,
      detail: null,
    };
    if (r.checkin_date >= from && r.checkin_date <= to) {
      events.push({ ...base, key: `in-${r.id}`, date: r.checkin_date, kind: 'checkin' });
    }
    if (r.checkout_date >= from && r.checkout_date <= to) {
      events.push({ ...base, key: `out-${r.id}`, date: r.checkout_date, kind: 'checkout' });
    }
  }

  for (const t of tasks ?? []) {
    const when = t.planned_date ?? t.scheduled_date;
    const planned = t.planned_date ? `예정 ${formatShortDate(t.planned_date)}` : '예정일 미정';
    const done = t.status === 'done' ? '완료' : '미완료';
    events.push({
      key: `clean-${t.id}`,
      date: when,
      kind: 'cleaning',
      propertyName: t.properties?.name ?? '숙소',
      propertyColor: t.properties?.color ?? '#3b82f6',
      guestName: null,
      reservationId: null,
      cleaningTaskId: t.id,
      detail: `${planned} · ${done}${t.assignee?.name ? ` · ${t.assignee.name}` : ''}`,
    });
  }

  const weeks = groupByWeek(events);

  const staying = (reservations ?? [])
    .filter((r) => r.checkin_date <= today && today <= r.checkout_date)
    .map((r) => ({
      id: r.id,
      checkinDate: r.checkin_date,
      checkoutDate: r.checkout_date,
      guestName: r.reservation_private?.guest_name ?? null,
      propertyName: r.properties?.name ?? '숙소',
      propertyColor: r.properties?.color ?? '#3b82f6',
      daysLeft: daysBetween(today, r.checkout_date),
    }));

  return (
    <>
      <h1 className="mb-5 text-xl font-bold">달력</h1>

      {staying.map((s) => (
        <StayingCard key={s.id} stay={s} />
      ))}

      {weeks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">이 기간에 예약이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 폰은 목록형이 기본 */}
          <div className="md:hidden">
            <WeekList weeks={weeks} today={today} />
          </div>
          {/* 태블릿 이상은 월 그리드 */}
          <div className="hidden md:block">
            <MonthGrid events={events} today={today} />
          </div>
        </>
      )}
    </>
  );
}
