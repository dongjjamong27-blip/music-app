'use client';

import { useMemo, useState } from 'react';
import { SCENES, IMAGE_SITES, subjectFromTitle } from '@/lib/imagePrompt';

/**
 * "그림 만들기" 카드입니다.
 *
 * 이 앱은 그림을 직접 만들지 못해요.
 * 그래서 제목을 보고 주문 문장을 만들어주고,
 * 버튼 한 번에 [복사 + 제미니 열기] 까지 해줍니다.
 */
export default function ImagePromptCard({ title }: { title: string }) {
  const [sceneId, setSceneId] = useState(SCENES[0].id);
  const [subject, setSubject] = useState('');
  const [msg, setMsg] = useState('');
  // 직접 고치신 문장입니다. 안 고치셨으면 null 이고, 이때는 자동으로 만든 문장을 씁니다.
  const [edited, setEdited] = useState<string | null>(null);

  // 제목을 그대로 쓰되, 직접 고치셨으면 그걸 씁니다.
  const auto = useMemo(() => subjectFromTitle(title), [title]);
  const who = (subject.trim() || auto).trim();
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const generated = who ? scene.build(who) : '';

  // 고치신 게 있으면 그걸 우선합니다. 장면 버튼을 눌러도 애써 쓰신 문장이 사라지지 않도록요.
  const prompt = edited ?? generated;
  const isEdited = edited !== null && edited.trim() !== generated.trim();

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  async function go(url: string, name: string) {
    const ok = await copy(prompt);
    setMsg(ok
      ? `문장을 복사했어요. ${name}이 열리면 붙여넣고 보내세요!`
      : '복사가 안 됐어요. 아래 문장을 직접 길게 눌러 복사해주세요.');
    window.open(url, '_blank', 'noreferrer');
  }

  return (
    <div className="card">
      <h2>🎨 그림 만들기 (무료)</h2>
      <p className="note" style={{ marginTop: 0 }}>
        이 앱은 그림을 직접 못 만들어요. 대신 <b>주문 문장</b>을 만들어 드릴게요.
        버튼을 누르면 복사되고 그림 만드는 곳이 바로 열립니다.
      </p>

      <div className="field">
        <label>무엇을 그릴까요?</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={auto || '예) 일본 쿠사츠 온천 마을'}
        />
        {!subject.trim() && auto && (
          <p className="note" style={{ marginTop: 6 }}>제목에서 가져왔어요 → <b>{auto}</b></p>
        )}
      </div>

      <div className="field">
        <label>어떤 장면으로?</label>
        <div className="btn-row" style={{ flexWrap: 'wrap' }}>
          {SCENES.map((s) => (
            <button
              key={s.id}
              className={s.id === sceneId ? 'btn-main' : 'btn-sub'}
              onClick={() => setSceneId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="note" style={{ marginTop: 6 }}>{scene.hint}</p>
      </div>

      {prompt ? (
        <>
          <div className="field">
            <label>주문 문장 (마음대로 고치셔도 돼요)</label>
            <textarea
              value={prompt}
              onChange={(e) => setEdited(e.target.value)}
              style={{ minHeight: 132 }}
              placeholder="어떤 그림을 원하는지 적어주세요."
            />
            <div className="btn-row" style={{ flexWrap: 'wrap', marginTop: 6 }}>
              <button className="btn-sub" onClick={() => setEdited(null)} disabled={edited === null}>
                ↩️ 처음 문장으로
              </button>
              <button
                className="btn-sub"
                onClick={() => setEdited(`${prompt.trim()} 사람 얼굴은 나오지 않게 해줘.`)}
              >
                + 얼굴 없이
              </button>
              <button
                className="btn-sub"
                onClick={() => setEdited(`${prompt.trim()} 눈이 내리는 겨울 분위기로.`)}
              >
                + 겨울로
              </button>
              <button
                className="btn-sub"
                onClick={() => setEdited(`${prompt.trim()} 저녁 무렵의 따뜻한 불빛으로.`)}
              >
                + 저녁으로
              </button>
            </div>
            {isEdited && (
              <p className="note" style={{ marginTop: 6 }}>
                ✏️ 직접 고치신 문장을 쓰고 있어요. 장면 버튼을 눌러도 이 문장은 그대로 둡니다.
                자동으로 만든 문장으로 돌아가려면 <b>[↩️ 처음 문장으로]</b> 를 누르세요.
              </p>
            )}
          </div>

          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            {IMAGE_SITES.map((site, i) => (
              <button
                key={site.id}
                className={i === 0 ? 'btn-main' : 'btn-sub'}
                style={i === 0 ? { flex: 1, minWidth: 180 } : undefined}
                onClick={() => go(site.url, site.name)}
              >
                {i === 0 ? `복사 + ${site.name} 열기 ↗` : `${site.name} ↗`}
              </button>
            ))}
          </div>
          <p className="note" style={{ marginTop: 6 }}>
            {IMAGE_SITES.map((s) => `${s.name}(${s.note})`).join(' · ')}
          </p>
        </>
      ) : (
        <p className="note">⬆️ 위에 제목을 쓰시거나, 그릴 것을 직접 적어주세요.</p>
      )}

      {msg && <p className="note">✅ {msg}</p>}

      <p className="note" style={{ marginTop: 10 }}>
        ⚠️ AI가 만든 그림은 저작권 걱정이 없지만 <b>실제 사진은 아닙니다.</b>
        글 맨 아래에 <code>※ 이미지는 AI로 만든 일러스트입니다</code> 한 줄을 넣어주세요.
      </p>
    </div>
  );
}
