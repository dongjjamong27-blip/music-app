import { NextResponse } from 'next/server';
import { metaAuthUrl } from '@/lib/instagram';
import { isLoggedIn } from '@/lib/session';
import { newState, STATE_COOKIE } from '@/lib/oauthState';
import { appUrl } from '@/lib/publish';

export async function GET() {
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL('/', appUrl()));
  if (!process.env.META_APP_ID) {
    return NextResponse.json({ error: 'META_APP_ID 환경변수가 없습니다. README의 인스타 설정을 먼저 해주세요.' }, { status: 400 });
  }

  const state = newState();
  const res = NextResponse.redirect(metaAuthUrl(`${appUrl()}/api/connect/meta/callback`, state));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
