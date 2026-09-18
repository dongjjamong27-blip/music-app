import { NextResponse } from 'next/server';
import { saveAccount } from '@/lib/store';
import { isLoggedIn } from '@/lib/session';

/** 네이버 블로그 / 헬로톡은 로그인이 아니라 "내 아이디만 기억"해두면 됩니다. */
export async function POST(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { channel, blogId, nickname } = (await req.json()) as {
    channel?: 'naver' | 'hellotalk'; blogId?: string; nickname?: string;
  };
  if (channel !== 'naver' && channel !== 'hellotalk') {
    return NextResponse.json({ error: '네이버 또는 헬로톡만 등록할 수 있습니다.' }, { status: 400 });
  }

  if (channel === 'naver') {
    const id = (blogId ?? '').trim();
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) {
      return NextResponse.json({ error: '네이버 블로그 아이디를 정확히 입력해주세요. (blog.naver.com/ 뒤에 오는 부분)' }, { status: 400 });
    }
    await saveAccount({ channel: 'naver', name: `blog.naver.com/${id}`, accessToken: 'manual', extra: { blogId: id } });
  } else {
    await saveAccount({ channel: 'hellotalk', name: (nickname ?? '내 헬로톡').trim() || '내 헬로톡', accessToken: 'manual' });
  }
  return NextResponse.json({ ok: true });
}
