import type { Post } from './store';
import { updateTarget } from './store';
import { uploadToYoutube } from './youtube';
import { postToInstagram } from './instagram';

/** 이 앱이 인터넷에서 어떤 주소로 열리는지 (인스타에 사진 주소를 알려줄 때 필요) */
export function appUrl(): string {
  const url = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('APP_URL 환경변수를 설정해주세요. (예: https://내앱주소.vercel.app)');
  return url.replace(/\/+$/, '');
}

/**
 * 글 하나를 선택한 채널들에 실제로 올립니다.
 * 자동(유튜브/인스타)만 여기서 처리하고, 네이버/헬로톡은 'manual'로 표시해 화면에서 버튼으로 보냅니다.
 */
export async function publishPost(post: Post): Promise<void> {
  for (const target of post.targets) {
    if (target.channel === 'naver' || target.channel === 'hellotalk') {
      await updateTarget(post.id, target.channel, {
        status: 'manual',
        message: '휴대폰에서 [보내기] 버튼을 눌러 마무리해주세요.',
      });
      continue;
    }
    if (target.status === 'done') continue;

    await updateTarget(post.id, target.channel, { status: 'sending', message: '올리는 중...' });
    try {
      let url = '';
      if (target.channel === 'youtube') {
        if (!post.mediaPath || post.mediaType !== 'video') {
          throw new Error('유튜브는 영상 파일이 있어야 합니다.');
        }
        url = await uploadToYoutube({
          title: post.title,
          description: post.body,
          tags: post.tags,
          mediaPath: post.mediaPath,
          publishAt: post.scheduledAt && post.scheduledAt > Date.now() ? post.scheduledAt : undefined,
        });
      } else if (target.channel === 'instagram') {
        if (!post.mediaPath || !post.mediaType) {
          throw new Error('인스타는 사진 또는 영상이 꼭 필요합니다.');
        }
        url = await postToInstagram({
          caption: [post.title, post.body, post.tags.map((t) => `#${t}`).join(' ')].filter(Boolean).join('\n\n'),
          mediaUrl: `${appUrl()}${post.mediaPath}`,
          mediaType: post.mediaType,
        });
      }
      await updateTarget(post.id, target.channel, { status: 'done', url, message: '완료!' });
    } catch (err) {
      await updateTarget(post.id, target.channel, {
        status: 'failed',
        message: err instanceof Error ? err.message : '알 수 없는 오류',
      });
    }
  }
}
