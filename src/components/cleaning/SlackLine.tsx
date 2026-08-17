import { formatShortDate } from '@/lib/cleaning';
import type { CleaningTaskView } from './types';

/**
 * 카드 첫 줄. "언제까지 끝내야 하는가" 가 청소 담당에게 가장 필요한 정보다.
 *   다음 예약 있음 : 8/21(금) 퇴실 → 8/25(화) 입실 · 여유 4일
 *   없음           : 8/21(금) 퇴실 → 다음 예약 없음 · 8/24(월)까지
 *   당일 입실      : 8/21(금) 퇴실 → 당일 입실 · 오늘 안에   (빨강)
 */
export default function SlackLine({ task }: { task: CleaningTaskView }) {
  const urgent = task.slackDays <= 0;
  const tight = task.slackDays === 1;

  const tone = urgent
    ? 'text-red-700 dark:text-red-400'
    : tight
      ? 'text-orange-700 dark:text-orange-400'
      : 'text-neutral-600 dark:text-neutral-400';

  return (
    <p className={`text-sm leading-snug font-medium ${tone}`}>
      <span className="font-bold">{formatShortDate(task.scheduledDate)} 퇴실</span>
      {' → '}
      {task.nextCheckinDate === null ? (
        <>다음 예약 없음 · {formatShortDate(task.deadline)}까지</>
      ) : urgent ? (
        <>당일 입실 · 오늘 안에</>
      ) : (
        <>
          {formatShortDate(task.nextCheckinDate)} 입실 · 여유 {task.slackDays}일
        </>
      )}
    </p>
  );
}
