import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashInviteToken } from '@/lib/auth/invite-token';
import { toDisplayId } from '@/lib/auth/identity';
import AcceptForm from '@/components/invite/AcceptForm';

export const metadata = { title: '초대 · 포남동 예약관리' };

const ROLE_LABEL: Record<string, string> = {
  owner: '호스트',
  reservation: '예약 관리',
  settlement: '정산',
  cleaning: '청소',
};

// 로그인 없이 열려야 한다. 미들웨어 matcher 에서 /invite 를 제외해 뒀다.
export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params;

  const { data: invite } = await supabaseAdmin
    .from('invites')
    .select('email, name, role')
    .eq('token_hash', hashInviteToken(token))
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">포남동 예약관리</h1>

        {!invite ? (
          // 만료·사용됨·존재하지 않음을 구분해서 알려주지 않는다.
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            만료되었거나 이미 사용된 초대입니다. 호스트에게 다시 요청하세요.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-neutral-500">비밀번호만 정하면 바로 사용할 수 있어요.</p>

            <dl className="mb-6 flex flex-col gap-2.5 rounded-2xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">이름</dt>
                <dd className="font-medium">{invite.name || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">아이디</dt>
                <dd className="font-medium">{toDisplayId(invite.email)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">역할</dt>
                <dd className="font-medium">{ROLE_LABEL[invite.role] ?? invite.role}</dd>
              </div>
            </dl>

            <AcceptForm token={token} />
          </>
        )}
      </div>
    </main>
  );
}
