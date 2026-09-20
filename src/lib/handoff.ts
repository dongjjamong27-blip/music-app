/**
 * 네이버 블로그 / 헬로톡 "반자동 보내기"
 *
 * 왜 반자동인가요?
 *  - 네이버 블로그: 예전엔 자동 글쓰기 API가 있었지만 지금은 없어졌습니다.
 *  - 헬로톡: 아예 외부에서 글을 올리는 공식 방법(API)이 없습니다.
 *  - 몰래 자동화(매크로)하면 계정이 정지될 수 있어서 쓰지 않습니다.
 *
 * 그래서 이렇게 합니다:
 *  글 내용을 자동으로 복사 → 앱을 바로 열어줌 → 붙여넣기 한 번 (또는 휴대폰 공유창에서 앱 선택)
 */

/** 헬로톡 모멘트는 한 번에 2000자까지만 올라갑니다. */
export const HELLOTALK_LIMIT = 2000;

export type HandoffPlan = {
  channel: 'naver' | 'hellotalk';
  label: string;
  text: string;       // 복사되어 붙여넣을 내용 (전체)
  parts: string[];    // 글자수 제한 때문에 나눈 조각들 (안 나뉘면 1개)
  limit?: number;     // 이 채널의 글자수 제한 (없으면 제한 없음)
  appUrl: string;     // 휴대폰에서 앱을 여는 주소
  webUrl: string;     // 앱이 없을 때 열리는 웹 주소
  hint: string;       // 화면에 보여줄 안내 문장
};

export function buildText(title: string, body: string, tags: string[]): string {
  const tagLine = tags.length ? `\n\n${tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}` : '';
  return `${title}\n\n${body}${tagLine}`.trim();
}

/**
 * 글이 너무 길면 여러 개로 잘라줍니다.
 * 문장이 중간에서 끊기지 않도록 빈 줄 → 줄바꿈 → 문장 끝 → 띄어쓰기 순서로 자를 곳을 찾습니다.
 */
function findCut(text: string, room: number): number {
  const head = text.slice(0, room);
  for (const sep of ['\n\n', '\n', '다. ', '요. ', '. ', '! ', '? ', ' ']) {
    const at = head.lastIndexOf(sep);
    // 너무 앞에서 자르면 조각이 지나치게 짧아지니 절반은 넘긴 자리만 씁니다.
    if (at > room * 0.5) return at + sep.length;
  }
  return room; // 자를 곳을 못 찾으면 그냥 여기서 자릅니다.
}

export function splitText(text: string, limit: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= limit) return [trimmed];

  // 끝에 붙일 번호표("(1/3)") 자리를 미리 비워둡니다.
  const room = Math.max(50, limit - 12);
  const chunks: string[] = [];
  let rest = trimmed;

  while (rest.length > room) {
    const cut = findCut(rest, room);
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);

  return chunks.map((c, i) => `${c}\n\n(${i + 1}/${chunks.length})`);
}

export function naverPlan(title: string, body: string, tags: string[], blogId?: string): HandoffPlan {
  const writeWeb = blogId
    ? `https://blog.naver.com/${blogId}?Redirect=Write`
    : 'https://m.blog.naver.com/GoBlogWrite.naver';
  const text = buildText(title, body, tags);
  return {
    channel: 'naver',
    label: '네이버 블로그',
    text,
    parts: [text],
    // 네이버 앱 스킴. 앱이 없으면 아래 webUrl 로 자동 이동합니다.
    appUrl: `naversearchapp://inappbrowser?url=${encodeURIComponent(writeWeb)}&version=6`,
    webUrl: writeWeb,
    hint: '내용이 복사됐어요. 네이버 블로그 글쓰기 화면이 열리면 길게 눌러 "붙여넣기" 하고 [발행]만 누르세요.',
  };
}

export function hellotalkPlan(title: string, body: string, tags: string[]): HandoffPlan {
  const text = buildText(title, body, tags);
  const parts = splitText(text, HELLOTALK_LIMIT);
  return {
    channel: 'hellotalk',
    label: '헬로톡',
    text,
    parts: parts.length ? parts : [''],
    limit: HELLOTALK_LIMIT,
    appUrl: 'hellotalk://moment',       // 헬로톡 앱의 모멘트(게시물) 화면
    webUrl: 'https://www.hellotalk.com/',
    hint: parts.length > 1
      ? `글이 길어서 ${parts.length}개로 나눴어요. 1번째가 복사됐습니다. 하나 올리고 다음 버튼을 누르세요.`
      : '내용이 복사됐어요. 헬로톡이 열리면 모멘트 작성창에 붙여넣고 올리면 끝!',
  };
}
