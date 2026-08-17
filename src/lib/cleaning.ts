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

/** 다음 예약이 없을 때 기본으로 주는 여유 (퇴실일 + N일) */
export const DEFAULT_SLACK_DAYS = 3;

export type Deadline = {
  /** 같은 숙소의 다음 입실일. 없으면 null */
  nextCheckinDate: string | null;
  /** 이 날까지 끝내야 한다 */
  deadline: string;
  /** 마감일 - 퇴실일 */
  slackDays: number;
  /** 퇴실 당일에 입실이 잡혀 있다 */
  sameDayTurnover: boolean;
};

/**
 * 청소 마감일과 여유 일수.
 *   다음 입실이 있으면 → 그날까지 (그날 입실 전에 끝내야 한다)
 *   없으면            → 퇴실일 + DEFAULT_SLACK_DAYS
 */
export function computeDeadline(
  checkoutDate: string,
  nextCheckins: readonly string[]
): Deadline {
  const next = nextCheckins
    .filter((d) => d >= checkoutDate)
    .sort()[0] ?? null;
  const deadline = next ?? addDays(checkoutDate, DEFAULT_SLACK_DAYS);
  return {
    nextCheckinDate: next,
    deadline,
    slackDays: daysBetween(checkoutDate, deadline),
    sameDayTurnover: next === checkoutDate,
  };
}

/** b - a (일수) */
export function daysBetween(a: string, b: string): number {
  const toUTC = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

/** 담당자가 정한 날이 있으면 그것, 없으면 퇴실일. 화면의 모든 정렬·그룹핑 기준. */
export function effectiveDate(scheduledDate: string, plannedDate: string | null): string {
  return plannedDate ?? scheduledDate;
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
 *
 * 기준 날짜는 `coalesce(planned_date, scheduled_date)` 다 —
 * 담당자가 8/23에 가기로 했으면 8/23 섹션에 있어야 한다.
 *
 * 단 **마감일이 지났는데 미완료**면 예정일과 무관하게 밀린 청소로 본다.
 * (예정일을 자꾸 미루면 카드가 미래 섹션으로 도망가는 걸 막는다)
 */
export function sectionOf(
  date: string,
  status: string,
  today: string,
  deadline?: string
): SectionKey {
  if (status === 'pending' && deadline && deadline < today) return 'overdue';
  if (date < today) return status === 'pending' ? 'overdue' : 'past';
  if (date === today) return 'today';
  if (date === addDays(today, 1)) return 'tomorrow';
  if (date <= endOfWeek(today)) return 'thisWeek';
  return 'later';
}

type Groupable = { effectiveDate: string; status: string; deadline?: string };

export function groupBySection<T extends Groupable>(
  tasks: readonly T[],
  today: string
): Array<{ key: SectionKey; label: string; tasks: T[] }> {
  const buckets = new Map<SectionKey, T[]>();
  for (const task of tasks) {
    const key = sectionOf(task.effectiveDate, task.status, today, task.deadline);
    const list = buckets.get(key);
    if (list) list.push(task);
    else buckets.set(key, [task]);
  }
  // 비어 있는 섹션은 통째로 숨긴다.
  return SECTION_ORDER.filter((k) => buckets.get(k)?.length).map((k) => ({
    key: k,
    label: SECTION_LABEL[k],
    tasks: buckets.get(k)!.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
  }));
}
