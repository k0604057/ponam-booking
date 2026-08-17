export const ROLE_LABEL: Record<string, string> = {
  owner: '호스트',
  reservation: '예약 관리',
  settlement: '정산',
  cleaning: '청소',
};

export default function RoleBadge({ role }: { role: string }) {
  return (
    <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}
