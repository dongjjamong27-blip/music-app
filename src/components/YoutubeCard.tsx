'use client';

import { useState } from 'react';
import { getYoutubeToken, uploadToYoutube, type Privacy } from '@/lib/youtubeBrowser';
import { addLocalPost } from '@/lib/localStore';

/**
 * 유튜브에 영상을 올리는 칸입니다.
 * 휴대폰이 유튜브로 직접 올리기 때문에 영상 크기 제한이 없습니다.
 */

const PRIVACY: { id: Privacy; label: string; hint: string }[] = [
  { id: 'unlisted', label: '미등록', hint: '주소를 아는 사람만 볼 수 있어요 (안전)' },
  { id: 'public', label: '공개', hint: '누구나 검색해서 볼 수 있어요' },
  { id: 'private', label: '비공개', hint: '나만 볼 수 있어요' },
];

const CATEGORY = [
  { id: '22', label: '일상 · 브이로그' },
  { id: '19', label: '여행' },
  { id: '10', label: '음악' },
];

export default function YoutubeCard({
  clientId,
  title,
  description,
  tags,
  file,
}: {
  clientId: string;
  title: string;
  description: string;
  tags: string[];
  file: File | null;
}) {
  const [privacy, setPrivacy] = useState<Privacy>('unlisted');
  const [categoryId, setCategoryId] = useState('22');
  const [percent, setPercent] = useState<number | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const busy = percent !== null;
  const ready = Boolean(clientId) && Boolean(file) && Boolean(title.trim());

  async function upload() {
    if (!file) return;
    setError('');
    setLink('');
    try {
      // ① 구글 출입증 받기 (창이 하나 뜹니다)
      const token = await getYoutubeToken(clientId);
      // ② 바로 올리기
      setPercent(0);
      const url = await uploadToYoutube({
        token, file, title, description, tags, privacy, categoryId,
        onProgress: setPercent,
      });
      setLink(url);
      addLocalPost({ title, body: description, tags, channels: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 문제가 생겼어요.');
    } finally {
      setPercent(null);
    }
  }

  if (!clientId) {
    return (
      <div className="card">
        <h2>▶️ 유튜브</h2>
        <p className="note" style={{ marginTop: 0 }}>
          아직 준비가 안 됐어요. <b>[⚙️ 설정]</b> 탭에서 유튜브 준비를 먼저 해주세요.
          (구글에서 출입증을 받아 <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> 에 넣으시면 됩니다)
        </p>
        <a href="/setup" style={{ textDecoration: 'none' }}>
          <button className="btn-sub" style={{ width: '100%' }}>설정하러 가기 →</button>
        </a>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>▶️ 유튜브에 올리기</h2>
      <p className="note" style={{ marginTop: 0 }}>
        휴대폰에서 유튜브로 <b>바로</b> 올립니다. 영상 크기 제한이 없어요.
        올릴 때마다 <b>구글 계정 확인 창</b>이 한 번 뜹니다.
      </p>

      <div className="field">
        <label>누가 볼 수 있게 할까요?</label>
        <div className="btn-row" style={{ flexWrap: 'wrap' }}>
          {PRIVACY.map((p) => (
            <button
              key={p.id}
              className={p.id === privacy ? 'btn-main' : 'btn-sub'}
              onClick={() => setPrivacy(p.id)}
              disabled={busy}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="note" style={{ marginTop: 6 }}>
          {PRIVACY.find((p) => p.id === privacy)?.hint}
        </p>
      </div>

      <div className="field">
        <label>어떤 종류의 영상인가요?</label>
        <div className="btn-row" style={{ flexWrap: 'wrap' }}>
          {CATEGORY.map((c) => (
            <button
              key={c.id}
              className={c.id === categoryId ? 'btn-main' : 'btn-sub'}
              onClick={() => setCategoryId(c.id)}
              disabled={busy}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {!file && <p className="note">⬆️ 먼저 <b>📎 사진 / 영상</b> 에서 영상을 골라주세요.</p>}
      {file && <p className="note">올릴 영상: <b>{file.name}</b></p>}

      <button className="btn-main" style={{ width: '100%' }} disabled={!ready || busy} onClick={upload}>
        {busy ? `올리는 중... ${percent}%` : '유튜브에 올리기'}
      </button>

      {busy && (
        <div style={{ marginTop: 10, background: 'rgba(127,127,127,.2)', borderRadius: 999, height: 10 }}>
          <div style={{ width: `${percent}%`, background: 'var(--accent, #d33)', height: 10, borderRadius: 999 }} />
        </div>
      )}
      {busy && <p className="note">창을 닫지 마세요. 영상이 크면 몇 분 걸립니다.</p>}

      {link && (
        <p className="note">
          ✅ 다 올렸어요! <a href={link} target="_blank" rel="noreferrer"><b>{link}</b></a>
          <br />처음엔 화질이 낮게 보일 수 있어요. 유튜브가 처리하는 데 시간이 걸립니다.
        </p>
      )}
      {error && <p className="note" style={{ color: 'var(--bad)' }}>⚠️ {error}</p>}
    </div>
  );
}
