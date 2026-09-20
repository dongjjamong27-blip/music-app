'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Channel } from '@/lib/store';
import { naverPlan, hellotalkPlan, buildText, HELLOTALK_LIMIT, type HandoffPlan } from '@/lib/handoff';
import HandoffButtons from './HandoffButtons';
import TopicWriter from './TopicWriter';
import ImagePromptCard from './ImagePromptCard';
import YoutubeCard from './YoutubeCard';
import { getLocalAccounts, addLocalPost, type LocalAccounts } from '@/lib/localStore';
import type { Draft } from '@/lib/research';

type AccountInfo = { channel: Channel; name: string; connectedAt: number; extra?: Record<string, string> };

const CHANNELS: { id: Channel; emoji: string; name: string; tag: string }[] = [
  { id: 'youtube', emoji: '▶️', name: '유튜브', tag: '바로 올리기 · 영상 필요' },
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
  // 고른 사진은 일단 휴대폰 안에만 둡니다.
  // (Vercel 서버는 파일을 저장할 수 없어서, 꼭 필요할 때만 서버로 보냅니다)
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  // 네이버·헬로톡은 휴대폰에 저장돼 있고, 유튜브·인스타는 서버에 저장돼 있습니다.
  const [local, setLocal] = useState<LocalAccounts>({});
  useEffect(() => setLocal(getLocalAccounts()), []);

  // 유튜브는 휴대폰이 직접 올리므로, 구글 출입증 번호만 있으면 준비된 것입니다.
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  const serverConnected = useMemo(() => new Set(accounts.map((a) => a.channel)), [accounts]);
  const isConnected = (c: Channel) =>
    c === 'naver' ? Boolean(local.naver)
      : c === 'hellotalk' ? Boolean(local.hellotalk)
      : c === 'youtube' ? Boolean(googleClientId)
      : serverConnected.has(c);
  const blogId = local.naver?.blogId;

  // 고른 사진을 화면에 보여주기 위한 임시 주소입니다. 다 쓰면 반납해야 메모리가 샙니다.
  const previews = useMemo(
    () => files.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? ('video' as const) : ('image' as const),
    })),
    [files],
  );
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const tagList = tags.split(/[,\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);

  // 헬로톡은 한 번에 2000자까지만 올라가서, 글자수를 미리 보여줍니다.
  const fullText = buildText(title, body, tagList);
  const hellotalkPicked = picked.includes('hellotalk');
  const overHellotalk = fullText.length > HELLOTALK_LIMIT;

  const plans: HandoffPlan[] = [];
  if (picked.includes('naver')) plans.push(naverPlan(title, body, tagList, blogId));
  if (picked.includes('hellotalk')) plans.push(hellotalkPlan(title, body, tagList));

  function toggle(c: Channel) {
    setPicked((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setMessage(null);
    setFiles((prev) => [...prev, ...picked].slice(0, 10)); // 너무 많으면 휴대폰이 느려져요
    e.target.value = ''; // 같은 사진을 다시 고를 수 있게 비워둡니다
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  /** 유튜브·인스타는 서버가 파일을 가지고 있어야 해서, 그때만 올립니다. */
  async function uploadForAuto(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    setUploading(false);
    const data = (await res.json()) as { path?: string; type?: 'image' | 'video'; error?: string };
    if (!res.ok || !data.path) {
      setMessage({ kind: 'bad', text: data.error ?? '파일 올리기에 실패했습니다.' });
      return null;
    }
    const saved = { path: data.path, type: data.type ?? ('image' as const) };
    setMedia(saved);
    return saved;
  }

  async function submit() {
    setMessage(null);

    // 네이버·헬로톡만 고른 경우: 서버가 할 일이 없습니다.
    // 휴대폰에 기록만 남기고, 아래 [보내기] 버튼으로 마무리하면 됩니다.
    if (autoPicked.length === 0) {
      addLocalPost({ title, body, tags: tagList, channels: picked as ('naver' | 'hellotalk')[] });
      setMessage({ kind: 'ok', text: '준비됐어요! 아래 버튼으로 보내시면 됩니다. (기록에도 남겼어요)' });
      return;
    }

    // 유튜브·인스타는 서버에 파일이 있어야 합니다.
    const saved = media ?? (files[0] ? await uploadForAuto(files[0]) : null);
    if (!saved) return;

    setBusy(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        tags: tagList,
        channels: picked,
        mediaPath: saved.path,
        mediaType: saved.type,
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

  // 서버가 해야 하는 일은 이제 인스타뿐입니다.
  // (유튜브는 아래 [▶️ 유튜브] 칸에서 휴대폰이 직접 올립니다)
  const autoPicked = picked.filter((c) => c === 'instagram');
  const videoFile = files.find((f) => f.type.startsWith('video')) ?? null;
  const missingAccount = autoPicked.filter((c) => !serverConnected.has(c));
  const needsMedia = autoPicked.length > 0 && files.length === 0 && !media;
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

        {hellotalkPicked && (
          <p className="note" style={{ marginTop: -6, color: overHellotalk ? 'var(--bad)' : undefined }}>
            💬 헬로톡 글자수: <b>{fullText.length}</b> / {HELLOTALK_LIMIT}자
            {overHellotalk
              ? ` — 넘었어요! ${hellotalkPlan(title, body, tagList).parts.length}개로 나눠서 올려드릴게요.`
              : ' ✅'}
          </p>
        )}

        <div className="field">
          <label htmlFor="tags">해시태그 (띄어쓰기로 구분)</label>
          <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="음악 자작곡 일상" />
        </div>
      </div>

      <ImagePromptCard title={title} />

      <div className="card">
        <h2>📎 사진 / 영상</h2>
        <p className="note" style={{ marginTop: 0 }}>
          여러 장 한 번에 고르셔도 됩니다. 사진은 <b>휴대폰 안에만</b> 있다가,
          아래 <b>[사진과 함께 보내기]</b> 를 누르면 글과 같이 넘어가요.
        </p>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          onChange={pickFiles}
        />
        {uploading && <p className="note">올리는 중... 잠시만요.</p>}

        {previews.length > 0 && (
          <div className="btn-row" style={{ flexWrap: 'wrap', marginTop: 10 }}>
            {previews.map((p, i) => (
              <div key={p.url} style={{ position: 'relative', width: 96 }}>
                {p.type === 'image'
                  ? <img src={p.url} alt={`사진 ${i + 1}`} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10 }} />
                  : <video src={p.url} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10 }} muted playsInline />}
                <button
                  className="btn-sub"
                  style={{ position: 'absolute', top: -6, right: -6, padding: '2px 8px', lineHeight: 1.4 }}
                  onClick={() => removeFile(i)}
                  aria-label={`${i + 1}번째 사진 빼기`}
                >
                  ✕
                </button>
                <p className="note" style={{ textAlign: 'center', margin: 2 }}>{i + 1}</p>
              </div>
            ))}
          </div>
        )}

        <p className="note">유튜브는 영상, 인스타는 사진이나 영상이 꼭 필요해요. (첫 번째 것을 씁니다)</p>
      </div>

      <div className="card">
        <h2>📤 어디에 올릴까요?</h2>
        <div className="channels">
          {CHANNELS.map((c) => (
            <div key={c.id} className={`channel ${picked.includes(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)}>
              <span className="emoji">{c.emoji}</span>
              <span className="name">
                {c.name}
                <span className="tag">{isConnected(c.id) ? c.tag : '⚠️ 연결 필요'}</span>
              </span>
            </div>
          ))}
        </div>
        {missingAccount.length > 0 && (
          <p className="note">⚠️ 먼저 [연결] 탭에서 계정을 연결해주세요.</p>
        )}
      </div>

      {picked.includes('youtube') && (
        <YoutubeCard
          clientId={googleClientId}
          title={title}
          description={buildText('', body, tagList)}
          tags={tagList}
          file={videoFile}
        />
      )}

      <div className="card">
        <h2>⏰ 예약하기 (안 쓰면 바로 올라감)</h2>
        <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
        {scheduleAt && <button className="btn-sub" style={{ marginTop: 8 }} onClick={() => setScheduleAt('')}>예약 취소</button>}
      </div>

      <button className="btn-main" disabled={!canSend} onClick={submit}>
        {busy
          ? '보내는 중...'
          : needsMedia
            ? '사진이나 영상을 골라주세요'
            : autoPicked.length === 0
              ? '보낼 준비하기'
              : scheduleAt
                ? '예약하기'
                : '지금 올리기'}
      </button>

      {plans.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>🟢 네이버 · 헬로톡은 여기서 마무리</h2>
          <p className="note" style={{ marginTop: 0 }}>
            이 두 곳은 자동 등록이 막혀 있어서, 아래 버튼을 누르면 내용이 복사되고 앱이 열려요. 붙여넣기만 하면 끝!
            사진을 고르셨다면 <b>[사진과 함께 보내기]</b> 로 글과 사진을 한 번에 넘길 수 있어요.
          </p>
          <HandoffButtons plans={plans} files={files} />
        </div>
      )}

      <p className="note">
        미리보기: <br />
        <span style={{ whiteSpace: 'pre-wrap' }}>{fullText || '(아직 비어 있어요)'}</span>
      </p>
    </>
  );
}
