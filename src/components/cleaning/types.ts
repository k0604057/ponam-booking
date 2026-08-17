export type CleaningStatus = 'pending' | 'done' | 'skipped';

/**
 * 화면이 쓰는 청소 건 모양.
 * 금액·게스트 이름·연락처는 들어오지 않는다 — 서버에서 아예 select 하지 않는다.
 */
export type CleaningTaskView = {
  id: string;
  /** 퇴실일. 크롤러·트리거가 관리한다. 사람이 바꾸지 않는다. */
  scheduledDate: string;
  /** 담당자가 정한 청소 예정일. null 이면 아직 안 정한 것. */
  plannedDate: string | null;
  /** coalesce(plannedDate, scheduledDate). 정렬·그룹핑 기준. */
  effectiveDate: string;
  /** 같은 숙소의 다음 입실일. 없으면 null. */
  nextCheckinDate: string | null;
  /** 이 날까지 끝내야 한다. */
  deadline: string;
  /** 마감일 - 퇴실일 */
  slackDays: number;
  status: CleaningStatus;
  needsAttention: boolean;
  note: string | null;
  completedAt: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  completerName: string | null;
  propertyName: string;
  propertyColor: string;
  publicNote: string | null;
  isMine: boolean;
};

export type Viewer = {
  id: string | null;
  isOwner: boolean;
};
