// 예약 상태 색상 — 달력 막대·목록 카드·상세가 **모두 이 상수를 쓴다.**
// 세 군데서 따로 정의하면 반드시 어긋난다.
//
// 색만으로 구분하지 않는다. 배지 텍스트를 항상 같이 둔다 —
// 색각 이상이 있는 사람도 있고, 흑백으로 캡처해 공유하는 경우도 있다.

export type ReservationVisualStatus = 'staying' | 'upcoming' | 'finished' | 'cancelled';

export type StatusStyle = {
  label: string;
  /** 카드 배경 + 좌측 띠 */
  card: string;
  /** 배지. **흐리게 하지 않는다** — 배지까지 흐려지면 왜 흐린지 알 수 없어진다. */
  badge: string;
  /** 달력 막대 */
  bar: string;
  /**
   * 카드/막대 내용에 거는 흐림.
   * opacity 는 클릭을 막지 않는다 — pointer-events 를 건드리면 안 된다.
   */
  dimClass: string;
  /** 범례 견본에 쓰는 색 (막대와 같은 색) */
  swatch: string;
  strikethrough: boolean;
};

export const RESERVATION_STATUS_STYLE: Record<ReservationVisualStatus, StatusStyle> = {
  staying: {
    label: '거주중',
    card: 'border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    bar: 'bg-emerald-500',
    dimClass: '',
    swatch: 'bg-emerald-500',
    strikethrough: false,
  },
  upcoming: {
    label: '예정',
    card: 'border-l-4 border-l-amber-400 bg-amber-50 dark:bg-amber-950/40',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
    bar: 'bg-amber-400',
    dimClass: '',
    swatch: 'bg-amber-400',
    strikethrough: false,
  },
  finished: {
    label: '종료',
    card: 'border-l-4 border-l-neutral-300 bg-neutral-100 dark:border-l-neutral-700 dark:bg-neutral-900',
    badge: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    bar: 'bg-neutral-400 dark:bg-neutral-600',
    dimClass: 'opacity-35',
    swatch: 'bg-neutral-400 dark:bg-neutral-600',
    strikethrough: false,
  },
  cancelled: {
    label: '취소',
    card: 'border-l-4 border-l-neutral-300 bg-neutral-100 dark:border-l-neutral-700 dark:bg-neutral-900',
    badge: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
    // 종료보다 한 단계 더 흐리게
    bar: 'bg-neutral-400 dark:bg-neutral-600',
    dimClass: 'opacity-25',
    swatch: 'bg-neutral-400 dark:bg-neutral-600',
    strikethrough: true,
  },
};

export function reservationVisualStatus(
  status: string,
  checkinDate: string,
  checkoutDate: string,
  today: string
): ReservationVisualStatus {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'finished';
  if (checkoutDate < today) return 'finished';
  if (checkinDate <= today && today <= checkoutDate) return 'staying';
  return 'upcoming';
}

export function statusStyle(
  status: string,
  checkinDate: string,
  checkoutDate: string,
  today: string
): StatusStyle {
  return RESERVATION_STATUS_STYLE[reservationVisualStatus(status, checkinDate, checkoutDate, today)];
}

/** 범례·설명 시트가 쓰는 순서 */
export const LEGEND_ORDER: ReservationVisualStatus[] = ['staying', 'upcoming', 'finished'];
