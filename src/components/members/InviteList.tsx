'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RoleBadge from './RoleBadge';
import CopyBox from './CopyBox';

export type PendingInvite = {
  id: string;
  name: string;
  loginId: string;
  role: string;
  expiresAt: string;
};

function remaining(expiresAt: string): { text: string; expired: boolean } {
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return { text: '만료됨', expired: true };
  const hours = Math.floor(ms / 3600_000);
  if (hours >= 24) return { text: `${Math.floor(hours / 24)}일 ${hours % 24}시간 남음`, expired: false };
  return { text: `${hours}시간 남음`, expired: false };
}

export default function InviteList({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reissued, setReissued] = useState<{ link: string; loginId: string } | null>(null);

  async function cancel(id: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().from('invites').delete().eq('id', id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  /** 재발급 = 기존 초대 취소 + 새 토큰 생성. 원문 토큰은 다시 볼 수 없기 때문이다. */
  async function reissue(invite: PendingInvite) {
    setBusy(true);
    setError(null);

    const { error: delErr } = await createClient().from('invites').delete().eq('id', invite.id);
    if (delErr) {
      setBusy(false);
      setError(delErr.message);
      return;
    }

    const res = await fetch('/api/invite/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: invite.name, identifier: invite.loginId, role: invite.role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? '재발급하지 못했습니다.');
      router.refresh();
      return;
    }
    setReissued({ link: data.link, loginId: data.loginId });
    router.refresh();
  }

  if (invites.length === 0 && !reissued) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-neutral-500">대기 중인 초대</h2>

      {reissued && (
        <div className="mb-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="mb-3 text-xs font-semibold">새 링크입니다. 지금 한 번만 보입니다.</p>
          <CopyBox
            text={`포남동 예약관리 초대입니다.\n아래 링크를 열어 비밀번호를 정하면 바로 사용할 수 있어요.\n아이디: ${reissued.loginId}\n${reissued.link}\n(3일 안에 열어주세요)`}
            preview={reissued.link}
          />
          <button
            type="button"
            onClick={() => setReissued(null)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-300 text-sm font-semibold dark:border-neutral-700"
          >
            닫기
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {invites.map((invite) => {
          const left = remaining(invite.expiresAt);
          return (
            <li
              key={invite.id}
              className={`rounded-2xl border border-neutral-200 px-4 py-3.5 dark:border-neutral-800 ${
                left.expired ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold">{invite.name}</span>
                <RoleBadge role={invite.role} />
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {invite.loginId} · {left.text}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void reissue(invite)}
                  className="h-11 flex-1 rounded-xl border border-neutral-300 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
                >
                  재발급
                </button>
                {/* 만료된 초대는 재발급만 가능하다 */}
                {!left.expired && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancel(invite.id)}
                    className="h-11 flex-1 rounded-xl border border-red-300 text-sm font-semibold text-red-700 disabled:opacity-60 dark:border-red-800 dark:text-red-300"
                  >
                    취소
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
