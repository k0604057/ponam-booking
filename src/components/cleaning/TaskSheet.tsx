'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatShortDate } from '@/lib/cleaning';
import { AttentionBadge, StatusBadge, TurnoverBadge } from './Badges';
import PhotoSection from './PhotoSection';
import type { CleaningTaskView } from './types';

const NOTE_MAX = 2000; // RPC 가 2000자를 넘기면 거부한다

export default function TaskSheet({ task, onClose }: { task: CleaningTaskView; onClose: () => void }) {
  const router = useRouter();

  // 낙관적 업데이트용 로컬 상태. 실패하면 되돌린다.
  const [status, setStatus] = useState(task.status);
  const [isMine, setIsMine] = useState(task.isMine);
  const [assigneeName, setAssigneeName] = useState(task.assigneeName);
  const [note, setNote] = useState(task.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unassigned = !assigneeName && !isMine;
  const canUploadPhoto = status !== 'skipped' && (isMine || unassigned);

  async function claim(next: boolean) {
    const prevMine = isMine;
    const prevName = assigneeName;
    setIsMine(next);
    setAssigneeName(next ? '나' : null);
    setError(null);
    setBusy(true);

    const { error: rpcError } = await createClient().rpc('claim_cleaning_task', {
      p_task_id: task.id,
      p_claim: next,
    });

    setBusy(false);
    if (rpcError) {
      setIsMine(prevMine);
      setAssigneeName(prevName);
      // RPC 의 예외 메시지는 사람이 읽으라고 한국어로 써뒀다. 그대로 노출해도 된다.
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  async function setDone(next: boolean) {
    if (note.length > NOTE_MAX) return;

    const prev = status;
    setStatus(next ? 'done' : 'pending');
    setError(null);
    setBusy(true);

    const { error: rpcError } = await createClient().rpc('set_cleaning_done', {
      p_task_id: task.id,
      p_done: next,
      // 완료 취소 시에는 메모를 건드리지 않는다.
      ...(next ? { p_note: note.trim() || undefined } : {}),
    });

    setBusy(false);
    if (rpcError) {
      setStatus(prev);
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-neutral-950">
      {/* 헤더 */}
      <div className="flex items-start gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.propertyColor }} />
            <h2 className="truncate text-base font-bold">{task.propertyName}</h2>
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">{formatShortDate(task.scheduledDate)} 퇴실</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-neutral-500"
        >
          ×
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-40">
        <div className="mb-5 flex flex-wrap gap-2">
          <StatusBadge status={status} />
          {task.sameDayCheckin && <TurnoverBadge time={task.sameDayCheckinTime} />}
          {task.needsAttention && <AttentionBadge />}
        </div>

        <dl className="mb-6 flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">담당</dt>
            <dd className="font-medium">{isMine ? '나' : (assigneeName ?? '미배정')}</dd>
          </div>
          {status === 'done' && (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">완료</dt>
              <dd className="font-medium">
                {task.completerName ?? '—'}
                {task.completedAt ? ` · ${formatTime(task.completedAt)}` : ''}
              </dd>
            </div>
          )}
        </dl>

        {task.publicNote && (
          <section className="mb-6">
            <h3 className="mb-1.5 text-sm font-semibold text-neutral-500">예약 메모</h3>
            <p className="rounded-xl bg-neutral-50 px-3.5 py-3 text-sm whitespace-pre-wrap dark:bg-neutral-900">
              {task.publicNote}
            </p>
          </section>
        )}

        {status !== 'skipped' && (
          <section className="mb-6">
            <label className="mb-1.5 block text-sm font-semibold text-neutral-500" htmlFor={`note-${task.id}`}>
              청소 메모
            </label>
            <textarea
              id={`note-${task.id}`}
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={3}
              placeholder="예: 수건 부족"
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
            />
            <p className="mt-1 text-right text-xs text-neutral-400">
              {NOTE_MAX - note.length}자 남음
            </p>
          </section>
        )}

        {status !== 'skipped' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void claim(!isMine)}
            className="mb-6 h-12 w-full rounded-xl border border-neutral-300 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
          >
            {isMine ? '맡은 청소 놓기' : '내가 맡기'}
          </button>
        )}

        <PhotoSection taskId={task.id} canUpload={canUploadPhoto} />

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </div>

      {/* 하단 고정 액션 */}
      {status !== 'skipped' && (
        <div
          className="border-t border-neutral-200 bg-white px-4 pt-3 dark:border-neutral-800 dark:bg-neutral-950"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {status === 'done' && (
            <p className="mb-2 text-center text-xs text-neutral-500">완료를 취소하면 관리자에게 표시됩니다.</p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void setDone(status !== 'done')}
            className={`h-[52px] min-h-[52px] w-full rounded-xl text-base font-bold disabled:opacity-60 ${
              status === 'done'
                ? 'border border-neutral-300 dark:border-neutral-700'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {busy ? '처리 중…' : status === 'done' ? '완료 취소' : '청소완료'}
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
