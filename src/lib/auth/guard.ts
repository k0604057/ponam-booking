import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 특권 라우트는 **쿠키 세션으로 owner 여부를 먼저 확인**하고 그다음에 service_role 을 쓴다.
 * 세션 확인 없이 service_role 을 쓰면 누구나 멤버를 만들 수 있다.
 */
export async function requireOwner(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  }

  // 비활성 계정은 profiles 조회 자체가 0행이라 여기서 걸린다.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (profile?.role !== 'owner') {
    return { ok: false, response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }) };
  }

  return { ok: true, userId: user.id };
}
