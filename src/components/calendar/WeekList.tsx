import Link from 'next/link';
import { formatShortDate } from '@/lib/cleaning';
import type { CalendarEvent, CalendarWeek } from '@/lib/calendar';

const KIND_LABEL = { checkin: '입실', checkout: '퇴실', cleaning: '청소' } as const;

const KIND_STYLE = {
  checkin: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  checkout: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  cleaning: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
} as const;

/**
 * 주 단위 목록.
 * 진입 시 스크롤을 오늘로 옮기지 않는다 — 오늘이 이미 맨 위이고,
 * 스크롤 점프는 그 자체로 느리게 느껴진다. (그래서 클라이언트 컴포넌트일 필요도 없다)
 */
export default function WeekList({ weeks, today }: { weeks: CalendarWeek[]; today: string }) {
  return (
    <div className="flex flex-col gap-6">
      {weeks.map((week) => (
        <section key={week.monday}>
          <h2 className="mb-2 border-b border-neutral-200 pb-1.5 text-sm font-bold text-neutral-500 dark:border-neutral-800">
            {week.label}
            {isThisWeek(week.monday, today) && (
              <span className="ml-2 text-xs font-semibold text-emerald-600">이번 주</span>
            )}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {week.events.map((e) => (
              <li key={e.key}>
                <Row event={e} isToday={e.date === today} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function isThisWeek(monday: string, today: string): boolean {
  const [y, m, d] = monday.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10);
  return monday <= today && today <= end;
}

function Row({ event, isToday }: { event: CalendarEvent; isToday: boolean }) {
  const inner = (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${
        isToday ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
      }`}
    >
      <span className="w-16 shrink-0 text-sm font-semibold tabular-nums">{formatShortDate(event.date)}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLE[event.kind]}`}>
        {KIND_LABEL[event.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: event.propertyColor }} />
          <span className="truncate text-sm">{event.propertyName}</span>
        </span>
        {/* 게스트 이름이 없으면(cleaning 역할) 이 줄 자체를 그리지 않는다 */}
        {event.guestName && <span className="block text-xs text-neutral-500">{event.guestName}</span>}
        {event.detail && <span className="block text-xs text-neutral-500">{event.detail}</span>}
      </span>
    </div>
  );

  return (
    <Link href={event.kind === 'cleaning' ? '/cleaning' : `/reservations/${event.reservationId}`} className="block">
      {inner}
    </Link>
  );
}
