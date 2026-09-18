import { NextResponse } from 'next/server';
import { makeDraft, isResearchEnabled, type DraftOptions } from '@/lib/research';
import { isLoggedIn } from '@/lib/session';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ enabled: isResearchEnabled() });
}

export async function POST(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = (await req.json()) as Partial<DraftOptions>;
  const topic = (body.topic ?? '').trim();
  if (!topic) return NextResponse.json({ error: '어떤 주제로 쓸지 적어주세요.' }, { status: 400 });
  if (topic.length > 300) return NextResponse.json({ error: '주제가 너무 깁니다. (300자 이내)' }, { status: 400 });

  try {
    const draft = await makeDraft({
      topic,
      tone: body.tone,
      length: body.length,
      channelHint: body.channelHint,
    });
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '글을 만드는 데 실패했습니다.' },
      { status: 500 },
    );
  }
}
