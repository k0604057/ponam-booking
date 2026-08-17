// 파서 회귀 테스트.
//   npm test        (= npx tsx --test crawler/parse.test.ts)
//
// 33m2 마크업이 바뀌면 파싱이 조용히 깨진다. 여기서 잡는다.
// 픽스처는 crawler/fixtures/detail-pages.ts — 실제로 만난 형태 4종이다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDetailText,
  parseKoreanDate,
  parseAmount,
  normalizePhone,
  parseTimeline,
  findBadge,
  assertHttpOk,
  BlockedError,
} from './scrape33m2';
import {
  DETAIL_LABEL_INLINE,
  DETAIL_LABEL_SEPARATE,
  DETAIL_CANCELLED,
  BLOCKED_403_BODY,
  SCHEDULE_TIMELINE,
} from './fixtures/detail-pages';

// ---------------------------------------------------------------- A. 라벨/값 같은 줄

test('A. 라벨과 값이 같은 줄 — 임차인 정보를 집는다', () => {
  const d = parseDetailText(DETAIL_LABEL_INLINE);
  assert.equal(d.roomName, '강릉 KTX 근처 숙소');
  assert.equal(d.jibunAddress, '강원특별자치도 강릉시 포남동 1065 포남1주공아파트 2층 14동 207호');
  assert.equal(d.roomAddress, d.jibunAddress, '지번을 우선한다');
  assert.equal(d.guestName, '박게스트');
  assert.equal(d.guestPhone, '010-2222-2222');
  assert.equal(d.checkinDate, '2026-08-15');
  assert.equal(d.checkoutDate, '2026-08-21');
  assert.deepEqual(d.amounts, {
    gross: 350000, rent: 300000, maintenance: 20000, cleaning: 30000, fee: -11550, net: 338450,
  });
  assert.equal(d.settledAt, '2026-08-16');
  assert.equal(d.settlementStatus, '정산완료');
});

test('A. 호스트(임대인) 정보가 게스트로 새지 않는다', () => {
  const d = parseDetailText(DETAIL_LABEL_INLINE);
  assert.notEqual(d.guestName, '김호스트');
  assert.notEqual(d.guestPhone, '010-1111-1111');
});

// ---------------------------------------------------------------- B. 라벨/값 별도 줄 (실제 DOM)

test('B. 라벨과 값이 별도 줄 — 다음 줄로 폴백해 값을 찾는다', () => {
  const d = parseDetailText(DETAIL_LABEL_SEPARATE);
  assert.equal(d.roomName, '강릉 KTX 근처 숙소');
  assert.equal(d.jibunAddress, '강원특별자치도 강릉시 포남동 1065 포남1주공아파트 2층 14동 207호');
  assert.equal(d.guestName, '최손님');
  assert.equal(d.guestPhone, '010-3333-3333');
  assert.equal(d.checkinDate, '2026-08-15');
  assert.equal(d.checkoutDate, '2026-08-21');
  assert.equal(d.amounts.gross, 350000);
  assert.equal(d.amounts.net, 338450);
});

test("B. 상단 네비게이션 '임차인 모드로 전환' 을 임차인 블록으로 오인하지 않는다", () => {
  assert.ok(DETAIL_LABEL_SEPARATE.includes('임차인 모드로 전환'), '픽스처 전제');
  const d = parseDetailText(DETAIL_LABEL_SEPARATE);
  // 오인하면 임차인 블록 범위가 비어 둘 다 null 이 된다.
  assert.equal(d.guestName, '최손님');
  assert.notEqual(d.guestName, '김호스트');
  assert.notEqual(d.guestPhone, '010-1111-1111');
});

test('B. 상세 페이지 단독으로는 상태 뱃지가 없다 (목록 카드 뱃지가 1순위인 이유)', () => {
  assert.equal(findBadge(DETAIL_LABEL_SEPARATE), null);
});

