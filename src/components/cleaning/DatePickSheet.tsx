'use client';

import { useState } from 'react';
import { addDays, daysBetween, formatShortDate } from '@/lib/cleaning';
import type { CleaningTaskView } from './types';

/**
 * 청소 예정일 선택.
 * 캘린더 위젯보다 날짜 버튼을 늘어놓는 게 빠르다 — 선택지가 대개 3~4개다.
 * 마감일 이후는 '다른 날짜' 로만 고를 수 있게 해서 실수를 줄인다.
 */
export default function DatePickSheet({
  task,
  onPick,
  onClose,
  busy,
}: {
  task: CleaningTaskView;
  onPick: (date: string | null) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [custom, setCustom] = useState(false);
  const [customDate, setCustomDate] = useState(task.plannedDate ?? task.scheduledDate);

  // 퇴실일 ~ 마감일. 당일 턴오버면 하루뿐이다.
  const span = Math.max(0, daysBetween(task.scheduledDate, task.deadline));
  const options = Array.from({ length: span + 1 }, (_, i) => addDays(task.scheduledDate, i));

  const hint = (date: string, i: number) => {
    if (i === 0) return '퇴실 당일';
    if (i === 1) return '퇴실 다음날';
    if (date === task.deadline) return task.nextCheckinDate ? '입실 당일 — 그 전에 끝내야 함' : '마감일';
    return `퇴실 +${i}일`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-5 dark:bg-neutral-950"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold">언제 청소하시겠어요?</h2>
        <p className="mt-1 mb-4 text-sm text-neutral-500">
          {formatShortDate(task.scheduledDate)} 퇴실 ·{' '}
          {task.nextCheckinDate
            ? `${formatShortDate(task.nextCheckinDate)} 입실 전까지`
            : `${formatShortDate(task.deadline)}까지 권장`}
        </p>

        {!custom && (
          <ul className="flex flex-col gap-2">
            {options.map((date, i) => (
              <li key={date}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(date)}
                  className={`flex h-14 w-full items-center justify-between rounded-xl border px-4 text-left disabled:opacity-60 ${
                    date === task.plannedDate
                      ? 'border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900'
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  <span className="text-base font-semibold">{formatShortDate(date)}</span>
                  <span className="text-xs text-neutral-500">{hint(date, i)}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                disabled={busy}
                onClick={() => setCustom(true)}
                className="h-13 min-h-[52px] w-full rounded-xl border border-dashed border-neutral-300 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
              >
                다른 날짜…
              </button>
            </li>
          </ul>
        )}

        {custom && (
          <div className="flex flex-col gap-3">
            <input
              type="date"
              value={customDate}
              min={task.scheduledDate}
              max={addDays(task.scheduledDate, 30)}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-13 min-h-[52px] w-full rounded-xl border border-neutral-300 px-4 text-base dark:border-neutral-700"
            />
            {customDate > task.deadline && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                마감일({formatShortDate(task.deadline)})을 넘습니다. 저장은 되지만 카드에 경고가 표시됩니다.
              </p>
            )}
            <button
              type="button"
              disabled={busy || !customDate}
              onClick={() => onPick(customDate)}
              className="h-13 min-h-[52px] w-full rounded-xl bg-neutral-900 text-base font-bold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
            >
              이 날짜로 정하기
            </button>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onPick(null)}
            className="h-12 flex-1 rounded-xl border border-neutral-300 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
          >
            {task.plannedDate ? '예정일 지우기' : '나중에 정하기'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-xl text-sm font-semibold text-neutral-500"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
