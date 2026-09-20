'use client';

import { useEffect, useState } from 'react';
import type { HandoffPlan } from '@/lib/handoff';

/**
 * 네이버 블로그 / 헬로톡으로 "내용 복사 + 앱 열기"를 한 번에 해주는 버튼입니다.
 * 헬로톡처럼 글자수 제한이 있는 곳은 여러 조각으로 나눠서 하나씩 복사해줍니다.
 */
export default function HandoffButtons({
  plans,
  files = [],
}: {
  plans: HandoffPlan[];
  files?: File[];
}) {
  const [done, setDone] = useState<Record<string, string>>({});

  // 휴대폰이 "글 + 사진"을 한 번에 다른 앱으로 넘겨줄 수 있는지 확인합니다.
  // (안드로이드 크롬은 대부분 됩니다. 컴퓨터 브라우저는 보통 안 됩니다)
  const [canShareFiles, setCanShareFiles] = useState(false);
  useEffect(() => {
    try {
      setCanShareFiles(files.length > 0 && Boolean(navigator.canShare?.({ files })));
    } catch {
      setCanShareFiles(false);
    }
  }, [files]);

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 오래된 브라우저용 예비 방법
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

  async function go(plan: HandoffPlan) {
    const copied = await copy(plan.parts[0] ?? plan.text);
    setDone((d) => ({ ...d, [plan.channel]: copied ? plan.hint : '복사가 안 됐어요. 아래 내용을 직접 길게 눌러 복사해주세요.' }));

    // 앱을 열어봅니다. 앱이 없으면 1.2초 뒤 웹페이지로 넘어갑니다.
    const started = Date.now();
    location.href = plan.appUrl;
    setTimeout(() => {
      if (Date.now() - started < 2000 && !document.hidden) window.open(plan.webUrl, '_blank');
    }, 1200);
  }

  async function copyPart(plan: HandoffPlan, index: number) {
    const ok = await copy(plan.parts[index]);
    setDone((d) => ({
      ...d,
      [plan.channel]: ok
        ? `${index + 1}번째 조각을 복사했어요. 헬로톡에 붙여넣고 올리세요.`
        : '복사가 안 됐어요. 아래 미리보기에서 직접 복사해주세요.',
    }));
  }

  /** 글과 사진을 한 번에 다른 앱으로 넘깁니다. (휴대폰 공유창이 뜹니다) */
  async function shareWithFiles(plan: HandoffPlan) {
    const text = plan.parts[0] ?? plan.text;
    // 공유창에서 글이 빠지는 앱도 있어서, 붙여넣을 수 있게 복사도 해둡니다.
    await copy(text);
    try {
      await navigator.share({ text, files });
      setDone((d) => ({ ...d, [plan.channel]: '넘겼어요! 글이 안 들어갔으면 길게 눌러 붙여넣기 하시면 됩니다.' }));
    } catch {
      /* 사용자가 취소한 경우 - 무시 */
    }
  }

  async function share(plan: HandoffPlan) {
    const text = plan.parts[0] ?? plan.text;
    if (navigator.share) {
      try {
        await navigator.share({ title: plan.label, text });
        return;
      } catch {
        /* 사용자가 취소한 경우 - 무시 */
      }
    }
    await copy(text);
    setDone((d) => ({ ...d, [plan.channel]: '내용을 복사했어요. 앱을 열고 붙여넣어 주세요.' }));
  }

  return (
    <>
      {plans.map((plan) => (
        <div key={plan.channel} style={{ marginBottom: 14 }}>
          {canShareFiles && (
            <button
              className="btn-main"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => shareWithFiles(plan)}
            >
              📷 사진과 함께 {plan.label}에 보내기
            </button>
          )}

          <div className="btn-row">
            <button className={canShareFiles ? 'btn-sub' : 'btn-main'} style={{ flex: 1 }} onClick={() => go(plan)}>
              {plan.label} 열기 + 복사
            </button>
            <button className="btn-sub" onClick={() => share(plan)}>글만 공유</button>
          </div>

          {files.length > 0 && !canShareFiles && (
            <p className="note">
              이 브라우저는 사진을 한 번에 넘기지 못해요. 글을 붙여넣은 뒤
              <b> {plan.label} 앱에서 사진을 직접 고르시면</b> 됩니다.
            </p>
          )}

          {plan.parts.length > 1 && (
            <>
              <p className="note" style={{ marginBottom: 6 }}>
                ✂️ 글이 {plan.limit}자를 넘어서 <b>{plan.parts.length}개</b>로 나눴어요.
                하나씩 복사해서 차례로 올려주세요.
              </p>
              <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                {plan.parts.map((part, i) => (
                  <button key={i} className="btn-sub" onClick={() => copyPart(plan, i)}>
                    {i + 1}번째 복사 ({part.length}자)
                  </button>
                ))}
              </div>
            </>
          )}

          {done[plan.channel] && <p className="note">✅ {done[plan.channel]}</p>}
        </div>
      ))}
    </>
  );
}
