import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleCode, fetchChannelName } from '@/lib/youtube';
import { saveAccount } from '@/lib/store';
import { STATE_COOKIE, stateMatches } from '@/lib/oauthState';
import { appUrl } from '@/lib/publish';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const base = appUrl();

  const fail = (msg: string) => NextResponse.redirect(`${base}/connect?error=${encodeURIComponent(msg)}`);

  if (params.get('error')) return fail(`구글 연결이 취소되었습니다: ${params.get('error')}`);

  const jar = await cookies();
  if (!stateMatches(params.get('state') ?? undefined, jar.get(STATE_COOKIE)?.value)) {
    return fail('연결 확인값이 맞지 않습니다. 다시 시도해주세요.');
  }

  const code = params.get('code');
  if (!code) return fail('구글에서 인증 코드를 받지 못했습니다.');

  try {
    const token = await exchangeGoogleCode(code, `${base}/api/connect/google/callback`);
    const name = await fetchChannelName(token.access_token!);
    await saveAccount({
      channel: 'youtube',
      name,
      accessToken: token.access_token!,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
    });
    const res = NextResponse.redirect(`${base}/connect?ok=youtube`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : '구글 연결에 실패했습니다.');
  }
}
