'use client';

/**
 * 휴대폰(브라우저) 안에 저장하는 작은 보관함입니다.
 *
 * 왜 서버가 아니라 휴대폰에 저장하나요?
 *  - Vercel 같은 곳은 서버에 파일을 쓸 수 없어요. (읽기 전용)
 *  - 네이버·헬로톡은 서버가 할 일이 전혀 없습니다. 복사해서 앱을 열어줄 뿐이니까요.
 *  - 그래서 휴대폰에 저장하는 게 더 빠르고, 추가 가입도 필요 없습니다.
 *
 * ⚠️ 브라우저 데이터를 지우면 함께 사라집니다. (계정 비밀번호 같은 건 저장하지 않아요)
 */

const KEY_ACCOUNTS = 'one_post_local_accounts';
const KEY_GOOGLE = 'one_post_google_client_id';
const KEY_POSTS = 'one_post_local_posts';
const MAX_POSTS = 100;

export type LocalChannel = 'naver' | 'hellotalk';

export type LocalAccounts = {
  naver?: { blogId: string };
  hellotalk?: { nickname: string };
};

export type LocalPost = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  channels: LocalChannel[];
  createdAt: number;
};

/** localStorage는 시크릿 모드 등에서 막힐 수 있어서 항상 감싸서 씁니다. */
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // 저장 공간이 꽉 찼거나 브라우저가 막은 경우
  }
}

/* ---------------- 연결해둔 곳 ---------------- */

export function getLocalAccounts(): LocalAccounts {
  return read<LocalAccounts>(KEY_ACCOUNTS, {});
}

export function saveNaver(blogId: string): boolean {
  const accounts = getLocalAccounts();
  accounts.naver = { blogId: blogId.trim() };
  return write(KEY_ACCOUNTS, accounts);
}

export function saveHellotalk(nickname: string): boolean {
  const accounts = getLocalAccounts();
  accounts.hellotalk = { nickname: nickname.trim() || '내 헬로톡' };
  return write(KEY_ACCOUNTS, accounts);
}

export function removeLocal(channel: LocalChannel): boolean {
  const accounts = getLocalAccounts();
  delete accounts[channel];
  return write(KEY_ACCOUNTS, accounts);
}

/* ---------------- 유튜브 출입증 번호 ---------------- */

/**
 * 구글에서 받은 "클라이언트 ID" 입니다.
 *
 * 원래는 서버 환경변수(Vercel)에 넣어야 하는데, 휴대폰으로 Vercel 설정을
 * 만지는 게 너무 어려워서 휴대폰에 저장할 수 있게 했습니다.
 * 이 값은 비밀번호가 아닙니다. 웹사이트 주소처럼 공개되는 값이라
 * 휴대폰에 두어도 안전합니다. (비밀번호인 "시크릿"은 이 앱에서 쓰지 않습니다)
 */
export function getGoogleClientId(): string {
  return read<string>(KEY_GOOGLE, '');
}

export function saveGoogleClientId(id: string): boolean {
  return write(KEY_GOOGLE, cleanClientId(id));
}

export function clearGoogleClientId(): boolean {
  return write(KEY_GOOGLE, '');
}

/** 앞뒤 공백이나 실수로 같이 복사된 글자를 정리합니다. */
export function cleanClientId(input: string): string {
  const found = input.match(/[0-9A-Za-z-_.]+\.apps\.googleusercontent\.com/);
  return (found ? found[0] : input).trim();
}

/* ---------------- 보낸 글 기록 ---------------- */

export function getLocalPosts(): LocalPost[] {
  return read<LocalPost[]>(KEY_POSTS, []);
}

export function addLocalPost(post: Omit<LocalPost, 'id' | 'createdAt'>): LocalPost {
  const full: LocalPost = {
    ...post,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const posts = [full, ...getLocalPosts()].slice(0, MAX_POSTS);
  write(KEY_POSTS, posts);
  return full;
}

export function clearLocalPosts(): boolean {
  return write(KEY_POSTS, []);
}
