'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatShortDate } from '@/lib/cleaning';
import { monthGridDates } from '@/lib/calendar';
import { shiftMonth } from '@/lib/stats';
import { RESERVATION_STATUS_STYLE } from '@/lib/status';
import Legend from './Legend';
import type { CalReservation, CalTask } from './types';

// 일요일 시작. 순서를 바꾸면 lib/calendar.ts 의 startOfWeek 도 같이 맞춰야 한다.
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const MAX_BARS = 2;

export default function MonthCalendar({
  month,
  loadedFrom,
  loadedTo,
  today,
  reservations,
  tasks,
}: {
  month: string; // YYYY-MM
  loadedFrom: string;
  loadedTo: string;
  today: string;
  reservations: CalReservation[];
  tasks: CalTask[];
}) {
  const router = useRouter();
  // 앞뒤 1개월치를 미리 받아뒀으므로 그 범위 안에서는 서버를 치지 않는다.
  const [viewMonth, setViewMonth] = useState(month);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const visibleReservations = useMemo(
    () => (showCancelled ? reservations : reservations.filter((r) => r.visual !== 'cancelled')),
    [reservations, showCancelled]
  );

  const dates = useMemo(() => monthGridDates(`${viewMonth}-01`), [viewMonth]);

  // 날짜별로 미리 묶어둔다. 칸마다 전체를 훑으면 42칸 × N 이 된다.
  const byDate = useMemo(() => {
    const map = new Map<string, { res: CalReservation[]; tasks: CalTask[] }>();
    const bucket = (d: string) => {
      let b = map.get(d);
      if (!b) map.set(d, (b = { res: [], tasks: [] }));
      return b;
    };
    for (const r of visibleReservations) {
      for (const d of dates) if (r.checkinDate <= d && d <= r.checkoutDate) bucket(d).res.push(r);
    }
    for (const t of tasks) bucket(t.date).tasks.push(t);
    return map;
  }, [visibleReservations, tasks, dates]);

  function goMonth(delta: number) {
    const next = shiftMonth(viewMonth, delta);
    setSelected(null);
    // 미리 받아둔 범위를 벗어나면 그때만 서버를 친다.
    if (`${next}-01` < loadedFrom || `${next}-01` > loadedTo) {
      router.push(`/calendar?m=${next}`);
      return;
    }
    setViewMonth(next);
  }

  // 느낌표 점은 작아서 그냥 지나치기 쉽다. 상단에 칩으로 띄운다.
  const attentionDates = useMemo(
    () => [...new Set(tasks.filter((t) => t.needsAttention).map((t) => t.date))].sort(),
    [tasks]
  );

  function goToAttention() {
    const target = attentionDates.find((d) => d >= today) ?? attentionDates[0];
    if (!target) return;
    const m = target.slice(0, 7);
    if (`${m}-01` < loadedFrom || `${m}-01` > loadedTo) {
      router.push(`/calendar?m=${m}`);
      return;
    }
    setViewMonth(m);
    setSelected(target);
  }

  const selectedBucket = selected ? byDate.get(selected) : undefined;

  return (
    <div>
      {attentionDates.length > 0 && (
        <button
          type="button"
          onClick={goToAttention}
          className="mb-3 flex h-11 w-full items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3.5 text-sm font-semibold text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300"
        >
          <span className="font-bold">!</span>
          확인 필요 {attentionDates.length}건
          <span className="ml-auto text-orange-500">›</span>
        </button>
      )}

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          aria-label="이전 달"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-lg dark:border-neutral-700"
        >
          ‹
        </button>
        <h2 className="flex-1 text-center text-base font-bold">
          {Number(viewMonth.slice(0, 4))}년 {Number(viewMonth.slice(5, 7))}월
        </h2>
        <button
          type="button"
          onClick={() => goMonth(1)}
          aria-label="다음 달"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-lg dark:border-neutral-700"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => {
            const m = today.slice(0, 7);
            if (`${m}-01` < loadedFrom || `${m}-01` > loadedTo) router.push('/calendar');
            else setViewMonth(m);
            setSelected(today);
          }}
          className="h-11 shrink-0 rounded-full border border-neutral-300 px-3.5 text-sm font-semibold dark:border-neutral-700"
        >
          오늘
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-neutral-50 py-2 text-center text-xs font-semibold text-neutral-500 dark:bg-neutral-900"
          >
            {w}
          </div>
        ))}

        {dates.map((date) => {
          const bucket = byDate.get(date);
          const inMonth = date.slice(0, 7) === viewMonth;
          const isToday = date === today;
          const isSelected = date === selected;
          const bars = bucket?.res ?? [];

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(isSelected ? null : date)}
              aria-pressed={isSelected}
              className={`min-h-16 bg-white p-1 text-left align-top dark:bg-neutral-950 ${inMonth ? '' : 'opacity-40'} ${
                isSelected ? 'ring-2 ring-neutral-900 ring-inset dark:ring-neutral-100' : ''
              }`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                  isToday
                    ? 'border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {Number(date.slice(8, 10))}
              </span>

              <span className="mt-0.5 flex flex-col gap-0.5">
                {bars.slice(0, MAX_BARS).map((r) => {
                  const style = RESERVATION_STATUS_STYLE[r.visual];
                  return (
                    <span
                      key={r.id}
                      className={`block h-1.5 rounded-full ${style.bar} ${style.dimClass}`}
                      title={`${style.label} · ${r.propertyName}`}
                    />
                  );
                })}
                {bars.length > MAX_BARS && (
                  <span className="text-[10px] leading-none text-neutral-500">+{bars.length - MAX_BARS}</span>
                )}
              </span>

              {/* 청소: 미완료=채운 점, 완료=빈 점, 확인필요=느낌표 */}
              {bucket?.tasks.length ? (
                <span className="mt-1 flex items-center gap-0.5">
                  {bucket.tasks.map((t) => (
                    <CleaningDot key={t.id} task={t} />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Legend />

      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => setShowCancelled((v) => !v)}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
        >
          {showCancelled ? '취소된 예약 숨기기' : '취소된 예약 보기'}
        </button>
      </div>

      {/* 날짜를 누르면 그리드 아래에 펼친다. 새 화면으로 넘기지 않는다 — 왕복이 생기고 느려진다. */}
      {selected && (
        <section className="mt-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <h3 className="mb-3 text-sm font-bold">{formatShortDate(selected)}</h3>

          {!selectedBucket?.res.length && !selectedBucket?.tasks.length ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
              이 날은 일정이 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedBucket?.res.map((r) => (
                <ReservationCard key={r.id} reservation={r} date={selected} />
              ))}
              {selectedBucket?.tasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CleaningDot({ task }: { task: CalTask }) {
  if (task.needsAttention) {
    return (
      <span className="text-[10px] leading-none font-bold text-orange-600" title="확인 필요">
        !
      </span>
    );
  }
  return (
    <span
      className={`size-1.5 rounded-full ${
        task.status === 'done'
          ? 'border border-neutral-400 dark:border-neutral-500'
          : 'bg-amber-500'
      }`}
      title={task.status === 'done' ? '청소완료' : '청소전'}
    />
  );
}

function ReservationCard({ reservation, date }: { reservation: CalReservation; date: string }) {
  const style = RESERVATION_STATUS_STYLE[reservation.visual];
  const isCheckin = reservation.checkinDate === date;
  const isCheckout = reservation.checkoutDate === date;

  return (
    <Link
      href={`/reservations/${reservation.id}`}
      // opacity 는 클릭을 막지 않는다. 흐려도 눌러서 열 수 있다.
      className={`relative block rounded-2xl px-4 py-3.5 ${style.card}`}
    >
      {/* 배지는 흐림 밖에 둔다 — 배지까지 흐려지면 왜 흐린지 알 수 없어진다 */}
      <span className={`absolute top-3.5 right-4 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
        {style.label}
      </span>
      <div className={style.dimClass}>
        <div className="flex items-center gap-2 pr-16">
          {isCheckin && <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">입실</span>}
          {isCheckout && <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">퇴실</span>}
          <span className="min-w-0 flex-1 truncate text-sm">{reservation.propertyName}</span>
        </div>
        <p className={`mt-1.5 text-sm ${style.strikethrough ? 'line-through' : ''}`}>
          {formatShortDate(reservation.checkinDate)} ~ {formatShortDate(reservation.checkoutDate)}
          {reservation.guestName ? ` · ${reservation.guestName}` : ''}
        </p>
      </div>
    </Link>
  );
}

function TaskCard({ task }: { task: CalTask }) {
  return (
    <Link
      href="/cleaning"
      className="block rounded-2xl border border-neutral-200 px-4 py-3.5 dark:border-neutral-800"
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
          청소
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{task.propertyName}</span>
        <span className="shrink-0 text-xs font-semibold text-neutral-500">
          {task.status === 'done' ? '완료' : '청소전'}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
        {formatShortDate(task.scheduledDate)} 퇴실 ·{' '}
        {task.plannedDate ? `예정 ${formatShortDate(task.plannedDate)}` : '예정일 미정'}
        {task.assigneeName ? ` · ${task.assigneeName}` : ' · 담당 미지정'}
      </p>
      {task.needsAttention && (
        <p className="mt-1 text-xs font-semibold text-orange-700 dark:text-orange-400">일정 변경됨 확인 필요</p>
      )}
    </Link>
  );
}
