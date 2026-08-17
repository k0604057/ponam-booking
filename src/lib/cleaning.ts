// 청소 보드의 날짜 계산과 그룹핑. 화면과 분리해 테스트할 수 있게 순수 함수로 둔다.
//
// 날짜는 전부 'YYYY-MM-DD' 문자열로 다룬다. Date 로 바꿔 비교하면 서버 타임존에 따라
// 하루가 밀린다 — 서버가 UTC 여도 사용자는 서울에 있다.

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 서울 기준 오늘 (YYYY-MM-DD) */
export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 'YYYY-MM-DD' 에 일수를 더한다. 타임존 영향을 받지 않게 UTC 로만 계산한다. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** 0=일 … 6=토 */
export function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** '2026-08-23' → '8/23 (토)' */
export function formatShortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d} (${WEEKDAY[weekdayIndex(date)]})`;
}

/** 이번 주의 마지막 날(일요일). 월요일 시작 기준. */
export function endOfWeek(date: string): string {
  const wd = weekdayIndex(date);
  const toSunday = wd === 0 ? 0 : 7 - wd;
  return addDays(date, toSunday);
}

export type SectionKey = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'past';

export const SECTION_ORDER: readonly SectionKey[] = [
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
  'past',
];

export const SECTION_LABEL: Record<SectionKey, string> = {
  overdue: '밀린 청소',
  today: '오늘',
  tomorrow: '내일',
  thisWeek: '이번 주',
  later: '다음 주 이후',
  past: '지난 청소',
};

/**
 * 스펙의 5개 섹션 + 'past'.
 * 조회 범위가 오늘-14일부터라 '지난 날짜인데 pending 이 아닌' 건이 반드시 생긴다.
 * 밀린 청소(빨간 강조)에 섞으면 안 되므로 맨 뒤에 따로 둔다.
 */
export function sectionOf(
  scheduledDate: string,
  status: string,
  today: string
): SectionKey {
  if (scheduledDate < today) return status === 'pending' ? 'overdue' : 'past';
  if (scheduledDate === today) return 'today';
  if (scheduledDate === addDays(today, 1)) return 'tomorrow';
  if (scheduledDate <= endOfWeek(today)) return 'thisWeek';
  return 'later';
}

export function groupBySection<T extends { scheduled_date: string; status: string }>(
  tasks: readonly T[],
  today: string
): Array<{ key: SectionKey; label: string; tasks: T[] }> {
  const buckets = new Map<SectionKey, T[]>();
  for (const task of tasks) {
    const key = sectionOf(task.scheduled_date, task.status, today);
    const list = buckets.get(key);
    if (list) list.push(task);
    else buckets.set(key, [task]);
  }
  // 비어 있는 섹션은 통째로 숨긴다.
  return SECTION_ORDER.filter((k) => buckets.get(k)?.length).map((k) => ({
    key: k,
    label: SECTION_LABEL[k],
    tasks: buckets.get(k)!,
  }));
}
