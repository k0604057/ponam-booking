'use client';

import { useCallback, useState } from 'react';
import { formatShortDate } from '@/lib/cleaning';
import { AttentionBadge, OverdueDeadlineBadge, StatusBadge, TurnoverBadge } from './Badges';
import SlackLine from './SlackLine';
import TaskSheet from './TaskSheet';
import Toast from '@/components/shell/Toast';
import type { CleaningTaskView, Viewer } from './types';

export type { CleaningTaskView };

export default function CleaningCard({
  task,
  viewer,
  overdue,
}: {
  task: CleaningTaskView;
  viewer: Viewer;
  overdue: boolean;
}) {
  // 시트는 전체 화면을 덮으므로 카드마다 상태를 따로 둬도 동시에 열리지 않는다.
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const deadlineExceeded = task.plannedDate !== null && task.plannedDate > task.deadline;

  // 완료하면 시트를 닫고 목록으로 돌아간다. 알림은 화면을 막지 않는 토스트로.
  const onCompleted = useCallback((message: string) => {
    setOpen(false);
    setToast(message);
  }, []);

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
        <SlackLine task={task} />

        <div className="mt-2 flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.propertyColor }} />
          <span className="min-w-0 flex-1 truncate text-sm text-neutral-600 dark:text-neutral-400">
            {task.propertyName}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusBadge status={task.status} />
          {task.slackDays <= 0 && <TurnoverBadge />}
          {task.needsAttention && <AttentionBadge />}
          {deadlineExceeded && <OverdueDeadlineBadge />}
        </div>

        <p className="mt-2.5 text-sm text-neutral-500">
          담당 {task.isMine ? '나' : (task.assigneeName ?? '미지정')}
          {task.status === 'done' && task.completerName ? ` · 완료 ${task.completerName}` : ''}
        </p>

        {task.status === 'pending' && (
          <p className="mt-1 text-sm text-neutral-500">
            청소 예정일{' '}
            {task.plannedDate ? (
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {formatShortDate(task.plannedDate)}
              </span>
            ) : (
              '미정'
            )}
          </p>
        )}

        {task.publicNote && (
          <p className="mt-2 line-clamp-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
            {task.publicNote}
          </p>
        )}
        {task.note && <p className="mt-2 line-clamp-2 text-sm text-neutral-500">메모 · {task.note}</p>}
      </button>

      {open && (
        <TaskSheet task={task} viewer={viewer} onClose={() => setOpen(false)} onCompleted={onCompleted} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
