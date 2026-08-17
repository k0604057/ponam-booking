'use client';

import { useEffect } from 'react';

/**
 * 화면을 막지 않는 알림. 확인 버튼을 누르게 하면 손이 한 번 더 간다.
 * 2초쯤 뒤 스스로 사라진다.
 */
export default function Toast({
  message,
  onDone,
  duration = 2000,
}: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const id = setTimeout(onDone, duration);
    return () => clearTimeout(id);
  }, [onDone, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      // 하단 탭(z-50) 위에, 탭보다 조금 높은 위치에 띄운다.
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
    >
      <span className="rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
        {message}
      </span>
    </div>
  );
}
