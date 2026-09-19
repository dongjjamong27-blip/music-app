import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { encrypt, decrypt } from './crypto';

/**
 * 아주 작은 데이터베이스입니다.
 * 진짜 DB 대신 data/db.json 파일 하나에 전부 저장합니다. (혼자 쓰는 앱이라 이걸로 충분)
 */

export type Channel = 'youtube' | 'instagram' | 'naver' | 'hellotalk';

export type Account = {
  channel: Channel;
  name: string;            // 화면에 보여줄 계정 이름
  accessToken: string;     // 암호화되어 저장됨
  refreshToken?: string;   // 암호화되어 저장됨
  expiresAt?: number;      // 토큰 만료 시각(ms)
  extra?: Record<string, string>; // 인스타 ig_user_id, 네이버 블로그 아이디 등
  connectedAt: number;
};

export type PostStatus = 'draft' | 'scheduled' | 'sending' | 'done' | 'failed' | 'manual';

export type PostTarget = {
  channel: Channel;
  status: PostStatus;
  message?: string;  // 결과 메시지 또는 에러 내용
  url?: string;      // 올라간 글/영상 주소
};

export type Post = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  mediaPath?: string;     // /uploads/xxx.jpg 같은 공개 경로
  mediaType?: 'image' | 'video';
  scheduledAt?: number;   // 예약 시간(ms). 없으면 바로 발행
  createdAt: number;
  targets: PostTarget[];
};

type DB = { accounts: Account[]; posts: Post[] };

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const EMPTY: DB = { accounts: [], posts: [] };

async function read(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DB>;
    return { accounts: parsed.accounts ?? [], posts: parsed.posts ?? [] };
  } catch {
    return { ...EMPTY };
  }
}

// 동시에 두 군데서 파일을 쓰면 내용이 깨지므로, 쓰기는 한 줄로 세워서 처리합니다.
let writeQueue: Promise<unknown> = Promise.resolve();

/** 이 서버에 파일을 쓸 수 없을 때(Vercel 등) 나오는 안내입니다. */
export const READ_ONLY_MESSAGE =
  '이 서버에는 저장할 수 없습니다(읽기 전용). 네이버·헬로톡은 휴대폰에 저장되니 그대로 쓰시면 되고, ' +
  '유튜브·인스타를 쓰시려면 저장소를 따로 붙여야 합니다.';

function isReadOnly(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === 'EROFS' || code === 'EACCES' || code === 'EPERM';
}

async function write(db: DB): Promise<void> {
  const tmp = `${DB_PATH}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
    await fs.rename(tmp, DB_PATH); // 갑자기 꺼져도 파일이 반쪽만 남지 않게
  } catch (err) {
    if (isReadOnly(err)) throw new Error(READ_ONLY_MESSAGE);
    throw err;
  }
}

function queued<T>(fn: (db: DB) => Promise<T> | T): Promise<T> {
  const next = writeQueue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });
  writeQueue = next.catch(() => undefined);
  return next;
}

/* ---------------- 계정 ---------------- */

export async function saveAccount(account: Omit<Account, 'connectedAt'>): Promise<void> {
  await queued((db) => {
    const stored: Account = {
      ...account,
      accessToken: encrypt(account.accessToken),
      refreshToken: account.refreshToken ? encrypt(account.refreshToken) : undefined,
      connectedAt: Date.now(),
    };
    const i = db.accounts.findIndex((a) => a.channel === account.channel);
    if (i >= 0) db.accounts[i] = stored;
    else db.accounts.push(stored);
  });
}

/** 토큰이 복호화된 상태로 나옵니다. 서버에서만 쓰세요. */
export async function getAccount(channel: Channel): Promise<Account | null> {
  const db = await read();
  const found = db.accounts.find((a) => a.channel === channel);
  if (!found) return null;
  return {
    ...found,
    accessToken: decrypt(found.accessToken),
    refreshToken: found.refreshToken ? decrypt(found.refreshToken) : undefined,
  };
}

/** 화면에 뿌릴 때 쓰는 안전한 목록 (토큰 없음) */
export async function listAccountsPublic(): Promise<{ channel: Channel; name: string; connectedAt: number; extra?: Record<string, string> }[]> {
  const db = await read();
  return db.accounts.map((a) => ({ channel: a.channel, name: a.name, connectedAt: a.connectedAt, extra: a.extra }));
}

export async function removeAccount(channel: Channel): Promise<void> {
  await queued((db) => {
    db.accounts = db.accounts.filter((a) => a.channel !== channel);
  });
}

export async function updateTokens(
  channel: Channel,
  patch: { accessToken?: string; refreshToken?: string; expiresAt?: number },
): Promise<void> {
  await queued((db) => {
    const acc = db.accounts.find((a) => a.channel === channel);
    if (!acc) return;
    if (patch.accessToken) acc.accessToken = encrypt(patch.accessToken);
    if (patch.refreshToken) acc.refreshToken = encrypt(patch.refreshToken);
    if (patch.expiresAt) acc.expiresAt = patch.expiresAt;
  });
}

/* ---------------- 글 ---------------- */

export async function createPost(post: Omit<Post, 'id' | 'createdAt'>): Promise<Post> {
  const full: Post = { ...post, id: crypto.randomUUID(), createdAt: Date.now() };
  await queued((db) => {
    db.posts.unshift(full);
    if (db.posts.length > 500) db.posts.length = 500; // 너무 쌓이지 않게
  });
  return full;
}

export async function listPosts(): Promise<Post[]> {
  const db = await read();
  return db.posts;
}

export async function getPost(id: string): Promise<Post | null> {
  const db = await read();
  return db.posts.find((p) => p.id === id) ?? null;
}

export async function updateTarget(postId: string, channel: Channel, patch: Partial<PostTarget>): Promise<void> {
  await queued((db) => {
    const post = db.posts.find((p) => p.id === postId);
    if (!post) return;
    const t = post.targets.find((x) => x.channel === channel);
    if (t) Object.assign(t, patch);
  });
}

/** 예약 시간이 지났고 아직 안 보낸 글들 */
export async function duePosts(now = Date.now()): Promise<Post[]> {
  const db = await read();
  return db.posts.filter(
    (p) => p.scheduledAt !== undefined && p.scheduledAt <= now && p.targets.some((t) => t.status === 'scheduled'),
  );
}
