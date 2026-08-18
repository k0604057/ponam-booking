import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { perf } from '@/lib/perf';
import { VIEWER_ID_HEADER, VIEWER_ROLE_HEADER } from '@/lib/auth/viewer';

const LOGIN = '/login';
const PENDING = '/pending';

// 진입 화면은 역할과 무관하게 달력이다. 누가 열든 같은 화면에서 시작한다.
const HOME = '/calendar';

export async function middleware(request: NextRequest) {
  // setAll 로 넘어온 갱신 쿠키를 모아뒀다가 마지막에 만드는 응답에 붙인다.
  // 응답을 중간에 여러 번 새로 만들면 쿠키가 유실된다.
  let refreshedCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          refreshedCookies = cookiesToSet as typeof refreshedCookies;
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        },
      },
    }
  );

  // getUser() 호출이 만료 임박 토큰을 refresh 한다. 빼면 세션이 조용히 끊긴다.
  // 다만 이건 Supabase Auth 로 나가는 네트워크 왕복이다 — 리전이 멀면 여기서만 수백 ms 다.
  const {
    data: { user },
  } = await perf('mw:getUser', async () => supabase.auth.getUser());

  // 비활성 계정은 profiles_select 정책(is_member 기반)에 걸려 자기 행조차 0행으로 나온다.
  // 이건 오류가 아니라 '승인 대기' 상태다.
  const profile = user
    ? (
        await perf('mw:profile', async () =>
          supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
        )
      ).data
    : null;

  // 여기서 확인한 신원을 요청 헤더로 넘긴다.
  // 페이지마다 getUser() + profiles 를 다시 부르면 왕복이 2회씩 더 붙는다.
  // 클라이언트가 보낸 같은 이름의 헤더는 무조건 버리고 덮어쓰므로 위조할 수 없다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VIEWER_ID_HEADER);
  requestHeaders.delete(VIEWER_ROLE_HEADER);
  if (user) requestHeaders.set(VIEWER_ID_HEADER, user.id);
  if (profile?.role) requestHeaders.set(VIEWER_ROLE_HEADER, profile.role);

  const withCookies = (response: NextResponse) => {
    for (const { name, value, options } of refreshedCookies) response.cookies.set(name, value, options);
    return response;
  };
  const passThrough = () => withCookies(NextResponse.next({ request: { headers: requestHeaders } }));
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    return withCookies(NextResponse.redirect(url));
  };

  const { pathname, search } = request.nextUrl;

  // API 는 리다이렉트하지 않는다. HTML 로그인 페이지로 보내면 호출자가 401 대신
  // '405 Method Not Allowed' 를 받게 된다. 각 라우트가 스스로 401/403 을 낸다.
  const isApi = pathname.startsWith('/api/');

  if (!user) {
    if (isApi || pathname === LOGIN) return passThrough();
    // 만료로 튕긴 경우 로그인 후 원래 보던 화면으로 돌아가게 한다.
    const url = request.nextUrl.clone();
    url.pathname = LOGIN;
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return withCookies(NextResponse.redirect(url));
  }

  if (!profile) {
    if (isApi) return passThrough();
    return pathname === PENDING ? passThrough() : redirect(PENDING);
  }

  // 활성 멤버가 로그인·대기 화면에 오면 홈으로. '/'(PWA start_url) 도 홈으로 보낸다.
  if (pathname === LOGIN || pathname === PENDING || pathname === '/') return redirect(HOME);

  // owner 전용 화면은 여기서 막는다.
  // 페이지 안에서 redirect() 하면 loading.tsx 때문에 응답이 스트리밍으로 나가서
  // 스켈레톤이 HTTP 200 으로 먼저 전달된다 — 데이터는 안 새지만 진짜 리다이렉트가 아니다.
  // 미들웨어에서 막으면 렌더 자체를 하지 않고 307 로 끝난다.
  if (pathname.startsWith('/more/members') && profile.role !== 'owner') return redirect('/more');

  return passThrough();
}

export const config = {
  matcher: [
    // 미들웨어가 걸리면 그 요청마다 Auth 왕복이 붙는다. 정적 자산에는 걸지 않는다.
    //
    // 제외 대상:
    //   - _next 전체(정적 청크·이미지 최적화·RSC 프리페치 자산), favicon, manifest, 아이콘
    //   - 확장자가 붙은 파일 전부
    //   - /invite : 초대받은 사람은 로그인 전에 열어야 한다. 지우지 말 것
    //   - /api/invite/accept : 로그인 없이 호출되는 유일한 특권 라우트 (토큰으로 스스로 검증한다)
    '/((?!_next|favicon\\.ico|manifest\\.webmanifest|icon-\\d+\\.png|apple-icon|invite|api/invite/accept|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|json|woff|woff2|ttf)$).*)',
  ],
};
