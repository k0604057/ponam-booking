import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '포남동 예약관리',
  description: '포남동 숙소 예약·청소·정산 관리',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '포남동', statusBarStyle: 'default' },
  // iOS 는 manifest 아이콘을 읽지 않는다. 별도로 지정한다.
  icons: { icon: '/icon-192.png', apple: '/apple-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 아이폰 노치·홈 인디케이터 영역까지 화면을 쓰고, safe-area-inset 으로 여백을 준다.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-dvh flex flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
