import Anthropic from '@anthropic-ai/sdk';

/**
 * "주제만 정하면 알아서 써주는" 기능입니다.
 *
 * 동작 순서:
 *  1) 주제를 받아서 Claude가 인터넷을 직접 검색합니다. (web_search)
 *  2) 괜찮아 보이는 주소는 실제로 열어서 내용이 맞는지 확인합니다. (web_fetch)
 *  3) 확인한 내용을 바탕으로 제목 / 본문 / 해시태그 / 참고 주소를 만들어 줍니다.
 */

export type Draft = {
  title: string;
  body: string;
  tags: string[];
  sources: { title: string; url: string }[];
};

export type DraftOptions = {
  topic: string;
  tone?: '친근하게' | '정보전달' | '감성적으로' | '짧고굵게';
  length?: '짧게' | '보통' | '길게';
  channelHint?: string; // 예: "유튜브 설명란, 인스타 캡션, 네이버 블로그"
};

const LENGTH_GUIDE: Record<string, string> = {
  짧게: '본문 300자 내외',
  보통: '본문 700자 내외',
  길게: '본문 1500자 내외',
};

export function isResearchEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function makeDraft(opts: DraftOptions): Promise<Draft> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 없습니다. README의 "자동 글쓰기 설정"을 먼저 해주세요.');
  }

  const client = new Anthropic();

  const system = [
    '당신은 한국어 SNS/블로그 글을 쓰는 작가입니다.',
    '반드시 웹 검색으로 최신 정보를 확인한 뒤에 글을 쓰세요.',
    '검색으로 확인되지 않은 숫자, 날짜, 인용문은 절대 지어내지 마세요.',
    '참고한 페이지는 실제로 열어서(web_fetch) 내용이 맞는지 확인하고, 열리지 않는 주소는 버리세요.',
    '마지막 답변은 아래 JSON 형식 하나만 출력하세요. 설명이나 인사말은 쓰지 마세요.',
    '{"title": "제목", "body": "본문", "tags": ["태그1","태그2"], "sources": [{"title":"자료제목","url":"https://..."}]}',
  ].join('\n');

  const prompt = [
    `주제: ${opts.topic}`,
    `말투: ${opts.tone ?? '친근하게'}`,
    `분량: ${LENGTH_GUIDE[opts.length ?? '보통']}`,
    opts.channelHint ? `올릴 곳: ${opts.channelHint}` : '',
    '',
    '요구사항:',
    '- 제목은 40자 이내, 사람들이 클릭하고 싶게.',
    '- 본문은 문단을 나누고, 읽기 쉽게 써주세요. 이모지는 적당히.',
    '- 해시태그는 5~10개, # 없이 단어만.',
    '- sources 에는 실제로 확인한 주소만 3~5개 넣어주세요.',
  ]
    .filter(Boolean)
    .join('\n');

  // 검색이 여러 번 돌기 때문에 시간이 걸립니다 → 스트리밍으로 받아서 타임아웃을 피합니다.
  // 검색 횟수와 깊이는 Vercel 무료 플랜의 60초 안에 끝나도록 맞춰놨습니다.
  const stream = client.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system,
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
      { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 4, max_content_tokens: 8000 },
    ],
    messages: [{ role: 'user', content: prompt }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') {
    throw new Error('이 주제로는 글을 만들 수 없습니다. 주제를 조금 바꿔서 다시 시도해주세요.');
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return parseDraft(text, opts.topic);
}

/** Claude가 준 답에서 JSON만 꺼내 읽습니다. (앞뒤에 설명이 붙어도 견디도록) */
export function parseDraft(text: string, fallbackTitle: string): Draft {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);

  try {
    const raw = JSON.parse(candidate) as Partial<Draft>;
    return {
      title: (raw.title ?? fallbackTitle).toString().trim(),
      body: (raw.body ?? '').toString().trim(),
      tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean) : [],
      sources: Array.isArray(raw.sources)
        ? raw.sources
            .filter((s) => s && typeof s === 'object' && typeof s.url === 'string' && /^https?:\/\//.test(s.url))
            .map((s) => ({ title: String(s.title ?? s.url), url: s.url }))
        : [],
    };
  } catch {
    // JSON이 깨졌으면 최소한 글이라도 살립니다.
    return { title: fallbackTitle, body: text, tags: [], sources: [] };
  }
}
