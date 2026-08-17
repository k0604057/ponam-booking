import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatShortDate, seoulToday } from '@/lib/cleaning';

export const metadata = { title: '예약 · 포남동 예약관리' };

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'upcoming', label: '예정' },
  { key: 'staying', label: '거주중' },
  { key: 'done', label: '종료' },
  { key: 'cancelled', label: '취소' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default async function ReservationsPage({ searchParams }: PageProps<'/reservations'>) {
  const raw = (await searchParams).filter;
  const filter: FilterKey = FILTERS.some((f) => f.key === raw) ? (raw as FilterKey) : 'all';

  const supabase = await createClient();
  const today = seoulToday();

  const { data: rows, error } = await supabase
    .from('reservations')
    .select(
      `id, external_id, status, checkin_date, checkout_date, nights,
       properties!reservations_property_id_fkey ( name, color ),
       reservation_private ( guest_name ),
       reservation_finance ( gross_amount, net_amount )`
    )
    .order('checkin_date', { ascending: false });

  if (error) {
    return (
      <>
        <h1 className="mb-5 text-xl font-bold">예약</h1>
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          예약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </>
    );
  }

  const filtered = (rows ?? []).filter((r) => {
    switch (filter) {
      case 'upcoming':
        return r.status !== 'cancelled' && r.checkin_date > today;
      case 'staying':
        return r.status !== 'cancelled' && r.checkin_date <= today && today <= r.checkout_date;
      case 'done':
        return r.status === 'completed' || (r.status !== 'cancelled' && r.checkout_date < today);
      case 'cancelled':
        return r.status === 'cancelled';
      default:
        return true;
    }
  });

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">예약</h1>

      {/* 필터는 가로 스크롤로. 폰에서 줄바꿈되면 지저분하다. */}
      <div className="-mx-4 mb-5 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {FILTERS.map((f) => (
            <li key={f.key}>
              <Link
                href={f.key === 'all' ? '/reservations' : `/reservations?filter=${f.key}`}
                className={`inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium ${
                  filter === f.key
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                    : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
                }`}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">해당하는 예약이 없습니다.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => {
            const staying = r.status !== 'cancelled' && r.checkin_date <= today && today <= r.checkout_date;
            // reservation_finance 는 owner/reservation/settlement 만 조회된다.
            // 안 보이는 역할에는 아예 오지 않으므로 그 줄을 생략한다.
            const finance = r.reservation_finance;
            const guestName = r.reservation_private?.guest_name ?? null;

            return (
              <li key={r.id}>
                <Link
                  href={`/reservations/${r.id}`}
                  className="block rounded-2xl border border-neutral-200 px-4 py-3.5 dark:border-neutral-800"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold">
                      {formatShortDate(r.checkin_date)} ~ {formatShortDate(r.checkout_date)}
                    </span>
                    <span className="text-xs text-neutral-500">{r.nights}박</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.properties?.color ?? '#3b82f6' }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-600 dark:text-neutral-400">
                      {r.properties?.name ?? '숙소'}
                    </span>
                    <StatusChip status={r.status} staying={staying} />
                  </div>

                  {guestName && <p className="mt-2 text-sm text-neutral-500">{guestName}</p>}

                  {finance && (
                    <p className="mt-1 text-sm text-neutral-500">
                      이용 {finance.gross_amount.toLocaleString()}원 · 정산 {finance.net_amount.toLocaleString()}원
                    </p>
                  )}

                  <p className="mt-1 text-xs text-neutral-400">계약 {r.external_id}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function StatusChip({ status, staying }: { status: string; staying: boolean }) {
  if (status === 'cancelled') {
    return <Chip className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">취소</Chip>;
  }
  if (staying) {
    return <Chip className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">거주중</Chip>;
  }
  if (status === 'completed') {
    return <Chip className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">종료</Chip>;
  }
  return <Chip className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">예정</Chip>;
}

function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>
  );
}
