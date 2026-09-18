import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeMetaCode, findInstagramAccount } from '@/lib/instagram';
import { saveAccount } from '@/lib/store';
import { STATE_COOKIE, stateMatches } from '@/lib/oauthState';
import { appUrl } from '@/lib/publish';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const base = appUrl();
  const fail = (msg: string) => NextResponse.redirect(`${base}/connect?error=${encodeURIComponent(msg)}`);

  if (params.get('error')) return fail(`인스타 연결이 취소되었습니다: ${params.get('error_description') ?? params.get('error')}`);

  const jar = await cookies();
  if (!stateMatches(params.get('state') ?? undefined, jar.get(STATE_COOKIE)?.value)) {
    return fail('연결 확인값이 맞지 않습니다. 다시 시도해주세요.');
  }

  const code = params.get('code');
  if (!code) return fail('인스타에서 인증 코드를 받지 못했습니다.');

  try {
    const token = await exchangeMetaCode(code, `${base}/api/connect/meta/callback`);
    const ig = await findInstagramAccount(token);
    await saveAccount({
      channel: 'instagram',
      name: `@${ig.username}`,
      accessToken: token,
      expiresAt: Date.now() + 55 * 24 * 60 * 60 * 1000, // 약 60일짜리 토큰
      extra: { igUserId: ig.igUserId },
    });
    const res = NextResponse.redirect(`${base}/connect?ok=instagram`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : '인스타 연결에 실패했습니다.');
  }
}
