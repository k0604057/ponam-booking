'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PASSWORD_MIN } from '@/lib/auth/identity';

export default function AcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < PASSWORD_MIN;
  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < PASSWORD_MIN || password !== confirm) return;

    setBusy(true);
    setError(null);

    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data: { email?: string; error?: string } = await res.json().catch(() => ({}));

    if (!res.ok || !data.email) {
      setError(data.error ?? '처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
      setBusy(false);
      return;
    }

    // 방금 정한 비밀번호로 바로 로그인시킨다. 다시 로그인하게 만들지 않는다.
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: data.email,
      password,
    });
    if (signInError) {
      setError('계정이 만들어졌습니다. 로그인 화면에서 방금 정한 비밀번호로 들어가주세요.');
      setBusy(false);
      return;
    }

    // 홈(/calendar) 판단은 미들웨어가 한다.
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="h-12 rounded-xl border border-neutral-300 px-4 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
        />
        <span className="text-xs text-neutral-500">{PASSWORD_MIN}자 이상</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">비밀번호 확인</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="h-12 rounded-xl border border-neutral-300 px-4 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
        />
      </label>

      {tooShort && <p className="text-sm text-neutral-500">{PASSWORD_MIN}자 이상 입력해주세요.</p>}
      {mismatch && <p className="text-sm text-red-600 dark:text-red-400">두 비밀번호가 다릅니다.</p>}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || password.length < PASSWORD_MIN || password !== confirm}
        className="mt-2 h-[52px] min-h-[52px] rounded-xl bg-neutral-900 text-base font-semibold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {busy ? '설정 중…' : '비밀번호 정하고 시작하기'}
      </button>
    </form>
  );
}
