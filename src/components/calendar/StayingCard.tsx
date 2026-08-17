import { formatShortDate } from '@/lib/cleaning';

export type Stay = {
  id: string;
  checkinDate: string;
  checkoutDate: string;
  guestName: string | null;
  propertyName: string;
  propertyColor: string;
  daysLeft: number;
};

/** 지금 거주중인 예약은 목록에 묻히면 안 되므로 상단에 따로 세운다. */
export default function StayingCard({ stay }: { stay: Stay }) {
  return (
    <div className="mb-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">지금 거주중</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stay.propertyColor }} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{stay.propertyName}</span>
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {formatShortDate(stay.checkinDate)} ~ {formatShortDate(stay.checkoutDate)}
        {/* 게스트 이름은 reservation_private 이라 cleaning 역할에는 안 온다. 자리를 비운다. */}
        {stay.guestName ? ` · ${stay.guestName}` : ''}
        {' · '}
        {stay.daysLeft <= 0 ? '오늘 퇴실' : `${stay.daysLeft}일 남음`}
      </p>
    </div>
  );
}
