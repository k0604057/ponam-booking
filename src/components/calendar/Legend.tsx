'use client';

import { useState } from 'react';
import { LEGEND_ORDER, RESERVATION_STATUS_STYLE } from '@/lib/status';

/**
 * 그리드 아래 한 줄 범례. 접었다 폈다 하는 토글로 만들지 않는다 —
 * 상태 관리만 늘고 한 줄이라 자리를 거의 안 먹는다.
 * 좁으면 두 줄로 넘긴다(flex-wrap). 가로 스크롤이 생기면 안 된다.
 *
 * 한 줄로는 "확인필요" 가 무슨 뜻인지 알 수 없으므로, 누르면 설명 시트를 연다.
 */
export default function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="달력 표시 설명 보기"
        className="mt-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-1 py-1.5 text-left text-[11px] text-neutral-500"
      >
        {LEGEND_ORDER.map((key) => {
          const s = RESERVATION_STATUS_STYLE[key];
          return (
            <span key={key} className="inline-flex items-center gap-1">
              <span className={`h-1.5 w-4 shrink-0 rounded-full ${s.swatch} ${s.dimClass}`} />
              {s.label}
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
          청소전
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 shrink-0 rounded-full border border-neutral-400 dark:border-neutral-500" />
          청소완료
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-bold text-orange-600">!</span>
          확인필요
        </span>
        <span className="ml-auto shrink-0 text-neutral-400">설명 ›</span>
      </button>

      {open && <LegendSheet onClose={() => setOpen(false)} />}
    </>
  );
}

const ROWS: Array<{ mark: React.ReactNode; term: string; desc: string }> = [
  {
    mark: <span className={`h-1.5 w-5 rounded-full ${RESERVATION_STATUS_STYLE.staying.swatch}`} />,
    term: '초록 막대',
    desc: '거주중 — 지금 손님이 묵고 있는 기간',
  },
  {
    mark: <span className={`h-1.5 w-5 rounded-full ${RESERVATION_STATUS_STYLE.upcoming.swatch}`} />,
    term: '노랑 막대',
    desc: '예정 — 아직 입실 전인 예약',
  },
  {
    mark: (
      <span
        className={`h-1.5 w-5 rounded-full ${RESERVATION_STATUS_STYLE.finished.swatch} ${RESERVATION_STATUS_STYLE.finished.dimClass}`}
      />
    ),
    term: '회색 막대',
    desc: '종료 — 이미 퇴실한 예약',
  },
  {
    mark: (
      <span
        className={`h-1.5 w-5 rounded-full ${RESERVATION_STATUS_STYLE.cancelled.swatch} ${RESERVATION_STATUS_STYLE.cancelled.dimClass}`}
      />
    ),
    term: '취소선 회색',
    desc: '취소 — 취소된 예약. 기본으로 숨겨져 있고 토글로 볼 수 있다',
  },
  {
    mark: <span className="size-2 rounded-full bg-amber-500" />,
    term: '채운 점',
    desc: '청소 전 — 아직 청소하지 않은 날',
  },
  {
    mark: <span className="size-2 rounded-full border border-neutral-400 dark:border-neutral-500" />,
    term: '빈 점',
    desc: '청소 완료',
  },
  {
    mark: <span className="text-sm font-bold text-orange-600">!</span>,
    term: '느낌표',
    desc: '확인 필요 — 청소를 마친 뒤 퇴실일이 바뀌었거나, 예약이 취소됐는데 이미 청소했거나, 완료를 되돌린 건. 사람이 한 번 봐야 한다',
  },
];

function LegendSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-5 dark:bg-neutral-950"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-bold">달력 표시 설명</h2>

        <dl className="flex flex-col gap-4">
          {ROWS.map((row) => (
            <div key={row.term} className="flex items-start gap-3">
              <span className="mt-1.5 flex w-6 shrink-0 justify-center">{row.mark}</span>
              <div className="min-w-0">
                <dt className="text-sm font-semibold">{row.term}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {row.desc}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-[52px] min-h-[52px] w-full rounded-xl border border-neutral-300 text-base font-semibold dark:border-neutral-700"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
