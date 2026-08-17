// Playwright 로 33m2 호스트 페이지에서 예약 목록을 수집한다.
// 구현은 스펙 #2에서.
//
// 착수 전 확인할 것: 호스트 페이지에서 예약 목록을 불러올 때의 네트워크 요청.
// JSON 엔드포인트가 있으면 DOM 파싱 대신 그걸 호출한다 (훨씬 안정적).
//
// 세션은 M33_SESSION_PATH 에 저장/재사용한다 (storageState).

export type Scraped33m2Reservation = {
  externalId: string;
  propertyExternalId: string;
  checkinDate: string;
  checkoutDate: string;
};

export async function scrape33m2(): Promise<Scraped33m2Reservation[]> {
  throw new Error('not_implemented: 스펙 #2에서 구현');
}
