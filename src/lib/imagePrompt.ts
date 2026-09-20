/**
 * 그림(이미지)을 만들어주는 AI에게 건넬 "주문 문장"을 만듭니다.
 *
 * 이 앱은 그림을 직접 만들지 못합니다.
 * 대신 제미니 같은 무료 서비스에 그대로 붙여넣을 문장을 만들어주고,
 * 버튼 한 번으로 복사 + 그 사이트 열기까지 해줍니다. (네이버 보내기와 같은 방식)
 */

export type Scene = {
  id: string;
  label: string;      // 버튼에 보일 이름
  hint: string;       // 어떤 그림인지 한 줄 설명
  build: (subject: string) => string;
};

/** 어떤 그림이든 끝에 붙는 공통 주문 (화풍·비율) */
const STYLE = '따뜻한 색감의 감성적인 일러스트로, 가로로 긴 그림(16:9)으로 그려줘. 글자는 넣지 말아줘.';

export const SCENES: Scene[] = [
  {
    id: 'main',
    label: '대표 이미지',
    hint: '글 맨 위에 넣을 그림',
    build: (s) => `${s}의 대표적인 풍경을 그려줘. 그곳에 가면 제일 먼저 보이는 장면으로. ${STYLE}`,
  },
  {
    id: 'close',
    label: '가까이서',
    hint: '분위기를 살린 장면',
    build: (s) => `${s}를 가까이에서 본 장면을 그려줘. 사람의 시선 높이에서, 그곳의 공기가 느껴지도록. ${STYLE}`,
  },
  {
    id: 'night',
    label: '밤 풍경',
    hint: '등불이 켜진 저녁',
    build: (s) => `밤이 된 ${s}를 그려줘. 등불과 창문에서 나오는 따뜻한 불빛이 보이는 저녁 풍경으로. ${STYLE}`,
  },
  {
    id: 'winter',
    label: '겨울 풍경',
    hint: '눈 내리는 날',
    build: (s) => `눈이 내리는 날의 ${s}를 그려줘. 하얗게 쌓인 눈과 조용한 분위기로. ${STYLE}`,
  },
];

/** 제목에서 그림의 주인공이 될 말만 뽑아냅니다. */
export function subjectFromTitle(title: string): string {
  return title
    .replace(/\(.*?\)|\[.*?\]/g, ' ')          // 괄호 안은 버립니다
    .replace(/[?!~♨️🏆·|]/g, ' ')
    .replace(/\d+\s*(위|편|년|회|대)\b/g, ' ')  // "1위", "2025년" 같은 건 그림과 무관
    .replace(/총정리|정리|소개|최신|전체|순위|왜|일까/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 그림 만드는 곳 바로가기 */
export const IMAGE_SITES = [
  { id: 'gemini', name: '제미니', note: '무료 · 구글 계정', url: 'https://gemini.google.com/app' },
  { id: 'chatgpt', name: 'ChatGPT', note: '무료 횟수 제한', url: 'https://chatgpt.com/' },
  { id: 'bing', name: 'Bing 이미지', note: '무료 · MS 계정', url: 'https://www.bing.com/images/create' },
];
