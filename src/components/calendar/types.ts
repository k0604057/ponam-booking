import type { ReservationVisualStatus } from '@/lib/status';

/** 달력이 쓰는 예약. 서버에서 직렬화해 넘긴다. */
export type CalReservation = {
  id: string;
  checkinDate: string;
  checkoutDate: string;
  visual: ReservationVisualStatus;
  propertyName: string;
  propertyColor: string;
  /** cleaning 역할에는 null 로 온다 (reservation_private 이 안 보임) */
  guestName: string | null;
};

/** 달력이 쓰는 청소 건. */
export type CalTask = {
  id: string;
  /** coalesce(planned_date, scheduled_date) */
  date: string;
  scheduledDate: string;
  plannedDate: string | null;
  status: 'pending' | 'done' | 'skipped';
  needsAttention: boolean;
  propertyName: string;
  propertyColor: string;
  assigneeName: string | null;
};
