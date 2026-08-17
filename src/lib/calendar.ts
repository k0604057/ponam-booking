// 달력 화면의 날짜 계산. 화면과 분리해 테스트할 수 있게 순수 함수로 둔다.

import { addDays, weekdayIndex } from './cleaning';

/** 그 주의 월요일. 한국은 월요일 시작이 자연스럽다. */
export function startOfWeek(date: string): string {
  const wd = weekdayIndex(date); // 0=일
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

/** 월 그리드용 — 그 달 1일이 속한 주의 월요일부터 6주(42칸) 치 날짜 */
export function monthGridDates(anyDateInMonth: string): string[] {
  const [y, m] = anyDateInMonth.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  return Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(first), i));
}
