// 청소 실적 집계.
//
// 기준 날짜는 completed_at 이다. scheduled_date(퇴실일)나 planned_date(계획일)로 세면
// 뒤늦게 완료 처리한 건이 엉뚱한 달에 잡힌다.
//
// 시간대는 Asia/Seoul 로 변환해서 센다. UTC 로 세면 월말 밤에 완료한 건이 다음 달로 넘어간다.
// (예: 2026-08-31 23:00 KST = 2026-08-31 14:00 UTC 는 같은 달이지만,
//      2026-09-01 01:00 KST = 2026-08-31 16:00 UTC 는 UTC 로 세면 8월로 잘못 잡힌다)

const MONTH_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** ISO timestamp → 서울 기준 'YYYY-MM' */
export function seoulMonth(iso: string): string {
  return MONTH_FMT.format(new Date(iso)).slice(0, 7);
}

/** 'YYYY-MM' 에서 n개월 뒤(음수면 이전) */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** 최신 월이 먼저 오는 최근 n개월 */
export function recentMonths(current: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(current, -i));
}

/** '2026-08' → '2026년 8월' */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
}

export type DoneTask = { completedAt: string | null; completedBy: string | null };

/** 월별 건수. 건수 0인 달은 넣지 않는다. */
export function countByMonth(
  tasks: readonly DoneTask[],
  months: readonly string[]
): Array<{ month: string; count: number }> {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.completedAt) continue;
    const key = seoulMonth(t.completedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return months
    .map((month) => ({ month, count: counts.get(month) ?? 0 }))
    .filter((row) => row.count > 0);
}

/** completed_by 별 건수 (해당 월). 많은 순. */
export function countByMember(
  tasks: readonly DoneTask[],
  month: string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.completedAt || !t.completedBy) continue;
    if (seoulMonth(t.completedAt) !== month) continue;
    counts.set(t.completedBy, (counts.get(t.completedBy) ?? 0) + 1);
  }
  return counts;
}
