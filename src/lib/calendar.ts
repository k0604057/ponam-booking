// 달력 화면의 날짜 계산. 화면과 분리해 테스트할 수 있게 순수 함수로 둔다.

import { addDays, weekdayIndex } from './cleaning';

/** 그 주의 월요일 */
export function startOfWeek(date: string): string {
  const wd = weekdayIndex(date); // 0=일
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

/** '8월 3주 (8/17 – 8/23)' */
export function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const [, m, d] = monday.split('-').map(Number);
  const [, m2, d2] = sunday.split('-').map(Number);
  // 그 달의 몇 번째 주인지 — 월요일 날짜 기준
  const nth = Math.floor((d - 1) / 7) + 1;
  return `${m}월 ${nth}주 (${m}/${d} – ${m2}/${d2})`;
}

export type CalendarEventKind = 'checkin' | 'checkout' | 'cleaning';

export type CalendarEvent = {
  key: string;
  date: string;
  kind: CalendarEventKind;
  propertyName: string;
  propertyColor: string;
  /** 게스트 이름. cleaning 역할에게는 null 로 온다(reservation_private 이 안 보임). */
  guestName: string | null;
  reservationId: string | null;
  cleaningTaskId: string | null;
  /** 청소 줄에만: '예정 8/23 · 미완료' 같은 보조 문구 */
  detail: string | null;
};

/** 이벤트를 주 단위로 묶는다. 빈 주는 만들지 않는다. */
export function groupByWeek(
  events: readonly CalendarEvent[]
): Array<{ monday: string; label: string; events: CalendarEvent[] }> {
  const weeks = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const monday = startOfWeek(e.date);
    const list = weeks.get(monday);
    if (list) list.push(e);
    else weeks.set(monday, [e]);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monday, list]) => ({
      monday,
      label: weekLabel(monday),
      events: list.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind)),
    }));
}

/** 월 그리드용 — 그 달 1일이 속한 주의 월요일부터 6주치 날짜 */
export function monthGridDates(anyDateInMonth: string): string[] {
  const [y, m] = anyDateInMonth.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
