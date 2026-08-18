import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '포남동 예약관리',
    short_name: '포남동',
    description: '포남동 숙소 예약·청소·정산 관리',
    lang: 'ko',
    display: 'standalone',
    // '/' 로 두면 미들웨어가 로그인 여부를 보고 /calendar 또는 /login 으로 보낸다.
    // /calendar 로 박아두면 로그아웃 상태에서 앱을 열었을 때 리다이렉트가 한 번 더 붙는다.
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
