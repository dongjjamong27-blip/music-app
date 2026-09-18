import fs from 'node:fs/promises';
import path from 'node:path';
import { getAccount, updateTokens } from './store';

/**
 * 유튜브 자동 업로드 (공식 YouTube Data API v3)
 * 구글 계정 한 번만 연결해두면, 이후로는 앱이 알아서 영상을 올립니다.
 */

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

export function googleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',     // 새로고침 토큰을 받아야 매번 로그인 안 함
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const data = (await res.json()) as {
    access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(`구글 로그인 실패: ${data.error_description ?? data.error ?? res.status}`);
  }
  return data;
}

/** 토큰이 만료됐으면 조용히 새로 받아옵니다. */
async function freshAccessToken(): Promise<string> {
  const acc = await getAccount('youtube');
  if (!acc) throw new Error('유튜브 계정이 연결되지 않았습니다. [연결] 화면에서 구글 계정을 연결해주세요.');

  const stillValid = acc.expiresAt !== undefined && acc.expiresAt - 60_000 > Date.now();
  if (stillValid) return acc.accessToken;
  if (!acc.refreshToken) return acc.accessToken;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: acc.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`유튜브 토큰 갱신 실패: ${data.error_description ?? res.status}. 계정을 다시 연결해주세요.`);
  }
  await updateTokens('youtube', {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  return data.access_token;
}

export async function fetchChannelName(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return '내 유튜브 채널';
  const data = (await res.json()) as { items?: { snippet?: { title?: string } }[] };
  return data.items?.[0]?.snippet?.title ?? '내 유튜브 채널';
}

export type YoutubeUploadInput = {
  title: string;
  description: string;
  tags: string[];
  mediaPath: string;                 // /uploads/xxx.mp4
  privacy?: 'public' | 'unlisted' | 'private';
  publishAt?: number;                // 예약 공개 시각(ms)
};

/** 영상 한 편을 유튜브에 올리고 주소를 돌려줍니다. */
export async function uploadToYoutube(input: YoutubeUploadInput): Promise<string> {
  const token = await freshAccessToken();

  const filePath = path.join(process.cwd(), 'public', input.mediaPath.replace(/^\/+/, ''));
  const file = await fs.readFile(filePath);

  // 예약 공개를 쓰려면 반드시 private 상태로 올려야 합니다 (유튜브 규칙).
  const privacyStatus = input.publishAt ? 'private' : (input.privacy ?? 'public');

  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),      // 유튜브 제목은 100자 제한
      description: input.description.slice(0, 5000),
      tags: input.tags.slice(0, 30),
      categoryId: '10',                       // 10 = 음악
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
      ...(input.publishAt ? { publishAt: new Date(input.publishAt).toISOString() } : {}),
    },
  };

  // 1단계: "지금부터 영상 보낼게요" 하고 업로드 주소를 받습니다.
  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': String(file.byteLength),
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!init.ok) {
    throw new Error(`유튜브 업로드 준비 실패 (${init.status}): ${await init.text()}`);
  }
  const uploadUrl = init.headers.get('location');
  if (!uploadUrl) throw new Error('유튜브 업로드 주소를 받지 못했습니다.');

  // 2단계: 영상 파일을 실제로 보냅니다.
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/*', 'Content-Length': String(file.byteLength) },
    body: new Uint8Array(file),
  });
  if (!upload.ok) {
    throw new Error(`유튜브 업로드 실패 (${upload.status}): ${await upload.text()}`);
  }
  const result = (await upload.json()) as { id?: string };
  if (!result.id) throw new Error('유튜브가 영상 번호를 알려주지 않았습니다.');
  return `https://youtu.be/${result.id}`;
}
