import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // 클라이언트 라우터 캐시.
    // 기본값 0 이면 동적 세그먼트를 캐시하지 않아 탭을 오갈 때마다 서버를 친다.
    // 30초 안에 다시 누른 탭은 왕복 없이 뜬다.
    //
    // 변경 후에는 이미 router.refresh() 를 부르고 있으므로 오래된 데이터가 남지 않는다
    // (청소완료·맡기·예정일 변경·멤버 관리 전부).
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
