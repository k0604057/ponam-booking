'use client';

import { useState } from 'react';

/**
 * 복사 버튼을 크게 둔다. "카카오톡으로 보내기" 같은 건 만들지 않는다 —
 * 복사해서 붙여넣는 게 더 확실하다.
 */
export default function CopyBox({ text, preview }: { text: string; preview: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 폰에서 가로 스크롤이 생기지 않게 줄바꿈시킨다 */}
      <p className="rounded-xl bg-white px-3 py-2.5 text-xs break-all text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        {preview}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="h-[52px] min-h-[52px] w-full rounded-xl bg-neutral-900 text-base font-bold text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        {copied ? '복사됨 ✓' : '안내 문구와 함께 복사'}
      </button>
      <textarea
        readOnly
        value={text}
        rows={5}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
      />
    </div>
  );
}
