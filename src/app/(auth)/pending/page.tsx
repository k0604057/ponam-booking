import SignOutButton from '@/components/auth/SignOutButton';

export const metadata = { title: '승인 대기 · 포남동 예약관리' };

/**
 * 비활성 계정은 profiles_select 정책(is_member 기반)에 걸려 자기 행조차 조회되지 않는다.
 * 그 상태를 오류로 처리하면 무한 리다이렉트가 된다. 여기로 보낸다.
 */
export default function PendingPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-amber-100 text-3xl dark:bg-amber-950">
          ⏳
        </div>
        <h1 className="mb-3 text-xl font-bold">승인 대기 중</h1>
        <p className="mb-8 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          가입 요청이 접수됐습니다.
          <br />
          호스트가 승인하면 이용할 수 있습니다.
        </p>
        <SignOutButton />
      </div>
    </main>
  );
}
