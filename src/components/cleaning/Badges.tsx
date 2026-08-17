import type { CleaningStatus } from './types';

export function StatusBadge({ status }: { status: CleaningStatus }) {
  if (status === 'skipped') {
    return <Badge className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">취소됨</Badge>;
  }
  if (status === 'done') {
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">청소완료</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">청소전</Badge>;
}

/** 같은 숙소에 이 날짜로 입실이 잡혀 있으면 표시한다. 청소 담당에게 가장 중요한 정보다. */
export function TurnoverBadge({ time }: { time: string | null }) {
  return (
    <Badge className="bg-red-600 text-white">
      당일 입실 있음{time ? ` · ${time.slice(0, 5)}까지` : ''}
    </Badge>
  );
}

export function AttentionBadge() {
  return (
    <Badge className="bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300">
      일정 변경됨 확인 필요
    </Badge>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
