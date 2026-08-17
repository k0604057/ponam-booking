import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/**
 * 초대 링크는 그 자체가 자격증명이다.
 *   - 32바이트 랜덤. Math.random() 은 쓰지 않는다
 *   - DB 에는 SHA-256 해시만 저장한다. 원문은 생성 응답에 딱 한 번만 실린다
 *   - 로그·에러 메시지에 남기지 않는다 (sync_runs 마스킹과 같은 원칙)
 */
export const INVITE_TTL_HOURS = 72;

export function createInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function inviteExpiresAt(from: Date = new Date()): string {
  return new Date(from.getTime() + INVITE_TTL_HOURS * 3600_000).toISOString();
}
