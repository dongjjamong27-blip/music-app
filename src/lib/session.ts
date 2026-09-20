import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { safeEqual } from './crypto';

/**
 * 아주 단순한 잠금장치입니다.
 * 인터넷에 올려두면 남이 내 계정으로 글을 올릴 수 있으니, 비밀번호 한 개로 문을 잠급니다.
 */

const COOKIE = 'one_post_session';

function secret(): string {
  const key = process.env.ENCRYPTION_KEY ?? 'dev-only-secret';
  // 비밀번호를 바꾸면 예전에 로그인해둔 사람은 모두 자동으로 나가지도록,
  // 서명에 지금 비밀번호도 함께 섞습니다. (비밀번호 자체는 저장되지 않습니다)
  const fingerprint = crypto
    .createHash('sha256')
    .update(process.env.APP_PASSWORD ?? '')
    .digest('hex');
  return `${key}:${fingerprint}`;
}

function sign(value: string): string {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function makeToken(): string {
  const issued = String(Date.now());
  return `${issued}.${sign(issued)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [issued, sig] = token.split('.');
  if (!issued || !sig) return false;
  if (!safeEqual(sig, sign(issued))) return false;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - Number(issued) < THIRTY_DAYS;
}

export async function isLoggedIn(): Promise<boolean> {
  // 비밀번호를 정하지 않았으면 (집에서 혼자 테스트) 문을 열어둡니다.
  if (!process.env.APP_PASSWORD) return true;
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
