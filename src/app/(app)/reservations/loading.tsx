import { SkeletonList } from '@/components/shell/Skeleton';

export default function Loading() {
  return <SkeletonList title="예약" count={3} />;
}
