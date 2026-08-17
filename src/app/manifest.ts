import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '포남동 예약관리',
    short_name: '포남동',
    description: '포남동 숙소 예약·청소·정산 관리',
    lang: 'ko',
    display: 'standalone',
    // '/' 로 두면 미들웨어가 역할을 보고 알맞은 홈으로 보낸다
    // (청소 담당 → /cleaning, 그 외 → /calendar).
    start_url: '/',
    scope: '/',
    background_color: '#ffffff',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
