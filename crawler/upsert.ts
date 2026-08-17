// 수집 결과를 Supabase 에 반영하고 변경분(diff)을 로깅한다.
// 쓰기는 service_role 로 RLS를 우회한다.
// 예약 1건은 3개 테이블에 나눠 넣는다:
//   reservations (숙소·기간·상태) / reservation_private (게스트·raw) / reservation_finance (금액)
// 구현은 스펙 #2에서.

import type { Scraped33m2Reservation } from './scrape33m2';

export async function upsertReservations(
  _rows: Scraped33m2Reservation[]
): Promise<void> {
  throw new Error('not_implemented: 스펙 #2에서 구현');
}
