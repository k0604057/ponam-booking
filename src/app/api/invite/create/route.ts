import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireOwner } from '@/lib/auth/guard';
import { createInviteToken, hashInviteToken, inviteExpiresAt } from '@/lib/auth/invite-token';
import { isValidInviteIdentifier, isValidName, toAuthEmail, toDisplayId } from '@/lib/auth/identity';
import { resolveSiteUrl } from '@/lib/site-url';

const ALLOWED_ROLES = ['reservation', 'settlement', 'cleaning'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function POST(request: Request) {
  // 먼저 세션으로 owner 확인. 그다음에만 service_role 을 쓴다.
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  let body: { name?: string; identifier?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const identifier = (body.identifier ?? '').trim();
  const role = body.role ?? '';

  if (!isValidName(name)) {
    return NextResponse.json({ error: '이름은 1~20자로 입력해주세요.' }, { status: 400 });
  }
  if (!isValidInviteIdentifier(identifier)) {
    return NextResponse.json(
      { error: '아이디는 소문자 영문·숫자·밑줄 3~20자입니다. 이메일도 쓸 수 있습니다.' },
      { status: 400 }
    );
  }
  // owner 는 초대로 만들지 않는다. 필요하면 기존 멤버의 역할을 바꾼다.
  if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
    return NextResponse.json({ error: '역할을 다시 선택해주세요.' }, { status: 400 });
  }

  const email = toAuthEmail(identifier);

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
  }

  const { data: pending } = await supabaseAdmin
    .from('invites')
    .select('id')
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (pending) {
    return NextResponse.json(
      { error: '이 아이디로 보낸 초대가 아직 살아 있습니다. 목록에서 재발급하세요.' },
      { status: 409 }
    );
  }

  const token = createInviteToken();
  const { error } = await supabaseAdmin.from('invites').insert({
    email,
    name,
    role: role as AllowedRole,
    token_hash: hashInviteToken(token),
    expires_at: inviteExpiresAt(),
    created_by: guard.userId,
  });

  if (error) {
    // 토큰은 절대 로그에 남기지 않는다.
    console.error('invite insert 실패:', error.message);
    return NextResponse.json({ error: '초대를 만들지 못했습니다.' }, { status: 500 });
  }

  const site = resolveSiteUrl(await headers());
  return NextResponse.json({
    // 원문 토큰은 이 응답에만 실린다. 다시 볼 수 없다.
    link: `${site}/invite/${token}`,
    loginId: toDisplayId(email),
    name,
  });
}
