import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/auth/SignOutButton';
import NameEditor from '@/components/members/NameEditor';
import { toDisplayId } from '@/lib/auth/identity';
import { getViewer } from '@/lib/auth/viewer';
import { perf, perfStart } from '@/lib/perf';
import { seoulToday } from '@/lib/cleaning';
import { countByMember, countByMonth, formatMonth, recentMonths, shiftMonth } from '@/lib/stats';

export const metadata = { title: '더보기 · 포남동 예약관리' };
export const preferredRegion = 'icn1';

const ROLE_LABEL: Record<string, string> = {
  owner: '호스트',
  reservation: '예약 관리',
  settlement: '정산',
  cleaning: '청소',
};

const MONTHS_SHOWN = 12;

export default async function MorePage() {
  const totalDone = perfStart('more:total');

  const supabase = await createClient();
  // 미들웨어가 이미 검증했다. 역할은 헤더에서 오므로 getUser() 왕복이 필요 없다.
  const viewer = await getViewer();
  const uid = viewer.id ?? '';

  // 서로 의존하지 않는 두 쿼리를 병렬로. 집계는 JS 에서 한다 —
  // 1년치가 몇백 건 수준이라 RPC 나 뷰를 만들 필요가 없다.
  const [{ data: profile }, { data: doneTasks }] = await perf('more:queries', async () =>
    Promise.all([
      supabase.from('profiles').select('name, email').eq('id', uid).maybeSingle(),
      supabase
        .from('cleaning_tasks')
        .select('completed_at, completed_by, completer:profiles!cleaning_tasks_completed_by_fkey ( name, email )')
        .eq('status', 'done')
        .not('completed_at', 'is', null),
    ])
  );

  const tasks = (doneTasks ?? []).map((t) => ({
    completedAt: t.completed_at,
    completedBy: t.completed_by,
    // 이름 편집이 생겼지만 어떤 이유로든 이름이 비면 '(이름 없음)' 보다 아이디가 낫다.
    completerName: t.completer?.name?.trim() || toDisplayId(t.completer?.email) || null,
  }));

  // seoulToday() 가 이미 서울 기준 YYYY-MM-DD 다.
  const thisMonth = seoulToday().slice(0, 7);
  const lastMonth = shiftMonth(thisMonth, -1);

  const mine = tasks.filter((t) => t.completedBy === uid);
  const myMonthly = countByMonth(mine, recentMonths(thisMonth, MONTHS_SHOWN));
  const myThisMonth = myMonthly.find((m) => m.month === thisMonth)?.count ?? 0;

  // 멤버별 순위는 owner·reservation 에게만 보여준다.
  // RLS 상 조회는 되지만 화면에 순위를 띄우지는 않는다.
  const showMembers = viewer.role === 'owner' || viewer.role === 'reservation';
  const thisByMember = countByMember(tasks, thisMonth);
  const lastByMember = countByMember(tasks, lastMonth);
  const nameOf = new Map<string, string>();
  for (const t of tasks) if (t.completedBy && t.completerName) nameOf.set(t.completedBy, t.completerName);

  const members = [...new Set([...thisByMember.keys(), ...lastByMember.keys()])]
    .map((id) => ({
      id,
      name: nameOf.get(id) ?? '(이름 없음)',
      thisMonth: thisByMember.get(id) ?? 0,
      lastMonth: lastByMember.get(id) ?? 0,
    }))
    .sort((a, b) => b.thisMonth - a.thisMonth || b.lastMonth - a.lastMonth);

  totalDone();

  return (
    <>
      <h1 className="mb-6 text-xl font-bold">더보기</h1>

      <section className="mb-6 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-sm font-semibold text-neutral-500">내 정보</h2>
        <dl className="flex flex-col gap-3 text-sm">
          <NameEditor userId={uid} initialName={profile?.name ?? ''} />
          {/* 내부 이메일(<아이디>@ponam.local)을 그대로 보여주면 혼란만 준다 */}
          <Row label="아이디" value={toDisplayId(profile?.email)} truncate />
          <Row label="역할" value={viewer.role ? (ROLE_LABEL[viewer.role] ?? viewer.role) : '—'} />
        </dl>
      </section>

      {viewer.isOwner && (
        <Link
          href="/more/members"
          className="mb-6 flex h-[52px] min-h-[52px] w-full items-center justify-between rounded-xl border border-neutral-300 px-4 text-base font-semibold dark:border-neutral-700"
        >
          멤버 관리
          <span className="text-neutral-400">›</span>
        </Link>
      )}

      <section className="mb-6 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-1 text-sm font-semibold text-neutral-500">내 청소 건수</h2>
        <p className="mb-4 text-sm font-medium">
          이번 달 {myThisMonth}건 · 누적 {mine.length}건
        </p>
        {myMonthly.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 완료한 청소가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2.5 text-sm">
            {myMonthly.map((m) => (
              <li key={m.month} className="flex justify-between gap-4">
                <span className="text-neutral-500">{formatMonth(m.month)}</span>
                <span className="font-semibold tabular-nums">{m.count}건</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showMembers && (
        <section className="mb-6 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-1 text-sm font-semibold text-neutral-500">멤버별 청소 건수</h2>
          <p className="mb-4 text-xs text-neutral-400">{formatMonth(thisMonth)} 기준 · 괄호는 지난달</p>
          {members.length === 0 ? (
            <p className="text-sm text-neutral-400">최근 두 달 동안 완료된 청소가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm">
              {members.map((m) => (
                <li key={m.id} className="flex justify-between gap-4">
                  <span className="min-w-0 truncate text-neutral-600 dark:text-neutral-400">{m.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {m.thisMonth}건 <span className="font-normal text-neutral-400">({m.lastMonth}건)</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <SignOutButton />
    </>
  );
}

function Row({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className={`font-medium ${truncate ? 'truncate' : ''}`}>{value}</dd>
    </div>
  );
}
