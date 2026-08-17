'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Supabase 가 돌려주는 영어 메시지를 그대로 노출하지 않는다.
 * 청소 담당자가 읽는 화면이다.
 */
function toKorean(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않습니다.';
  if (m.includes('email not confirmed')) return '이메일 인증이 아직 끝나지 않았습니다. 호스트에게 문의하세요.';
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return '시도가 너무 잦습니다. 잠시 후 다시 해주세요.';
  }
  if (m.includes('network') || m.includes('fetch')) return '네트워크 연결을 확인해주세요.';
  return '로그인하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(toKorean(signInError.message));
      setBusy(false);
      return;
    }

    // 미들웨어가 활성 여부를 보고 /cleaning 또는 /pending 으로 보낸다.
    router.replace(next && next.startsWith('/') ? next : '/cleaning');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">이메일</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className="h-12 rounded-xl border border-neutral-300 px-4 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="h-12 rounded-xl border border-neutral-300 px-4 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 h-[52px] min-h-[52px] rounded-xl bg-neutral-900 text-base font-semibold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {busy ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
