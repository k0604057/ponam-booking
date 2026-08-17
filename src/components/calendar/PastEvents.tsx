'use client';

import { useState } from 'react';
import WeekList from './WeekList';
import type { CalendarWeek } from '@/lib/calendar';

/**
 * 지난 예약은 접어둔다. 달력을 열면 오늘부터 보여야 한다.
 * 펼치면 최신순(내림차순) — 과거는 최근 것이 위가 맞다.
 */
export default function PastEvents({
  weeks,
  count,
  today,
}: {
  weeks: CalendarWeek[];
  count: number;
  today: string;
}) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-11 w-full items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-neutral-500"
      >
        <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
        지난 예약 {open ? '접기' : `보기 (${count}건)`}
      </button>

      {open && (
        <div className="mt-2 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <WeekList weeks={weeks} today={today} />
        </div>
      )}
    </div>
  );
}
