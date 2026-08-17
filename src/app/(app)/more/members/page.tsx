import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { toDisplayId } from '@/lib/auth/identity';
import InviteCreator from '@/components/members/InviteCreator';
import MemberRow from '@/components/members/MemberRow';
import InviteList from '@/components/members/InviteList';

export const metadata = { title: '멤버 관리 · 포남동 예약관리' };

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? '';

  const { data: me } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
  // owner 가 아니면 이 화면 자체를 열 수 없다. RLS 도 막지만 화면에서도 막는다.
  if (me?.role !== 'owner') redirect('/more');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email, role, is_active')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true });

  const { data: invites } = await supabase
    .from('invites')
    .select('id, name, email, role, expires_at, accepted_at, created_at')
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <Link href="/more" className="text-sm text-neutral-500">
          ← 더보기
        </Link>
      </div>
      <h1 className="mb-6 text-xl font-bold">멤버 관리</h1>

      <InviteCreator />

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-500">멤버 {profiles?.length ?? 0}명</h2>
        <ul className="flex flex-col gap-3">
          {(profiles ?? []).map((p) => (
            <li key={p.id}>
              <MemberRow
                member={{
                  id: p.id,
                  name: p.name,
                  loginId: toDisplayId(p.email),
                  role: p.role,
                  isActive: p.is_active,
                }}
                isSelf={p.id === uid}
              />
            </li>
          ))}
        </ul>
      </section>

      <InviteList
        invites={(invites ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          loginId: toDisplayId(i.email),
          role: i.role,
          expiresAt: i.expires_at,
        }))}
      />
    </>
  );
}
