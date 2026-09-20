'use client';

import { useEffect, useState } from 'react';
import { getYoutubeToken, uploadToYoutube, type Privacy } from '@/lib/youtubeBrowser';
import { addLocalPost, getGoogleClientId, saveGoogleClientId, cleanClientId } from '@/lib/localStore';

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
  clientId: fromServer,
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
  // 출입증 번호는 휴대폰에 저장된 것을 먼저 씁니다.
  // (Vercel 설정을 휴대폰으로 만지기가 너무 어려워서요)
  const [saved, setSaved] = useState('');
  const [typing, setTyping] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  useEffect(() => setSaved(getGoogleClientId()), []);
  const clientId = saved || fromServer;

  function save() {
    const id = cleanClientId(typing);
    if (!id.endsWith('.apps.googleusercontent.com')) {
      setSavedMsg('⚠️ 클라이언트 ID가 아닌 것 같아요. ...apps.googleusercontent.com 으로 끝나야 합니다.');
      return;
    }
    if (!saveGoogleClientId(id)) {
      setSavedMsg('⚠️ 휴대폰에 저장하지 못했어요. 시크릿 모드라면 일반 모드에서 해주세요.');
      return;
    }
    setSaved(id);
    setTyping('');
    setSavedMsg('✅ 저장했어요! 이제 바로 올리실 수 있습니다.');
  }

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
        <h2>▶️ 유튜브 준비하기</h2>
        <p className="note" style={{ marginTop: 0 }}>
          구글에서 받은 <b>클라이언트 ID</b> 를 한 번만 넣어주시면 됩니다.
          그다음부터는 바로 올릴 수 있어요.
        </p>
        <div className="field">
          <label>클라이언트 ID</label>
          <input
            type="text"
            value={typing}
            onChange={(e) => setTyping(e.target.value)}
            placeholder="000000-xxxx.apps.googleusercontent.com"
          />
        </div>
        <button className="btn-main" style={{ width: '100%' }} disabled={!typing.trim()} onClick={save}>
          저장하기
        </button>
        {savedMsg && <p className="note">{savedMsg}</p>}
        <p className="note">
          🔒 이건 비밀번호가 아니라 <b>주소 같은 값</b>이라 휴대폰에 두어도 안전합니다.
          (&quot;시크릿/보안 비밀번호&quot;는 이 앱에서 쓰지 않으니 넣지 마세요)
          <br />어디서 받는지 모르시겠다면 <a href="/setup"><b>[⚙️ 설정]</b></a> 탭을 보세요.
        </p>
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

      {saved && (
        <p className="note" style={{ marginTop: 10 }}>
          출입증 번호가 휴대폰에 저장돼 있어요.{' '}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); saveGoogleClientId(''); setSaved(''); }}
          >
            바꾸기
          </a>
        </p>
      )}
    </div>
  );
}
