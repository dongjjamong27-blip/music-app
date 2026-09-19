import { NextResponse } from 'next/server';
import { createPost, listPosts, type Channel, type PostTarget } from '@/lib/store';
import { publishPost } from '@/lib/publish';
import { isLoggedIn } from '@/lib/session';

export const runtime = 'nodejs';
// Vercel 무료(Hobby) 플랜은 한 번에 최대 60초까지만 일할 수 있습니다.
export const maxDuration = 60;

const ALL: Channel[] = ['youtube', 'instagram', 'naver', 'hellotalk'];

export async function GET() {
  if (!(await isLoggedIn())) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return NextResponse.json({ posts: await listPosts() });
}

export async function POST(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = (await req.json()) as {
    title?: string; body?: string; tags?: string[]; channels?: Channel[];
    mediaPath?: string; mediaType?: 'image' | 'video'; scheduledAt?: number | null;
  };

  const title = (body.title ?? '').trim();
  const text = (body.body ?? '').trim();
  const channels = (body.channels ?? []).filter((c) => ALL.includes(c));

  if (!title && !text) return NextResponse.json({ error: '제목이나 내용을 적어주세요.' }, { status: 400 });
  if (channels.length === 0) return NextResponse.json({ error: '올릴 곳을 한 군데 이상 골라주세요.' }, { status: 400 });

  const scheduled = body.scheduledAt && body.scheduledAt > Date.now() ? body.scheduledAt : undefined;

  const targets: PostTarget[] = channels.map((channel) => ({
    channel,
    status: channel === 'naver' || channel === 'hellotalk' ? 'manual' : scheduled ? 'scheduled' : 'draft',
  }));

  try {
    const post = await createPost({
      title,
      body: text,
      tags: (body.tags ?? []).map((t) => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 30),
      mediaPath: body.mediaPath,
      mediaType: body.mediaType,
      scheduledAt: scheduled,
      targets,
    });

    // 예약이 아니면 지금 바로 올립니다.
    if (!scheduled) await publishPost(post);

    return NextResponse.json({ ok: true, postId: post.id, scheduled: Boolean(scheduled) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '글을 저장하지 못했습니다.' },
      { status: 500 },
    );
  }
}
