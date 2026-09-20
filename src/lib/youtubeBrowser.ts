'use client';

/**
 * 휴대폰(브라우저)에서 유튜브로 영상을 곧바로 올립니다.
 *
 * 왜 서버를 안 거치나요?
 *  - Vercel 무료 플랜은 서버가 한 번에 받을 수 있는 파일이 4.5MB뿐입니다.
 *    영상은 보통 그보다 훨씬 크니까 서버를 거치면 무조건 실패해요.
 *  - 휴대폰이 유튜브에 직접 올리면 크기 제한도, 시간 제한도 없습니다.
 *
 * 대신 올릴 때마다 "구글 계정으로 계속" 버튼을 한 번 눌러야 합니다.
 * (브라우저가 받는 출입증은 1시간짜리라서요. 비밀번호를 저장하지 않으니 더 안전하기도 합니다)
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

/** 구글이 주는 출입증 발급기 (필요한 부분만 적어둡니다) */
type TokenClient = { requestAccessToken: () => void };
type GoogleOAuth = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (res: { access_token?: string; error?: string }) => void;
        error_callback?: (err: { type?: string }) => void;
      }) => TokenClient;
    };
  };
};

function google(): GoogleOAuth | undefined {
  return (window as unknown as { google?: GoogleOAuth }).google;
}

/** 구글 로그인 스크립트를 한 번만 불러옵니다. */
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (google()) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('구글 로그인 준비에 실패했습니다.')));
      return;
    }
    const tag = document.createElement('script');
    tag.src = GIS_SRC;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error('구글 로그인 준비에 실패했습니다. 인터넷 연결을 확인해주세요.'));
    document.head.appendChild(tag);
  });
}

/** "구글 계정으로 계속" 창을 띄우고, 유튜브에 올릴 수 있는 출입증을 받아옵니다. */
export async function getYoutubeToken(clientId: string): Promise<string> {
  await loadGoogleScript();
  const g = google();
  if (!g) throw new Error('구글 로그인 준비에 실패했습니다.');

  return new Promise<string>((resolve, reject) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (res) => {
        if (res.access_token) resolve(res.access_token);
        else reject(new Error('구글 계정 연결이 취소됐거나 권한을 주지 않으셨어요.'));
      },
      error_callback: () => reject(new Error('구글 계정 연결이 취소됐습니다.')),
    });
    client.requestAccessToken();
  });
}

export type Privacy = 'public' | 'unlisted' | 'private';

export type UploadOptions = {
  token: string;
  file: File;
  title: string;
  description: string;
  tags: string[];
  privacy: Privacy;
  categoryId: string;
  onProgress?: (percent: number) => void;
};

/** 큰 파일을 끊어서 올릴 수 있는 "이어올리기" 주소를 먼저 받아옵니다. */
async function startUpload(o: UploadOptions): Promise<string> {
  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${o.token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': o.file.type || 'video/mp4',
        'X-Upload-Content-Length': String(o.file.size),
      },
      body: JSON.stringify({
        snippet: {
          // 유튜브 제목은 100자까지입니다.
          title: (o.title || '제목 없음').slice(0, 100),
          description: o.description.slice(0, 5000),
          tags: o.tags.slice(0, 20),
          categoryId: o.categoryId,
        },
        status: {
          privacyStatus: o.privacy,
          selfDeclaredMadeForKids: false,
        },
      }),
    },
  );

  const location = res.headers.get('location');
  if (!res.ok || !location) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('구글 출입증이 만료됐어요. 버튼을 다시 눌러주세요.');
    if (res.status === 403) {
      throw new Error('유튜브에 올릴 권한이 없습니다. 구글 클라우드에서 YouTube Data API를 켰는지 확인해주세요.');
    }
    throw new Error(`유튜브가 업로드를 시작하지 못했어요. ${detail.slice(0, 200)}`);
  }
  return location;
}

/** 실제 파일을 올립니다. 진행률을 보여주려고 XMLHttpRequest 를 씁니다. */
function sendFile(url: string, file: File, onProgress?: (p: number) => void): Promise<{ id?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as { id?: string });
        } catch {
          resolve({});
        }
      } else {
        reject(new Error(`올리는 중에 실패했어요. (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('인터넷이 끊겼어요. 다시 시도해주세요.'));
    xhr.onabort = () => reject(new Error('업로드를 멈췄습니다.'));
    xhr.send(file);
  });
}

/** 영상을 올리고, 올라간 영상의 주소를 돌려줍니다. */
export async function uploadToYoutube(o: UploadOptions): Promise<string> {
  const url = await startUpload(o);
  const result = await sendFile(url, o.file, o.onProgress);
  if (!result.id) throw new Error('올리긴 했는데 영상 번호를 못 받았어요. 유튜브 스튜디오에서 확인해주세요.');
  return `https://youtu.be/${result.id}`;
}
