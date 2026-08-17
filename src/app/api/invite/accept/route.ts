import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashInviteToken } from '@/lib/auth/invite-token';
import { PASSWORD_MIN } from '@/lib/auth/identity';

// Supabase 가 ap-northeast-2(서울)에 있다. 함수도 같은 리전에 둔다.
export const preferredRegion = 'icn1';

// invites 는 owner 만 읽을 수 있게 RLS 로 막혀 있어 클라이언트에서 직접 조회할 수 없다.
// 초대 수락은 반드시 service_role 을 쓰는 이 서버 라우트에서 처리한다.
//
// 이 라우트는 로그인 없이 호출되는 유일한 특권 라우트다.
// 토큰 검증 외에는 아무것도 신뢰하지 않는다 —
// 요청 본문의 role·email 은 무시하고 invites 행에서만 읽는다.

const INVALID = '만료되었거나 이미 사용된 초대입니다. 호스트에게 다시 요청하세요.';

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const token = (body.token ?? '').trim();
  const password = body.password ?? '';

  if (!token) return NextResponse.json({ error: INVALID }, { status: 400 });
  if (password.length < PASSWORD_MIN) {
    return NextResponse.json({ error: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.` }, { status: 400 });
  }

  const { data: invite } = await supabaseAdmin
    .from('invites')
    .select('id, email, name, role')
    .eq('token_hash', hashInviteToken(token))
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  // 만료·사용됨·존재하지 않음을 구분해서 알려주지 않는다. 토큰 존재 여부가 새면 안 된다.
  if (!invite) return NextResponse.json({ error: INVALID }, { status: 400 });

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { name: invite.name },
  });

  if (createError || !created?.user) {
    console.error('초대 수락 — 계정 생성 실패:', createError?.message);
    return NextResponse.json(
      { error: '계정을 만들지 못했습니다. 호스트에게 문의해주세요.' },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  // 계정은 이미 만들어졌다. 이후 단계가 실패하면 사람이 손댈 수 없는 상태가 되므로,
  // 실패 지점을 로그에 남기고 '계정은 생성됨' 을 응답에 담아 호스트가 수동 활성화하게 한다.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role: invite.role, is_active: true, name: invite.name })
    .eq('id', userId);

  if (profileError) {
    console.error('초대 수락 — profiles 활성화 실패:', profileError.message, 'user:', userId);
    return NextResponse.json(
      {
        accountCreated: true,
        error: '계정은 만들어졌지만 권한 설정에 실패했습니다. 호스트에게 활성화를 요청해주세요.',
      },
      { status: 500 }
    );
  }

  const { error: inviteError } = await supabaseAdmin
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (inviteError) {
    // 계정은 정상이다. 초대만 재사용 가능한 상태로 남으므로 호스트가 목록에서 취소하면 된다.
    console.error('초대 수락 — invites 표시 실패:', inviteError.message, 'invite:', invite.id);
  }

  // 클라이언트가 방금 정한 비밀번호로 바로 로그인하도록 로그인용 이메일을 돌려준다.
  return NextResponse.json({ email: invite.email });
}
