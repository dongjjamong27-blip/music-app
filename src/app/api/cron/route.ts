import { NextResponse } from 'next/server';
import { duePosts } from '@/lib/store';
import { publishPost } from '@/lib/publish';
import { safeEqual } from '@/lib/crypto';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * 예약 발행 담당.
 * 1분~10분마다 이 주소를 한 번씩 불러주면, 시간이 된 글을 알아서 올립니다.
 * (Vercel Cron, cron-job.org, 또는 서버의 crontab 으로 연결하세요.)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const given = req.headers.get('authorization')?.replace('Bearer ', '') ?? new URL(req.url).searchParams.get('key') ?? '';
    if (!safeEqual(given, secret)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
  }

  const posts = await duePosts();
  for (const post of posts) await publishPost(post);

  return NextResponse.json({ ok: true, published: posts.length, at: new Date().toISOString() });
}
