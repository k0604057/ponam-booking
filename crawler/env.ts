// ~/.ponam.env 로드 + 시크릿 마스킹.
// scrape33m2.ts 는 세션 경로를, upsert.ts 는 Supabase 키를 필요로 하므로
// run.ts 에 두면 순환 import 가 된다. 그래서 공용 모듈로 분리했다.

import { config } from 'dotenv';
import { homedir } from 'node:os';
import { join } from 'node:path';

config({ path: join(homedir(), '.ponam.env') });

export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  sessionPath: process.env.M33_SESSION_PATH ?? '',
  loginId: process.env.M33_LOGIN_ID ?? '',
  loginPw: process.env.M33_LOGIN_PW ?? '',
};

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'M33_SESSION_PATH'] as const;

/** 필수 키가 없으면 즉시 종료시키기 위해 던진다. */
export function requireEnv(): void {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`~/.ponam.env 에 필수 키가 없습니다: ${missing.join(', ')}`);
  }
}

/**
 * sync_runs.error_message 는 owner/reservation 이 조회할 수 있다.
 * 토큰·비밀번호가 새지 않도록 기록 전에 반드시 통과시킨다.
 */
export function maskSecrets(text: string): string {
  let out = text;
  // 값이 짧으면(예: 빈 문자열) 무차별 치환이 되므로 길이 하한을 둔다.
  for (const secret of [env.serviceRoleKey, env.loginPw, env.loginId]) {
    if (secret && secret.length >= 4) out = out.split(secret).join('***');
  }
  // 값이 바뀌었거나 다른 경로로 흘러든 secret 키도 패턴으로 막는다.
  out = out.replace(/sb_secret_[A-Za-z0-9_-]+/g, '***');
  out = out.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***');
  return out;
}

/** sync_runs.error_message 는 2000자 제한(check 제약)이 걸려 있다. */
export function forErrorMessage(text: string): string {
  const masked = maskSecrets(text);
  return masked.length <= 2000 ? masked : masked.slice(0, 1997) + '...';
}
