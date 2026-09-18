/** @type {import('next').NextConfig} */
const nextConfig = {
  // 영상/사진 업로드 때문에 서버 액션 용량 제한을 넉넉히 둡니다.
  experimental: { serverActions: { bodySizeLimit: '256mb' } },
};

export default nextConfig;
