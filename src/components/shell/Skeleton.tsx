/**
 * 로딩 스켈레톤.
 * 실제 속도를 줄이지는 않지만 체감은 가장 크게 바뀐다 —
 * 탭을 눌렀는데 아무 반응이 없으면 사람은 두 번 누른다.
 */
export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-neutral-200 px-4 py-3.5 dark:border-neutral-800">
      <SkeletonBar className="h-4 w-2/3" />
      <SkeletonBar className="mt-3 h-3 w-1/3" />
      <div className="mt-3 flex gap-1.5">
        <SkeletonBar className="h-6 w-16 rounded-full" />
        <SkeletonBar className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonBar className="mt-3 h-3 w-1/2" />
    </div>
  );
}

export function SkeletonList({ title, count = 3 }: { title: string; count?: number }) {
  return (
    <>
      <h1 className="mb-5 text-xl font-bold">{title}</h1>
      <SkeletonBar className="mb-3 h-4 w-24" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </>
  );
}
