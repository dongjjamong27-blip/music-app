import { NextResponse } from 'next/server';
import { makeToken, SESSION_COOKIE } from '@/lib/session';
import { safeEqual } from '@/lib/crypto';

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.APP_PASSWORD;

  if (!expected) return NextResponse.json({ ok: true, note: '비밀번호가 설정되어 있지 않습니다.' });
  if (!password || !safeEqual(password, expected)) {
    return NextResponse.json({ ok: false, error: '비밀번호가 맞지 않습니다.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
