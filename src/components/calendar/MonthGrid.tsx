'use client';

import { useState } from 'react';
import { monthGridDates, type CalendarEvent } from '@/lib/calendar';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/**
 * 태블릿 이상에서만 쓰는 월 그리드.
 * 숙소가 하나뿐이라 지금은 단순하지만, 늘어날 것을 가정해 색으로 구분한다.
 */
export default function MonthGrid({ events, today }: { events: CalendarEvent[]; today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const dates = monthGridDates(`${month}-01`);

  const byDate = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex size-10 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700"
          aria-label="이전 달"
        >
          ‹
        </button>
        <h2 className="text-base font-bold">
          {Number(month.slice(0, 4))}년 {Number(month.slice(5, 7))}월
        </h2>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex size-10 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-neutral-50 py-2 text-center text-xs font-semibold text-neutral-500 dark:bg-neutral-900">
            {w}
          </div>
        ))}
        {dates.map((date) => {
          const dayEvents = byDate.get(date) ?? [];
          const inMonth = date.slice(0, 7) === month;
          const isToday = date === today;
          return (
            <div
              key={date}
              className={`min-h-24 bg-white p-1.5 dark:bg-neutral-950 ${inMonth ? '' : 'opacity-40'}`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                  isToday ? 'bg-emerald-600 text-white' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {Number(date.slice(8, 10))}
              </span>
              <ul className="mt-1 flex flex-col gap-0.5">
                {dayEvents.map((e) => (
                  <li key={e.key} className="flex items-center gap-1">
                    {e.kind === 'cleaning' ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="청소" />
                    ) : (
                      <span
                        className="h-1.5 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: e.propertyColor }}
                        title={e.kind === 'checkin' ? '입실' : '퇴실'}
                      />
                    )}
                    <span className="truncate text-[10px] text-neutral-600 dark:text-neutral-400">
                      {e.kind === 'checkin' ? '입실' : e.kind === 'checkout' ? '퇴실' : '청소'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-neutral-500">막대 = 입·퇴실(숙소 색), 점 = 청소</p>
    </div>
  );
}
