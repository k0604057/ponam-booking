export type CleaningStatus = 'pending' | 'done' | 'skipped';

/**
 * 화면이 쓰는 청소 건 모양.
 * 금액·게스트 이름·연락처는 들어오지 않는다 — 서버에서 아예 select 하지 않는다.
 */
export type CleaningTaskView = {
  id: string;
  scheduledDate: string;
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
  sameDayCheckin: boolean;
  sameDayCheckinTime: string | null;
  isMine: boolean;
};

export type CleaningSection = {
  key: string;
  label: string;
  tasks: CleaningTaskView[];
};
