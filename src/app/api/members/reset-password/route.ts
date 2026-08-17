import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireOwner } from '@/lib/auth/guard';
import { PASSWORD_MIN } from '@/lib/auth/identity';

/**
 * 아이디 계정은 이메일이 없어서 '비밀번호 찾기' 를 스스로 못 한다.
 * 호스트가 재설정해주지 못하면 비밀번호를 잊은 사람은 영영 못 들어온다.
 */
export async function POST(request: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  let body: { userId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const userId = (body.userId ?? '').trim();
  const password = body.password ?? '';

  if (!userId) return NextResponse.json({ error: '대상을 찾을 수 없습니다.' }, { status: 400 });
  if (password.length < PASSWORD_MIN) {
    return NextResponse.json({ error: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.` }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) {
    // 비밀번호는 로그에 남기지 않는다.
    console.error('비밀번호 재설정 실패:', error.message, 'user:', userId);
    return NextResponse.json({ error: '비밀번호를 바꾸지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
