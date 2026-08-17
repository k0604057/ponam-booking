import { SkeletonList } from '@/components/shell/Skeleton';

export default function Loading() {
  return <SkeletonList title="멤버 관리" count={3} />;
}