// ---------------------------------------------------------------- C. 취소 건

test('C. 취소 건 — 연락처 자리의 안내 문장은 저장하지 않는다', () => {
  const d = parseDetailText(DETAIL_CANCELLED);
  assert.equal(d.guestName, '정취소');
  assert.equal(d.guestPhone, null, '문장을 전화번호로 저장하면 안 된다');
  assert.equal(d.guestPhoneRaw, '취소된 계약은 연락처가 공개되지 않습니다.', '원문은 남긴다');
});

test('C. 취소 건 — 환불 구조라 (이용 금액 - 수수료 ≠ 최종 정산 금액) 이 정상', () => {
  const d = parseDetailText(DETAIL_CANCELLED);
  assert.equal(d.amounts.gross, 350000);
  assert.equal(Math.abs(d.amounts.fee), 990);
  assert.equal(d.amounts.net, 29010);
  assert.notEqual(d.amounts.gross - Math.abs(d.amounts.fee), d.amounts.net);
});

test('C. 취소 건도 날짜는 정상 파싱된다', () => {
  const d = parseDetailText(DETAIL_CANCELLED);
  assert.equal(d.checkinDate, '2026-07-31');
  assert.equal(d.checkoutDate, '2026-08-06');
});

// ---------------------------------------------------------------- D. 403 차단

test('D. 403 본문은 유효한 계약으로 파싱되지 않는다', () => {
  const d = parseDetailText(BLOCKED_403_BODY);
  assert.equal(d.roomName, null);
  assert.equal(d.checkinDate, null);
  assert.equal(d.checkoutDate, null);
  assert.equal(d.guestName, null);
});

test('D. 403/401 은 BlockedError 로 즉시 실패한다', () => {
  assert.throws(() => assertHttpOk('https://web.33m2.co.kr/host/contract', 403), BlockedError);
  assert.throws(() => assertHttpOk('https://web.33m2.co.kr/host/contract', 401), BlockedError);
  assert.throws(() => assertHttpOk('https://web.33m2.co.kr/host/contract', 500), /HTTP 500/);
  assert.doesNotThrow(() => assertHttpOk('https://web.33m2.co.kr/host/contract', 200));
});

// ---------------------------------------------------------------- 단위 함수

test('parseKoreanDate', () => {
  assert.equal(parseKoreanDate('2026년 08월 15일(토)'), '2026-08-15');
  assert.equal(parseKoreanDate('2026년 8월 5일(수)'), '2026-08-05');
  assert.equal(parseKoreanDate('날짜 없음'), null);
});

test('parseAmount', () => {
  assert.equal(parseAmount('350,000원'), 350000);
  assert.equal(parseAmount('-11,550원'), -11550);
  assert.equal(parseAmount('0원'), 0);
  assert.equal(parseAmount('금액 없음'), null);
});

test('normalizePhone — 번호 형식이 아니면 null', () => {
  assert.equal(normalizePhone('010-2222-2222'), '010-2222-2222');
  assert.equal(normalizePhone('01022222222'), '010-2222-2222');
  assert.equal(normalizePhone('취소된 계약은 연락처가 공개되지 않습니다.'), null);
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
});

test("findBadge — '결제취소' 가 '취소' 보다 먼저 (부분일치 함정)", () => {
  assert.equal(findBadge('결제취소')?.badge, '결제취소');
  assert.equal(findBadge('결제취소')?.status, 'cancelled');
  assert.equal(findBadge('거주중')?.status, 'confirmed');
  assert.equal(findBadge('계약종료')?.status, 'completed');
  assert.equal(findBadge('해당없음'), null);
});

test('parseTimeline', () => {
  assert.deepEqual(parseTimeline(SCHEDULE_TIMELINE), [
    { label: '거주중', at: '2026.08.15 18:40' },
    { label: '퇴실완료', at: '2026.08.21 11:02' },
  ]);
});
