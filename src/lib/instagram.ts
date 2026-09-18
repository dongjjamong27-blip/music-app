import { getAccount } from './store';

/**
 * 인스타그램 자동 등록 (공식 Instagram Graph API)
 *
 * 꼭 알아야 할 조건:
 *  1) 인스타 계정이 "프로페셔널(비즈니스/크리에이터)" 이어야 합니다. (설정에서 무료로 전환 가능)
 *  2) 페이스북 페이지와 연결되어 있어야 합니다.
 *  3) 사진/영상은 인터넷에서 열리는 공개 주소여야 합니다. → 이 앱을 인터넷에 올려두면 해결됩니다.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export const META_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',');

export function metaAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: META_SCOPES,
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function exchangeMetaCode(code: string, redirectUri: string): Promise<string> {
  const short = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID ?? '',
        client_secret: process.env.META_APP_SECRET ?? '',
        redirect_uri: redirectUri,
        code,
      }),
  );
  const shortData = (await short.json()) as { access_token?: string; error?: { message?: string } };
  if (!short.ok || !shortData.access_token) {
    throw new Error(`인스타 로그인 실패: ${shortData.error?.message ?? short.status}`);
  }

  // 짧은 토큰(1~2시간)을 긴 토큰(약 60일)으로 바꿉니다.
  const long = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID ?? '',
        client_secret: process.env.META_APP_SECRET ?? '',
        fb_exchange_token: shortData.access_token,
      }),
  );
  const longData = (await long.json()) as { access_token?: string };
  return longData.access_token ?? shortData.access_token;
}

/** 연결된 페이스북 페이지에서 인스타 계정 번호와 아이디를 찾아옵니다. */
export async function findInstagramAccount(userToken: string): Promise<{ igUserId: string; username: string }> {
  const res = await fetch(`${GRAPH}/me/accounts?fields=instagram_business_account{id,username},name&access_token=${userToken}`);
  const data = (await res.json()) as {
    data?: { name?: string; instagram_business_account?: { id: string; username?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`페이스북 페이지 조회 실패: ${data.error?.message ?? res.status}`);

  const page = data.data?.find((p) => p.instagram_business_account?.id);
  if (!page?.instagram_business_account) {
    throw new Error(
      '인스타 프로페셔널 계정을 찾지 못했습니다. 인스타를 "비즈니스/크리에이터"로 바꾸고 페이스북 페이지와 연결한 뒤 다시 시도해주세요.',
    );
  }
  return {
    igUserId: page.instagram_business_account.id,
    username: page.instagram_business_account.username ?? page.name ?? '내 인스타',
  };
}

export type InstagramPostInput = {
  caption: string;
  mediaUrl: string;                  // 인터넷에서 열리는 공개 주소 (https://...)
  mediaType: 'image' | 'video';
};

/** 인스타에 사진 또는 릴스를 올리고 주소를 돌려줍니다. */
export async function postToInstagram(input: InstagramPostInput): Promise<string> {
  const acc = await getAccount('instagram');
  if (!acc) throw new Error('인스타그램 계정이 연결되지 않았습니다. [연결] 화면에서 연결해주세요.');
  const igUserId = acc.extra?.igUserId;
  if (!igUserId) throw new Error('인스타 계정 번호를 찾을 수 없습니다. 계정을 다시 연결해주세요.');

  const token = acc.accessToken;

  // 1단계: 올릴 내용을 "컨테이너"로 만들어 둡니다.
  const createParams = new URLSearchParams({ caption: input.caption.slice(0, 2200), access_token: token });
  if (input.mediaType === 'video') {
    createParams.set('media_type', 'REELS');
    createParams.set('video_url', input.mediaUrl);
  } else {
    createParams.set('image_url', input.mediaUrl);
  }

  const created = await fetch(`${GRAPH}/${igUserId}/media`, { method: 'POST', body: createParams });
  const createdData = (await created.json()) as { id?: string; error?: { message?: string } };
  if (!created.ok || !createdData.id) {
    throw new Error(`인스타 준비 실패: ${createdData.error?.message ?? created.status}`);
  }
  const containerId = createdData.id;

  // 2단계: 영상은 인스타가 변환하는 데 시간이 걸립니다. 다 될 때까지 기다립니다.
  if (input.mediaType === 'video') {
    await waitUntilReady(containerId, token);
  }

  // 3단계: 실제로 게시!
  const published = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: containerId, access_token: token }),
  });
  const publishedData = (await published.json()) as { id?: string; error?: { message?: string } };
  if (!published.ok || !publishedData.id) {
    throw new Error(`인스타 게시 실패: ${publishedData.error?.message ?? published.status}`);
  }

  const permalink = await fetch(`${GRAPH}/${publishedData.id}?fields=permalink&access_token=${token}`);
  const linkData = (await permalink.json()) as { permalink?: string };
  return linkData.permalink ?? `https://www.instagram.com/p/${publishedData.id}`;
}

async function waitUntilReady(containerId: string, token: string): Promise<void> {
  const MAX_TRIES = 40;   // 5초 x 40 = 최대 약 3분 대기
  for (let i = 0; i < MAX_TRIES; i++) {
    const res = await fetch(`${GRAPH}/${containerId}?fields=status_code,status&access_token=${token}`);
    const data = (await res.json()) as { status_code?: string; status?: string };
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error(`인스타 영상 변환 실패: ${data.status ?? '알 수 없는 오류'}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('인스타 영상 변환이 너무 오래 걸립니다. 잠시 뒤 다시 시도해주세요.');
}
