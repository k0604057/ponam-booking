import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { toDisplayId } from '@/lib/auth/identity';
import InviteCreator from '@/components/members/InviteCreator';
import MemberRow from '@/components/members/MemberRow';
import InviteList from '@/components/members/InviteList';
import { getViewer } from '@/lib/auth/viewer';
import { perf, perfStart } from '@/lib/perf';

// Supabase 가 ap-northeast-2(서울)에 있다. 함수도 같은 리전에 둔다.
export const preferredRegion = 'icn1';

export const metadata = { title: '멤버 관리 · 포남동 예약관리' };

export default async function MembersPage() {
  const totalDone = perfStart('members:total');

  const supabase = await createClient();
  // 미들웨어가 이미 검증한 역할. owner 가 아니면 이 화면 자체를 열 수 없다.
  // RLS 도 막지만 화면에서도 막는다.
  const viewer = await getViewer();
  if (!viewer.isOwner) redirect('/more');
  const uid = viewer.id ?? '';

  // 서로 의존하지 않으므로 병렬로.
  const [{ data: profiles }, { data: invites }] = await perf('members:queries', async () =>
    Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, role, is_active')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('invites')
        .select('id, name, email, role, expires_at, accepted_at, created_at')
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ])
  );

  totalDone();

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
