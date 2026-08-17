'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidInviteIdentifier, isValidName } from '@/lib/auth/identity';
import CopyBox from './CopyBox';

const ROLES = [
  { value: 'cleaning', label: '청소' },
  { value: 'reservation', label: '예약 관리' },
  { value: 'settlement', label: '정산' },
] as const;

export default function InviteCreator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<string>('cleaning');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ link: string; loginId: string; name: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/invite/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, identifier, role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? '초대를 만들지 못했습니다.');
      return;
    }
    setResult(data);
    setName('');
    setIdentifier('');
    router.refresh();
  }

  if (result) {
    return (
      <section className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
        <h2 className="mb-1 text-sm font-bold">초대 링크가 만들어졌습니다</h2>
        <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">
          이 링크는 <b>지금 한 번만</b> 볼 수 있습니다. 복사해서 카카오톡으로 보내세요.
          잃어버리면 목록에서 재발급하면 됩니다.
        </p>
        <CopyBox
          text={`포남동 예약관리 초대입니다.\n아래 링크를 열어 비밀번호를 정하면 바로 사용할 수 있어요.\n아이디: ${result.loginId}\n${result.link}\n(3일 안에 열어주세요)`}
          preview={result.link}
        />
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setOpen(false);
          }}
          className="mt-3 h-12 w-full rounded-xl border border-neutral-300 text-sm font-semibold dark:border-neutral-700"
        >
          닫기
        </button>
      </section>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 h-[52px] min-h-[52px] w-full rounded-xl bg-neutral-900 text-base font-bold text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        + 멤버 초대하기
      </button>
    );
  }

  const nameOk = isValidName(name);
  const idOk = isValidInviteIdentifier(identifier);

  return (
    <section className="mb-6 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="mb-4 text-sm font-semibold text-neutral-500">멤버 초대</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={20}
            className="h-12 rounded-xl border border-neutral-300 px-4 text-base dark:border-neutral-700"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">아이디</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="cleaner1"
            className="h-12 rounded-xl border border-neutral-300 px-4 text-base dark:border-neutral-700"
          />
          <span className="text-xs text-neutral-500">
            소문자 영문·숫자·밑줄 3~20자. 이메일을 넣어도 됩니다.
          </span>
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">역할</legend>
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`h-11 flex-1 rounded-xl border text-sm font-semibold ${
                  role === r.value
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-neutral-500">호스트는 초대로 만들지 않습니다.</span>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-12 flex-1 rounded-xl border border-neutral-300 text-sm font-semibold dark:border-neutral-700"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy || !nameOk || !idOk}
            className="h-12 flex-1 rounded-xl bg-neutral-900 text-sm font-bold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {busy ? '만드는 중…' : '초대 링크 만들기'}
          </button>
        </div>
      </form>
    </section>
  );
}
