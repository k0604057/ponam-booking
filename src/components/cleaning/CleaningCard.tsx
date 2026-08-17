'use client';

import { useState } from 'react';
import { formatShortDate } from '@/lib/cleaning';
import { AttentionBadge, StatusBadge, TurnoverBadge } from './Badges';
import TaskSheet from './TaskSheet';
import type { CleaningTaskView } from './types';

export type { CleaningTaskView };

export default function CleaningCard({ task, overdue }: { task: CleaningTaskView; overdue: boolean }) {
  // 시트는 전체 화면을 덮으므로 카드마다 상태를 따로 둬도 동시에 열리지 않는다.
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-2xl border px-4 py-3.5 text-left ${
          overdue
            ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
            : 'border-neutral-200 dark:border-neutral-800'
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold">{formatShortDate(task.scheduledDate)}</span>
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.propertyColor }} />
          <span className="min-w-0 flex-1 truncate text-sm text-neutral-600 dark:text-neutral-400">
            {task.propertyName}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <StatusBadge status={task.status} />
          {task.sameDayCheckin && <TurnoverBadge time={task.sameDayCheckinTime} />}
          {task.needsAttention && <AttentionBadge />}
        </div>

        <p className="mt-2.5 text-sm text-neutral-500">
          담당 {task.isMine ? '나' : (task.assigneeName ?? '미배정')}
          {task.status === 'done' && task.completerName ? ` · 완료 ${task.completerName}` : ''}
        </p>

        {task.publicNote && (
          <p className="mt-2 line-clamp-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
            {task.publicNote}
          </p>
        )}
        {task.note && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-500">메모 · {task.note}</p>
        )}
      </button>

      {open && <TaskSheet task={task} onClose={() => setOpen(false)} />}
    </>
  );
}
