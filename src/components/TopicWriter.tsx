'use client';

import { useState } from 'react';
import type { Draft } from '@/lib/research';

const TONES = ['친근하게', '정보전달', '감성적으로', '짧고굵게'] as const;
const LENGTHS = ['짧게', '보통', '길게'] as const;

/**
 * 주제만 적으면 → 인터넷 검색 → 주소 확인 → 글 완성.
 * 완성된 글은 위쪽 글쓰기 칸에 자동으로 채워집니다.
 */
export default function TopicWriter({
  onDraft,
  channelHint,
}: {
  onDraft: (d: Draft) => void;
  channelHint: string;
}) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<(typeof TONES)[number]>('친근하게');
  const [length, setLength] = useState<(typeof LENGTHS)[number]>('보통');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<Draft['sources']>([]);

  async function run() {
    setBusy(true);
    setError('');
    setSources([]);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tone, length, channelHint }),
      });
      const data = (await res.json()) as { draft?: Draft; error?: string };
      if (!res.ok || !data.draft) {
        setError(data.error ?? '글을 만들지 못했습니다.');
        return;
      }
      setSources(data.draft.sources);
      onDraft(data.draft);
    } catch {
      setError('인터넷 연결을 확인해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>🤖 주제만 정하면 자동으로 써드려요</h2>
      <p className="note" style={{ marginTop: 0 }}>
        주제를 적으면 인터넷을 검색하고, 자료 주소까지 직접 열어 확인한 뒤 글을 만들어 줍니다. (1~3분 걸려요)
      </p>

      {error && <div className="alert bad">{error}</div>}

      <div className="field">
        <label htmlFor="topic">주제</label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예) 요즘 유행하는 K-팝 신곡 추천"
        />
      </div>

      <div className="field">
        <label>말투</label>
        <div className="btn-row">
          {TONES.map((t) => (
            <button key={t} className={tone === t ? 'btn-main' : 'btn-sub'} style={{ flex: 1, minWidth: 80 }} onClick={() => setTone(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>분량</label>
        <div className="btn-row">
          {LENGTHS.map((l) => (
            <button key={l} className={length === l ? 'btn-main' : 'btn-sub'} style={{ flex: 1 }} onClick={() => setLength(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-main" disabled={busy || !topic.trim()} onClick={run}>
        {busy ? '검색하고 쓰는 중... 잠시만요 ⏳' : '자동으로 글 만들기'}
      </button>

      {sources.length > 0 && (
        <>
          <p className="note" style={{ marginBottom: 4 }}>📚 참고한 자료 (직접 열어서 확인했어요)</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {sources.map((s) => (
              <li key={s.url} style={{ marginBottom: 4 }}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
