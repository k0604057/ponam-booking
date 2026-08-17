export default function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <h1 className="mb-8 text-xl font-bold">{title}</h1>
      <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
        <p className="text-sm text-neutral-500">준비 중입니다.</p>
      </div>
    </>
  );
}
