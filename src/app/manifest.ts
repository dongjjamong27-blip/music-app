import type { MetadataRoute } from 'next';

/** 휴대폰 홈 화면에 "앱처럼" 추가할 수 있게 해주는 설정입니다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '한번에 올리기',
    short_name: '한번에',
    description: '한 번 쓰면 유튜브·인스타·네이버블로그·헬로톡에 올려줍니다.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    orientation: 'portrait',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
