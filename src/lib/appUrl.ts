/**
 * 이 앱이 인터넷에서 어떤 주소로 열리는지 알아냅니다.
 *
 * 왜 필요한가요?
 *  - 구글/페이스북에 "로그인 끝나면 여기로 돌아와" 하고 알려줄 때
 *  - 인스타가 내 사진을 가져갈 주소를 알려줄 때
 *
 * APP_URL을 직접 안 넣어도, Vercel에 올렸다면 Vercel이 알려주는 주소를 씁니다.
 * (환경변수를 잘못 적어도 앱이 알아서 동작하도록)
 */

function clean(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  // Vercel이 주는 주소에는 https:// 가 빠져 있어서 붙여줍니다.
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** 주소를 찾으면 돌려주고, 못 찾으면 null. (화면에 안내를 띄울 때 씁니다) */
export function resolveAppUrl(): string | null {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL, // Vercel이 자동으로 넣어주는 진짜 주소
    process.env.VERCEL_URL, // 배포마다 바뀌는 임시 주소 (마지막 수단)
  ];

  for (const value of candidates) {
    if (!value) continue;
    const url = clean(value);
    // 아직 설정 안 한 티가 나는 값은 건너뜁니다.
    if (/temp\.vercel\.app|내앱주소|example\.com|localhost/i.test(url)) continue;
    return url;
  }
  return null;
}

/** 주소가 꼭 필요한 곳에서 씁니다. 없으면 무엇을 해야 하는지 알려주고 멈춥니다. */
export function requireAppUrl(): string {
  const url = resolveAppUrl();
  if (!url) {
    throw new Error(
      'APP_URL 환경변수를 설정해주세요. (예: https://내앱주소.vercel.app) — Vercel → Settings → Environment Variables',
    );
  }
  return url;
}
