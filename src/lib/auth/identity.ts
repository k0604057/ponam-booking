// 아이디 로그인 — 내부 이메일로 변환.
//
// Supabase Auth 는 비밀번호 로그인에 이메일 또는 전화번호만 받는다. 아이디는 못 쓴다.
// 그래서 아이디를 내부 이메일로 바꿔서 넘긴다.
//
// 변환은 결정적(deterministic)이라 조회가 필요 없다. 아이디로 이메일을 찾으려면
// 남의 profiles 를 읽어야 하는데 RLS 가 막고 있다. 규칙으로 만들면 그 문제가 사라진다.
//
// 이 도메인으로는 메일을 보내지 않는다. 인증 시스템 내부 식별자일 뿐이다.
// (Supabase 가 이 형식을 받는 것은 createUser·로그인·트리거까지 실제로 확인했다)

export const INTERNAL_EMAIL_DOMAIN = 'ponam.local';

/** 아이디: 소문자 영문·숫자·언더스코어 3~20자. 한글은 받지 않는다 — 폰에서 한영 전환이 불편하다. */
export const LOGIN_ID_PATTERN = /^[a-z0-9_]{3,20}$/;

export const NAME_MAX = 20;
export const PASSWORD_MIN = 10;

/** 입력이 이메일이면 그대로, 아니면 내부 도메인을 붙인다. */
export function toAuthEmail(input: string): string {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${INTERNAL_EMAIL_DOMAIN}`;
}

/** 표시용 — 내부 이메일이면 아이디만 보여준다. */
export function toDisplayId(email: string | null | undefined): string {
  if (!email) return '';
  return email.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`) ? email.split('@')[0] : email;
}

export function isValidLoginId(value: string): boolean {
  return LOGIN_ID_PATTERN.test(value.trim().toLowerCase());
}

/** 초대 입력칸은 아이디 또는 이메일을 받는다. */
export function isValidInviteIdentifier(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return isValidLoginId(v);
}

/** 이름: 1~20자, 공백만 있는 값은 거부. */
export function isValidName(value: string): boolean {
  const v = value.trim();
  return v.length >= 1 && v.length <= NAME_MAX;
}

/** 전화로 불러줄 수 있어야 한다. 헷갈리는 글자를 피해 숫자만 쓴다. */
export function generateTempPassword(): string {
  const digits = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((n) => String(n % 10))
    .join('');
  return `ponam-${digits}`;
}
