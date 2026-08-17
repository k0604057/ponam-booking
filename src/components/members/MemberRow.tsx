'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/db';
import { generateTempPassword, isValidName } from '@/lib/auth/identity';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
import RoleBadge, { ROLE_LABEL } from './RoleBadge';
import CopyBox from './CopyBox';

export type Member = {
  id: string;
  name: string;
  loginId: string;
  role: string;
  isActive: boolean;
};

const ASSIGNABLE = ['owner', 'reservation', 'settlement', 'cleaning'] as const;

export default function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(member.name);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // owner 자신의 역할 변경·해지는 막는다. DB 트리거도 막지만 눌러보고 에러를 보게 할 이유가 없다.
  const locked = isSelf && member.role === 'owner';

  async function update(patch: ProfileUpdate) {
    setBusy(true);
    setError(null);
    // 역할·활성 상태 변경은 RLS(profiles_owner_all)가 허용한다. 별도 라우트가 필요 없다.
    const { error: err } = await createClient().from('profiles').update(patch).eq('id', member.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function resetPassword() {
    const password = generateTempPassword();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/members/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: member.id, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? '비밀번호를 바꾸지 못했습니다.');
      return;
    }
    setTempPassword(password);
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        member.isActive ? 'border-neutral-200 dark:border-neutral-800' : 'border-neutral-200 opacity-60 dark:border-neutral-800'
      }`}
    >
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold">{member.name || member.loginId}</span>
          <RoleBadge role={member.role} />
          {!member.isActive && (
            <span className="shrink-0 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
              해지됨
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">{member.loginId}</p>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">이름</span>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700"
              />
              <button
                type="button"
                disabled={busy || !isValidName(name) || name.trim() === member.name}
                onClick={() => void update({ name: name.trim() })}
                className="h-11 shrink-0 rounded-xl border border-neutral-300 px-4 text-sm font-semibold disabled:opacity-40 dark:border-neutral-700"
              >
                저장
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">역할</span>
            <div className="flex flex-wrap gap-2">
              {ASSIGNABLE.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={busy || locked || r === member.role}
                  onClick={() => void update({ role: r })}
                  className={`h-11 rounded-xl border px-3.5 text-sm font-semibold disabled:opacity-40 ${
                    r === member.role
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            {locked && <span className="text-xs text-neutral-500">본인(호스트)의 역할은 바꿀 수 없습니다.</span>}
          </div>

          {tempPassword ? (
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
              <p className="mb-2 text-xs font-semibold">
                새 임시 비밀번호입니다. 지금 한 번만 보입니다.
              </p>
              <CopyBox text={tempPassword} preview={tempPassword} />
              <button
                type="button"
                onClick={() => setTempPassword(null)}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-300 text-sm font-semibold dark:border-neutral-700"
              >
                확인했습니다
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void resetPassword()}
              className="h-12 w-full rounded-xl border border-neutral-300 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
            >
              비밀번호 재설정
            </button>
          )}

          {member.isActive ? (
            confirmingDeactivate ? (
              <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-950/40">
                <p className="text-sm text-red-700 dark:text-red-300">
                  해지하면 즉시 모든 화면이 막힙니다. 기록은 남습니다.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDeactivate(false)}
                    className="h-11 flex-1 rounded-xl border border-neutral-300 text-sm font-semibold dark:border-neutral-700"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (await update({ is_active: false })) setConfirmingDeactivate(false);
                    }}
                    className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-60"
                  >
                    해지
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || locked}
                onClick={() => setConfirmingDeactivate(true)}
                className="h-12 w-full rounded-xl border border-red-300 text-sm font-semibold text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-300"
              >
                해지
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void update({ is_active: true })}
              className="h-12 w-full rounded-xl border border-neutral-300 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
            >
              복구
            </button>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
