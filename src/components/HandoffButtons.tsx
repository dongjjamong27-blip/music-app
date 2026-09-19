'use client';

import { useState } from 'react';
import type { HandoffPlan } from '@/lib/handoff';

/**
 * 네이버 블로그 / 헬로톡으로 "내용 복사 + 앱 열기"를 한 번에 해주는 버튼입니다.
 * 헬로톡처럼 글자수 제한이 있는 곳은 여러 조각으로 나눠서 하나씩 복사해줍니다.
 */
export default function HandoffButtons({ plans }: { plans: HandoffPlan[] }) {
  const [done, setDone] = useState<Record<string, string>>({});

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
          <div className="btn-row">
            <button className="btn-main" style={{ flex: 1 }} onClick={() => go(plan)}>
              {plan.label} 열기 + 복사
            </button>
            <button className="btn-sub" onClick={() => share(plan)}>공유</button>
          </div>

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
