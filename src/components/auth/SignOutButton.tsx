'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        'h-[52px] min-h-[52px] w-full rounded-xl border border-neutral-300 text-base font-semibold disabled:opacity-60 dark:border-neutral-700'
      }
    >
      {busy ? '로그아웃 중…' : '로그아웃'}
    </button>
  );
}
