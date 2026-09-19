'use client';

import { useEffect, useState } from 'react';
import type { Post, Channel, PostStatus } from '@/lib/store';
import { naverPlan, hellotalkPlan } from '@/lib/handoff';
import HandoffButtons from './HandoffButtons';
import { getLocalPosts, getLocalAccounts, clearLocalPosts, type LocalPost } from '@/lib/localStore';

const NAME: Record<Channel, string> = {
  youtube: '▶️ 유튜브',
  instagram: '📸 인스타',
  naver: '🟢 네이버',
  hellotalk: '💬 헬로톡',
};

const STATUS_TEXT: Record<PostStatus, string> = {
  draft: '준비 중',
  scheduled: '예약됨',
  sending: '올리는 중',
  done: '완료',
  failed: '실패',
  manual: '버튼 눌러 마무리',
};

function when(ms: number): string {
  return new Date(ms).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryList({ posts, blogId: serverBlogId }: { posts: Post[]; blogId?: string }) {
  // 네이버·헬로톡 글은 휴대폰 안에 저장돼 있습니다.
  const [localPosts, setLocalPosts] = useState<LocalPost[]>([]);
  const [blogId, setBlogId] = useState<string | undefined>(serverBlogId);

  useEffect(() => {
    setLocalPosts(getLocalPosts());
    setBlogId(getLocalAccounts().naver?.blogId ?? serverBlogId);
  }, [serverBlogId]);

  function clearAll() {
    if (!confirm('휴대폰에 저장된 기록을 모두 지울까요?')) return;
    clearLocalPosts();
    setLocalPosts([]);
  }

  if (posts.length === 0 && localPosts.length === 0) {
    return (
      <>
        <h1>📋 기록</h1>
        <p className="sub">아직 올린 글이 없어요. [글쓰기]에서 첫 글을 올려보세요!</p>
      </>
    );
  }

  return (
    <>
      <h1>📋 기록</h1>
      <p className="sub">올린 글과 결과를 볼 수 있어요.</p>

      {localPosts.map((post) => {
        const plans = post.channels.map((c) =>
          c === 'naver'
            ? naverPlan(post.title, post.body, post.tags, blogId)
            : hellotalkPlan(post.title, post.body, post.tags),
        );
        return (
          <div className="card" key={post.id}>
            <div className="row">
              <b>{post.title || '(제목 없음)'}</b>
              <span className="note" style={{ whiteSpace: 'nowrap' }}>{when(post.createdAt)}</span>
            </div>
            <p className="note" style={{ marginTop: 4 }}>
              {post.channels.map((c) => NAME[c]).join(' · ')}
            </p>
            <HandoffButtons plans={plans} />
          </div>
        );
      })}

      {localPosts.length > 0 && (
        <button className="btn-sub" style={{ width: '100%', marginBottom: 14 }} onClick={clearAll}>
          기록 비우기
        </button>
      )}

      {posts.map((post) => {
        const manual = post.targets.filter((t) => t.channel === 'naver' || t.channel === 'hellotalk');
        const plans = manual.map((t) =>
          t.channel === 'naver'
            ? naverPlan(post.title, post.body, post.tags, blogId)
            : hellotalkPlan(post.title, post.body, post.tags),
        );

        return (
          <div className="card" key={post.id}>
            <div className="row">
              <b>{post.title || '(제목 없음)'}</b>
              <span className="note" style={{ whiteSpace: 'nowrap' }}>{when(post.createdAt)}</span>
            </div>
            {post.scheduledAt && <p className="note" style={{ marginTop: 4 }}>⏰ 예약: {when(post.scheduledAt)}</p>}

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {post.targets.map((t) => (
                <div className="row" key={t.channel}>
                  <span>{NAME[t.channel]}</span>
                  <span>
                    {t.url && <a href={t.url} target="_blank" rel="noreferrer" style={{ marginRight: 8, fontSize: 13 }}>보기</a>}
                    <span className={`badge ${t.status}`}>{STATUS_TEXT[t.status]}</span>
                  </span>
                </div>
              ))}
            </div>

            {post.targets.some((t) => t.status === 'failed') && (
              <p className="note" style={{ color: 'var(--bad)' }}>
                {post.targets.find((t) => t.status === 'failed')!.message}
              </p>
            )}

            {plans.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <HandoffButtons plans={plans} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
