/**
 * 초대 링크에 쓸 사이트 주소.
 *
 * NEXT_PUBLIC_SITE_URL 이 있으면 **무조건** 그것을 쓴다.
 * 프리뷰 배포에서 만든 링크가 프리뷰 도메인을 가리키면 나중에 그 배포가 사라져 안 열린다.
 * 없을 때만 요청 호스트에서 유도한다(로컬 개발용).
 */
export function resolveSiteUrl(headers: Headers): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!host) return '';
  const proto = headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
