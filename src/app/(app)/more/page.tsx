import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/auth/SignOutButton';

export const metadata = { title: '더보기 · 포남동 예약관리' };

const ROLE_LABEL: Record<string, string> = {
  owner: '호스트',
  reservation: '예약 관리',
  settlement: '정산',
  cleaning: '청소',
};

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, role')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  return (
    <>
      <h1 className="mb-6 text-xl font-bold">더보기</h1>

      <section className="mb-8 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-sm font-semibold text-neutral-500">내 정보</h2>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">이름</dt>
            <dd className="font-medium">{profile?.name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">이메일</dt>
            <dd className="truncate font-medium">{profile?.email || user?.email || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">역할</dt>
            <dd className="font-medium">{profile?.role ? (ROLE_LABEL[profile.role] ?? profile.role) : '—'}</dd>
          </div>
        </dl>
      </section>

      <SignOutButton />
    </>
  );
}
