import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatShortDate, seoulToday } from '@/lib/cleaning';
import { perf, perfStart } from '@/lib/perf';
import { DIM_CLASS, statusStyle } from '@/lib/status';

// Supabase 가 ap-northeast-2(서울)에 있다. 함수도 같은 리전에 둔다.
export const preferredRegion = 'icn1';

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

  const totalDone = perfStart('reservations:total');

  const { data: rows, error } = await perf('reservations:query', async () => supabase
    .from('reservations')
    .select(
      `id, external_id, status, checkin_date, checkout_date, nights,
       properties!reservations_property_id_fkey ( name, color ),
       reservation_private ( guest_name ),
       reservation_finance ( gross_amount, net_amount )`
    )
    .order('checkin_date', { ascending: false })
  );

  if (error) {
    totalDone();
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

  totalDone();

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
            // reservation_finance 는 owner/reservation/settlement 만 조회된다.
            // 안 보이는 역할에는 아예 오지 않으므로 그 줄을 생략한다.
            const finance = r.reservation_finance;
            const guestName = r.reservation_private?.guest_name ?? null;

            // 달력 막대와 **같은 상수**를 쓴다. 세 군데서 따로 정의하면 반드시 어긋난다.
            const style = statusStyle(r.status, r.checkin_date, r.checkout_date, today);

            return (
              <li key={r.id}>
                <Link
                  href={`/reservations/${r.id}`}
                  // 종료·취소 건은 카드 전체를 흐리게 한다.
                  // 배경만 회색으로 두면 글자·배지·금액이 여전히 눈에 걸린다.
                  className={`block rounded-2xl px-4 py-3.5 ${style.card} ${style.dim ? DIM_CLASS : ''}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className={`text-base font-bold ${style.strikethrough ? 'line-through' : ''}`}>
                      {formatShortDate(r.checkin_date)} ~ {formatShortDate(r.checkout_date)}
                    </span>
                    <span className="text-xs text-neutral-500">{r.nights}박</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.properties?.color ?? '#3b82f6' }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-600 dark:text-neutral-400">
                      {r.properties?.name ?? '숙소'}
                    </span>
                    {/* 색만으로 구분하지 않는다. 배지 텍스트를 항상 같이 둔다. */}
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                      {style.label}
                    </span>
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

