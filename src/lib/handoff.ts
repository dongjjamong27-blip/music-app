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

export type HandoffPlan = {
  channel: 'naver' | 'hellotalk';
  label: string;
  text: string;       // 복사되어 붙여넣을 내용
  appUrl: string;     // 휴대폰에서 앱을 여는 주소
  webUrl: string;     // 앱이 없을 때 열리는 웹 주소
  hint: string;       // 화면에 보여줄 안내 문장
};

export function buildText(title: string, body: string, tags: string[]): string {
  const tagLine = tags.length ? `\n\n${tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}` : '';
  return `${title}\n\n${body}${tagLine}`.trim();
}

export function naverPlan(title: string, body: string, tags: string[], blogId?: string): HandoffPlan {
  const writeWeb = blogId
    ? `https://blog.naver.com/${blogId}?Redirect=Write`
    : 'https://m.blog.naver.com/GoBlogWrite.naver';
  return {
    channel: 'naver',
    label: '네이버 블로그',
    text: buildText(title, body, tags),
    // 네이버 앱 스킴. 앱이 없으면 아래 webUrl 로 자동 이동합니다.
    appUrl: `naversearchapp://inappbrowser?url=${encodeURIComponent(writeWeb)}&version=6`,
    webUrl: writeWeb,
    hint: '내용이 복사됐어요. 네이버 블로그 글쓰기 화면이 열리면 길게 눌러 "붙여넣기" 하고 [발행]만 누르세요.',
  };
}

export function hellotalkPlan(title: string, body: string, tags: string[]): HandoffPlan {
  return {
    channel: 'hellotalk',
    label: '헬로톡',
    text: buildText(title, body, tags),
    appUrl: 'hellotalk://moment',       // 헬로톡 앱의 모멘트(게시물) 화면
    webUrl: 'https://www.hellotalk.com/',
    hint: '내용이 복사됐어요. 헬로톡이 열리면 모멘트 작성창에 붙여넣고 올리면 끝!',
  };
}
