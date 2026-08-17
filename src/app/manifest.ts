import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '포남동 예약관리',
    short_name: '포남동',
    description: '포남동 숙소 예약·청소·정산 관리',
    lang: 'ko',
    display: 'standalone',
    // 청소 담당이 주 사용자다. 홈 화면에서 바로 청소 보드로 들어간다.
    start_url: '/cleaning',
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
