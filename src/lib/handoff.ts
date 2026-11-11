/**
 * 네이버 블로그 / 헬로톡 "반자동 보내기"
 *
 * 왜 반자동인가요? (2026-11 다시 확인했습니다)
 *  - 네이버 블로그 글쓰기 API: 없습니다.
 *  - 네이버 블로그 '메일로 글쓰기': 주인 블로그 설정에 그런 항목이 없습니다. (직접 확인)
 *  - 헬로톡: 외부에서 글을 올리는 공식 방법이 아예 없습니다.
 *  - 몰래 자동화(매크로)하면 계정이 정지됩니다. 50편 넘게 쌓인 블로그를 걸 일이 아닙니다.
 *
 * 그래서 이렇게 합니다:
 *  내용을 '네이버 글쓰기 화면 순서대로' 나눠서 복사해주고, 앱을 열어줍니다.
 *
 * 왜 나눠서 복사하나요?
 *  네이버 블로그는 '제목 칸'과 '본문 칸'이 따로 있습니다.
 *  예전처럼 제목+본문을 한 덩어리로 복사해주면, 붙여넣은 뒤에
 *  주인이 제목을 손으로 잘라내야 했습니다. 매번 그러는 건 번거롭습니다.
 *
 * 완전 자동 대신 '예약 발행'
 *  네이버 블로그에는 예약 발행 기능이 있습니다.
 *  한 번에 여러 편을 올려두고 날짜를 걸어두면, 그 뒤로는 저절로 올라갑니다.
 *  이게 지금 할 수 있는 가장 자동에 가까운 방법입니다.
 */

/** 헬로톡 모멘트는 한 번에 2000자까지만 올라갑니다. */
export const HELLOTALK_LIMIT = 2000;

/** 네이버 글쓰기 화면에서 한 칸씩 채워 넣을 순서 */
export type HandoffStep = {
  key: string;
  label: string;     // 버튼에 보일 이름 (예: "제목")
  text: string;      // 복사할 내용 (복사할 게 없는 단계면 빈 문자열)
  hint: string;      // 이 단계에서 뭘 하면 되는지 한 줄 설명
  copyable: boolean; // false 면 '하고 나서 체크만' 하는 단계 (예: 사진 올리기)
};

export type HandoffPlan = {
  channel: 'naver' | 'hellotalk';
  label: string;
  text: string;       // 복사되어 붙여넣을 내용 (전체)
  parts: string[];    // 글자수 제한 때문에 나눈 조각들 (안 나뉘면 1개)
  limit?: number;     // 이 채널의 글자수 제한 (없으면 제한 없음)
  appUrl: string;     // 휴대폰에서 앱을 여는 주소
  webUrl: string;     // 앱이 없을 때 열리는 웹 주소
  hint: string;       // 화면에 보여줄 안내 문장
  steps?: HandoffStep[]; // 있으면 단계별로 하나씩 복사합니다 (네이버)
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

/** 해시태그 줄만 따로 만듭니다. 네이버는 본문 맨 아래에 따로 넣는 게 깔끔합니다. */
export function tagLine(tags: string[]): string {
  return tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ');
}

/**
 * 네이버 글쓰기 화면을 채우는 순서입니다.
 * 사진을 본문보다 먼저 올리는 이유: 나중에 올리면 사진이 글 맨 끝에 몰려서
 * 중간중간 끼워 넣으려면 다시 옮겨야 합니다.
 */
export function naverSteps(title: string, body: string, tags: string[]): HandoffStep[] {
  const tagsText = tagLine(tags);
  const steps: HandoffStep[] = [
    {
      key: 'title',
      label: '제목',
      text: title.trim(),
      hint: '맨 위 제목 칸에 붙여넣으세요.',
      copyable: true,
    },
    {
      key: 'photo',
      label: '사진 올리기',
      text: '',
      hint: '사진 버튼을 눌러 카드 그림을 한 번에 고르세요. 다 올렸으면 체크하세요.',
      copyable: false,
    },
    {
      key: 'body',
      label: '본문',
      text: body.trim(),
      hint: '본문 칸에 붙여넣고, 사진 사이사이로 옮겨주세요.',
      copyable: true,
    },
  ];
  if (tagsText) {
    steps.push({
      key: 'tags',
      label: '해시태그',
      text: tagsText,
      hint: '본문 맨 아래 또는 태그 칸에 붙여넣으세요.',
      copyable: true,
    });
  }
  steps.push({
    key: 'publish',
    label: '발행 (또는 예약)',
    text: '',
    hint: '바로 올리려면 [발행]. 나중에 올리려면 [예약]을 눌러 날짜와 시간을 정하세요.',
    copyable: false,
  });
  return steps;
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
    hint: '네이버 글쓰기 화면을 연 다음, 아래 순서대로 하나씩 복사해서 붙여넣으세요.',
    steps: naverSteps(title, body, tags),
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
