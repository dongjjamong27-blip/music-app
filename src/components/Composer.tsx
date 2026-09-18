'use client';

import { useMemo, useState } from 'react';
import type { Channel } from '@/lib/store';
import { naverPlan, hellotalkPlan, buildText, type HandoffPlan } from '@/lib/handoff';
import HandoffButtons from './HandoffButtons';
import TopicWriter from './TopicWriter';
import type { Draft } from '@/lib/research';

type AccountInfo = { channel: Channel; name: string; connectedAt: number; extra?: Record<string, string> };

const CHANNELS: { id: Channel; emoji: string; name: string; tag: string }[] = [
  { id: 'youtube', emoji: '▶️', name: '유튜브', tag: '자동 업로드 · 영상 필요' },
  { id: 'instagram', emoji: '📸', name: '인스타그램', tag: '자동 업로드 · 사진/영상 필요' },
  { id: 'naver', emoji: '🟢', name: '네이버 블로그', tag: '버튼 1번 (반자동)' },
  { id: 'hellotalk', emoji: '💬', name: '헬로톡', tag: '버튼 1번 (반자동)' },
];

export default function Composer({
  accounts,
  researchEnabled,
}: {
  accounts: AccountInfo[];
  researchEnabled: boolean;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [picked, setPicked] = useState<Channel[]>([]);
  const [media, setMedia] = useState<{ path: string; type: 'image' | 'video' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  const connected = useMemo(() => new Set(accounts.map((a) => a.channel)), [accounts]);
  const blogId = accounts.find((a) => a.channel === 'naver')?.extra?.blogId;

  const tagList = tags.split(/[,\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);

  const plans: HandoffPlan[] = [];
  if (picked.includes('naver')) plans.push(naverPlan(title, body, tagList, blogId));
  if (picked.includes('hellotalk')) plans.push(hellotalkPlan(title, body, tagList));

  function toggle(c: Channel) {
    setPicked((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    setUploading(false);
    const data = (await res.json()) as { path?: string; type?: 'image' | 'video'; error?: string };
    if (!res.ok || !data.path) {
      setMessage({ kind: 'bad', text: data.error ?? '파일 올리기에 실패했습니다.' });
      return;
    }
    setMedia({ path: data.path, type: data.type ?? 'image' });
  }

  async function submit() {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        tags: tagList,
        channels: picked,
        mediaPath: media?.path,
        mediaType: media?.type,
        scheduledAt: scheduleAt ? new Date(scheduleAt).getTime() : null,
      }),
    });
    setBusy(false);
    const data = (await res.json()) as { ok?: boolean; scheduled?: boolean; error?: string };
    if (!res.ok) {
      setMessage({ kind: 'bad', text: data.error ?? '보내기에 실패했습니다.' });
      return;
    }
    setMessage({
      kind: 'ok',
      text: data.scheduled
        ? '예약했어요! 시간이 되면 자동으로 올라갑니다. (기록 탭에서 확인)'
        : '보냈어요! 결과는 [기록] 탭에서 확인하세요.',
    });
  }

  const autoPicked = picked.filter((c) => c === 'youtube' || c === 'instagram');
  const missingAccount = autoPicked.filter((c) => !connected.has(c));
  const needsMedia = autoPicked.length > 0 && !media;
  const canSend = !busy && !uploading && picked.length > 0 && (title.trim() || body.trim()) && !needsMedia && missingAccount.length === 0;

  return (
    <>
      <h1>✏️ 한번에 올리기</h1>
      <p className="sub">한 번만 쓰면 고른 곳에 전부 올려드려요.</p>

      {message && <div className={`alert ${message.kind}`}>{message.text}</div>}

      {researchEnabled && (
        <TopicWriter
          channelHint={picked.length ? picked.join(', ') : '블로그와 SNS'}
          onDraft={(d: Draft) => {
            setTitle(d.title);
            setBody(d.body);
            setTags(d.tags.join(' '));
            setMessage({ kind: 'ok', text: '글을 만들었어요! 아래에서 고친 뒤 올리면 됩니다.' });
          }}
        />
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="title">제목</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 오늘 만든 새 노래 🎵" />
        </div>

        <div className="field">
          <label htmlFor="body">내용</label>
          <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="하고 싶은 이야기를 편하게 적어주세요." />
        </div>

        <div className="field">
          <label htmlFor="tags">해시태그 (띄어쓰기로 구분)</label>
          <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="음악 자작곡 일상" />
        </div>
      </div>

      <div className="card">
        <h2>📎 사진 / 영상</h2>
        <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={pickFile} />
        {uploading && <p className="note">올리는 중... 잠시만요.</p>}
        {media && (media.type === 'image'
          ? <img className="preview" src={media.path} alt="미리보기" />
          : <video className="preview" src={media.path} controls playsInline />)}
        <p className="note">유튜브는 영상, 인스타는 사진이나 영상이 꼭 필요해요.</p>
      </div>

      <div className="card">
        <h2>📤 어디에 올릴까요?</h2>
        <div className="channels">
          {CHANNELS.map((c) => (
            <div key={c.id} className={`channel ${picked.includes(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)}>
              <span className="emoji">{c.emoji}</span>
              <span className="name">
                {c.name}
                <span className="tag">{connected.has(c.id) ? c.tag : '⚠️ 연결 필요'}</span>
              </span>
            </div>
          ))}
        </div>
        {missingAccount.length > 0 && (
          <p className="note">⚠️ 먼저 [연결] 탭에서 계정을 연결해주세요.</p>
        )}
      </div>

      <div className="card">
        <h2>⏰ 예약하기 (안 쓰면 바로 올라감)</h2>
        <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
        {scheduleAt && <button className="btn-sub" style={{ marginTop: 8 }} onClick={() => setScheduleAt('')}>예약 취소</button>}
      </div>

      <button className="btn-main" disabled={!canSend} onClick={submit}>
        {busy ? '보내는 중...' : needsMedia ? '사진이나 영상을 골라주세요' : scheduleAt ? '예약하기' : '지금 올리기'}
      </button>

      {plans.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>🟢 네이버 · 헬로톡은 여기서 마무리</h2>
          <p className="note" style={{ marginTop: 0 }}>
            이 두 곳은 자동 등록이 막혀 있어서, 아래 버튼을 누르면 내용이 복사되고 앱이 열려요. 붙여넣기만 하면 끝!
          </p>
          <HandoffButtons plans={plans} />
        </div>
      )}

      <p className="note">
        미리보기: <br />
        <span style={{ whiteSpace: 'pre-wrap' }}>{buildText(title, body, tagList) || '(아직 비어 있어요)'}</span>
      </p>
    </>
  );
}
