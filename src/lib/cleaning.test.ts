// 청소 보드·달력의 날짜 계산 회귀 테스트.
//   npm test
//
// 여기 로직이 틀리면 "언제까지 끝내야 하는가"가 틀리게 표시된다. 화면보다 이쪽이 중요하다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addDays,
  computeDeadline,
  daysBetween,
  effectiveDate,
  endOfWeek,
  formatShortDate,
  groupBySection,
  sectionOf,
  seoulToday,
  weekdayIndex,
} from './cleaning';
import { monthGridDates, startOfWeek } from './calendar';

// ---------------------------------------------------------------- 날짜 기본

test('addDays / daysBetween — 월·연 경계를 넘어도 맞는다', () => {
  assert.equal(addDays('2026-08-30', 3), '2026-09-02');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(daysBetween('2026-08-21', '2026-08-25'), 4);
  assert.equal(daysBetween('2026-08-21', '2026-08-21'), 0);
  assert.equal(daysBetween('2026-02-27', '2026-03-02'), 3);
});

test('formatShortDate / weekdayIndex', () => {
  assert.equal(formatShortDate('2026-08-21'), '8/21 (금)');
  assert.equal(formatShortDate('2026-08-23'), '8/23 (일)');
  assert.equal(weekdayIndex('2026-08-17'), 1, '2026-08-17 은 월요일');
});

test('endOfWeek — 월요일 시작, 일요일 끝', () => {
  assert.equal(endOfWeek('2026-08-17'), '2026-08-23', '월요일');
  assert.equal(endOfWeek('2026-08-23'), '2026-08-23', '일요일은 그날이 끝');
  assert.equal(endOfWeek('2026-08-21'), '2026-08-23', '금요일');
});

test('seoulToday — YYYY-MM-DD 형식이고 서울 기준이다', () => {
  // UTC 로 2026-08-17 20:00 = 서울 2026-08-18 05:00
  assert.equal(seoulToday(new Date('2026-08-17T20:00:00Z')), '2026-08-18');
  assert.equal(seoulToday(new Date('2026-08-17T14:00:00Z')), '2026-08-17');
});

// ---------------------------------------------------------------- 마감일·여유

test('computeDeadline — 다음 입실이 있으면 그날이 마감일', () => {
  const d = computeDeadline('2026-08-21', ['2026-08-25', '2026-09-01']);
  assert.equal(d.nextCheckinDate, '2026-08-25');
  assert.equal(d.deadline, '2026-08-25');
  assert.equal(d.slackDays, 4);
  assert.equal(d.sameDayTurnover, false);
});

test('computeDeadline — 다음 입실이 없으면 퇴실일 + 3일', () => {
  const d = computeDeadline('2026-08-21', []);
  assert.equal(d.nextCheckinDate, null);
  assert.equal(d.deadline, '2026-08-24');
  assert.equal(d.slackDays, 3);
});

test('computeDeadline — 당일 턴오버는 여유 0일', () => {
  const d = computeDeadline('2026-08-21', ['2026-08-21']);
  assert.equal(d.sameDayTurnover, true);
  assert.equal(d.slackDays, 0);
  assert.equal(d.deadline, '2026-08-21');
});

test('computeDeadline — 퇴실일보다 이른 입실은 무시한다', () => {
  const d = computeDeadline('2026-08-21', ['2026-08-05', '2026-08-11', '2026-08-25']);
  assert.equal(d.nextCheckinDate, '2026-08-25', '과거 입실을 집으면 마감일이 과거가 된다');
});

test('effectiveDate — 담당자가 정한 날이 우선', () => {
  assert.equal(effectiveDate('2026-08-21', '2026-08-23'), '2026-08-23');
  assert.equal(effectiveDate('2026-08-21', null), '2026-08-21');
});

// ---------------------------------------------------------------- 섹션 분류

const TODAY = '2026-08-17'; // 월요일

test('sectionOf — 기본 분류', () => {
  assert.equal(sectionOf('2026-08-17', 'pending', TODAY), 'today');
  assert.equal(sectionOf('2026-08-18', 'pending', TODAY), 'tomorrow');
  assert.equal(sectionOf('2026-08-21', 'pending', TODAY), 'thisWeek');
  assert.equal(sectionOf('2026-08-23', 'pending', TODAY), 'thisWeek', '일요일까지가 이번 주');
  assert.equal(sectionOf('2026-08-24', 'pending', TODAY), 'later', '월요일부터 다음 주');
});

test('sectionOf — 지난 날짜는 미완료면 밀린 청소, 완료면 지난 청소', () => {
  assert.equal(sectionOf('2026-08-11', 'pending', TODAY), 'overdue');
  assert.equal(sectionOf('2026-08-11', 'done', TODAY), 'past');
  assert.equal(sectionOf('2026-08-11', 'skipped', TODAY), 'past');
});

test('sectionOf — 마감일이 지났으면 예정일이 미래여도 밀린 청소', () => {
  // 예정일을 자꾸 미루면 카드가 미래 섹션으로 도망가는 걸 막는다
  assert.equal(sectionOf('2026-08-25', 'pending', TODAY, '2026-08-14'), 'overdue');
  assert.equal(sectionOf('2026-08-25', 'pending', TODAY, '2026-08-30'), 'later');
  assert.equal(sectionOf('2026-08-25', 'done', TODAY, '2026-08-14'), 'later', '완료된 건은 밀린 게 아니다');
});

test('groupBySection — 예정일 기준으로 섹션이 바뀐다', () => {
  const base = { status: 'pending', deadline: '2026-08-30' };
  const moved = groupBySection([{ ...base, effectiveDate: '2026-08-24' }], TODAY);
  assert.equal(moved[0].key, 'later', '담당자가 8/24로 잡으면 다음 주 이후로 간다');

  const notMoved = groupBySection([{ ...base, effectiveDate: '2026-08-21' }], TODAY);
  assert.equal(notMoved[0].key, 'thisWeek');
});

test('groupBySection — 빈 섹션은 만들지 않고, 정해진 순서를 지킨다', () => {
  const sections = groupBySection(
    [
      { effectiveDate: '2026-08-24', status: 'pending', deadline: '2026-08-30' },
      { effectiveDate: '2026-08-11', status: 'pending', deadline: '2026-08-14' },
      { effectiveDate: '2026-08-17', status: 'pending', deadline: '2026-08-20' },
    ],
    TODAY
  );
  assert.deepEqual(sections.map((s) => s.key), ['overdue', 'today', 'later']);
  assert.ok(!sections.some((s) => s.tasks.length === 0));
});

// ---------------------------------------------------------------- 달력

test('startOfWeek — 월요일을 돌려준다', () => {
  assert.equal(startOfWeek('2026-08-17'), '2026-08-17', '월요일');
  assert.equal(startOfWeek('2026-08-21'), '2026-08-17', '금요일');
  assert.equal(startOfWeek('2026-08-23'), '2026-08-17', '일요일은 그 주에 속한다');
  assert.equal(startOfWeek('2026-08-24'), '2026-08-24', '다음 월요일');
});

test('monthGridDates — 6주 42칸, 그 달 1일이 포함된다', () => {
  const dates = monthGridDates('2026-08-17');
  assert.equal(dates.length, 42);
  assert.equal(startOfWeek('2026-08-01'), dates[0]);
  assert.ok(dates.includes('2026-08-01'));
  assert.ok(dates.includes('2026-08-31'));
});
