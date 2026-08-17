import BottomTabs from '@/components/shell/BottomTabs';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      {/* 하단 탭(56px)과 홈 인디케이터에 콘텐츠가 가리지 않게 여백을 준다 */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-[calc(3.5rem+1.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomTabs />
    </>
  );
}
