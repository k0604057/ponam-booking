'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isValidName, NAME_MAX } from '@/lib/auth/identity';

/**
 * 본인 이름 편집.
 * profiles_update_self 정책이 이미 허용한다 — 역할·활성상태·이메일만 못 바꾼다.
 */
export default function NameEditor({ userId, initialName }: { userId: string; initialName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const { error: err } = await createClient()
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', userId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex justify-between gap-4">
        <dt className="shrink-0 text-neutral-500">이름</dt>
        <dd className="flex items-center gap-2">
          <span className="font-medium">{initialName || '—'}</span>
          <button
            type="button"
            onClick={() => {
              setName(initialName);
              setEditing(true);
            }}
            className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
          >
            수정
          </button>
        </dd>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-neutral-500">이름</span>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          autoFocus
          className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700"
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-11 shrink-0 rounded-xl border border-neutral-300 px-3 text-sm font-semibold dark:border-neutral-700"
        >
          취소
        </button>
        <button
          type="button"
          disabled={busy || !isValidName(name)}
          onClick={() => void save()}
          className="h-11 shrink-0 rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          저장
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
