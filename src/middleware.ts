import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const LOGIN = '/login';
const PENDING = '/pending';
const HOME = '/cleaning';

export async function middleware(request: NextRequest) {
  // 이 response 객체를 그대로 돌려줘야 갱신된 세션 쿠키가 브라우저에 전달된다.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    }
  );

  // getUser() 호출이 만료 임박 토큰을 refresh 한다. 빼면 세션이 조용히 끊긴다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    return NextResponse.redirect(url);
  };

  // API 는 리다이렉트하지 않는다. HTML 로그인 페이지로 보내면 호출자가 401 대신
  // '405 Method Not Allowed' 를 받게 된다. 각 라우트가 스스로 401/403 을 낸다.
  const isApi = pathname.startsWith('/api/');

  if (!user) {
    if (isApi || pathname === LOGIN) return response;
    // 만료로 튕긴 경우 로그인 후 원래 보던 화면으로 돌아가게 한다.
    const url = request.nextUrl.clone();
    url.pathname = LOGIN;
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  // 비활성 계정은 profiles_select 정책(is_member 기반)에 걸려 자기 행조차 0행으로 나온다.
  // 이건 오류가 아니라 '승인 대기' 상태다.
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();

  if (!profile) {
    if (isApi) return response;
    return pathname === PENDING ? response : redirect(PENDING);
  }

  // 활성 멤버가 로그인·대기 화면에 오면 홈으로. 대시보드는 아직 없으므로 '/' 도 홈으로 보낸다.
  if (pathname === LOGIN || pathname === PENDING || pathname === '/') return redirect(HOME);

  return response;
}

export const config = {
  matcher: [
    // 제외 대상:
    //   - 정적 파일·이미지·manifest·아이콘
    //   - /invite : 초대받은 사람은 로그인 전에 열어야 한다. 여기서 빼지 않으면 /login 으로 튕긴다
    //   - /api/invite/accept : 로그인 없이 호출되는 유일한 특권 라우트 (토큰으로 스스로 검증한다)
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-\\d+\\.png|apple-icon|invite|api/invite/accept|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
