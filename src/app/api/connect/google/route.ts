import { NextResponse } from 'next/server';
import { googleAuthUrl } from '@/lib/youtube';
import { isLoggedIn } from '@/lib/session';
import { newState, STATE_COOKIE } from '@/lib/oauthState';
import { appUrl } from '@/lib/publish';

export async function GET() {
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL('/', appUrl()));
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID 환경변수가 없습니다. README의 유튜브 설정을 먼저 해주세요.' }, { status: 400 });
  }

  const state = newState();
  const res = NextResponse.redirect(googleAuthUrl(`${appUrl()}/api/connect/google/callback`, state));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
