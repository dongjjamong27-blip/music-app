import crypto from 'node:crypto';
import { safeEqual } from './crypto';

/** 로그인 도중에 남이 끼어드는 걸(CSRF) 막기 위한 임시 표식입니다. */
export const STATE_COOKIE = 'one_post_oauth_state';

export function newState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function stateMatches(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return safeEqual(a, b);
}
