// 청소 실적 집계 회귀 테스트.
//
// 여기서 틀리면 "내가 몇 건 했나" 가 틀리게 나온다. 시간대 경계가 가장 위험하다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { countByMember, countByMonth, formatMonth, recentMonths, seoulMonth, shiftMonth } from './stats';

test('seoulMonth — UTC 가 아니라 서울 기준으로 센다', () => {
  // 서울 2026-09-01 01:00 = UTC 2026-08-31 16:00.
  // UTC 로 세면 8월로 잘못 잡힌다.
  assert.equal(seoulMonth('2026-08-31T16:00:00Z'), '2026-09');
  // 서울 2026-08-31 23:00 = UTC 2026-08-31 14:00 — 같은 8월
  assert.equal(seoulMonth('2026-08-31T14:00:00Z'), '2026-08');
  // 서울 2026-08-01 00:30 = UTC 2026-07-31 15:30
  assert.equal(seoulMonth('2026-07-31T15:30:00Z'), '2026-08');
});

test('shiftMonth — 연 경계를 넘는다', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-08', -12), '2025-08');
});

test('recentMonths — 최신 월이 먼저', () => {
  assert.deepEqual(recentMonths('2026-02', 4), ['2026-02', '2026-01', '2025-12', '2025-11']);
});

test('formatMonth', () => {
  assert.equal(formatMonth('2026-08'), '2026년 8월');
  assert.equal(formatMonth('2026-12'), '2026년 12월');
});

const TASKS = [
  { completedAt: '2026-08-20T05:00:00Z', completedBy: 'me' },
  { completedAt: '2026-08-31T16:00:00Z', completedBy: 'me' }, // 서울 기준 9월
  { completedAt: '2026-07-10T05:00:00Z', completedBy: 'me' },
  { completedAt: '2026-08-05T05:00:00Z', completedBy: 'other' },
  { completedAt: null, completedBy: 'me' }, // 완료 시각 없음 — 세지 않는다
];

test('countByMonth — 건수 0인 달은 빼고, 요청한 순서를 지킨다', () => {
  const rows = countByMonth(TASKS, recentMonths('2026-09', 4));
  assert.deepEqual(rows, [
    { month: '2026-09', count: 1 },
    { month: '2026-08', count: 2 },
    { month: '2026-07', count: 1 },
  ]);
  assert.ok(!rows.some((r) => r.month === '2026-06'), '0건인 달은 생략');
});

test('countByMonth — completed_at 이 null 이면 세지 않는다', () => {
  const rows = countByMonth([{ completedAt: null, completedBy: 'me' }], ['2026-08']);
  assert.deepEqual(rows, []);
});

test('countByMember — 해당 월만, completed_by 기준', () => {
  const aug = countByMember(TASKS, '2026-08');
  assert.equal(aug.get('me'), 1, '8/31 16:00 UTC 는 서울 9월이라 빠진다');
  assert.equal(aug.get('other'), 1);

  const sep = countByMember(TASKS, '2026-09');
  assert.equal(sep.get('me'), 1);
  assert.equal(sep.get('other'), undefined);
});

test('countByMember — completed_by 가 null 이면 세지 않는다', () => {
  const m = countByMember([{ completedAt: '2026-08-20T05:00:00Z', completedBy: null }], '2026-08');
  assert.equal(m.size, 0);
});
