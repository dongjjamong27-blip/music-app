'use client';

import { useEffect, useState } from 'react';
import type { HandoffPlan } from '@/lib/handoff';

/**
 * 네이버 블로그 / 헬로톡으로 내용을 넘기는 버튼들입니다.
 *
 * 왜 "복사"와 "앱 열기"를 나눴나요?
 *  복사하자마자 앱을 열면, 복사가 실패해도 화면이 넘어가 버려서
 *  붙여넣을 때가 되어서야 "아무것도 없네" 하고 알게 됩니다.
 *  그래서 ① 복사 → 눈으로 확인 → ② 앱 열기 순서로 바꿨습니다.
 *
 * 그리고 복사는 브라우저마다 막히는 경우가 있어서,
 * 아래에 내용 상자를 항상 띄워둡니다. 버튼이 안 되면 직접 길게 눌러 복사하시면 됩니다.
 */

/** 옛 방식(execCommand)을 먼저 씁니다. 휴대폰 브라우저에서 제일 잘 통합니다. */
function copyOldWay(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.padding = '0';
    ta.style.border = 'none';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length); // 아이폰은 이게 있어야 선택됩니다
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

async function copyText(text: string): Promise<boolean> {
  if (copyOldWay(text)) return true;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function HandoffButtons({
  plans,
  files = [],
}: {
  plans: HandoffPlan[];
  files?: File[];
}) {
  // 채널별로 "몇 번째 조각을 복사했는지"와 안내 문구를 따로 들고 있습니다.
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [part, setPart] = useState<Record<string, number>>({});

  const [canShareFiles, setCanShareFiles] = useState(false);
  const [canShareText, setCanShareText] = useState(false);
  useEffect(() => {
    try {
      setCanShareText(typeof navigator.share === 'function');
      setCanShareFiles(files.length > 0 && Boolean(navigator.canShare?.({ files })));
    } catch {
      setCanShareText(false);
      setCanShareFiles(false);
    }
  }, [files]);

  function textOf(plan: HandoffPlan, index: number): string {
    return plan.parts[index] ?? plan.text;
  }

  async function doCopy(plan: HandoffPlan, index: number) {
    const ok = await copyText(textOf(plan, index));
    setPart((p) => ({ ...p, [plan.channel]: index }));
    setMsg((m) => ({
      ...m,
      [plan.channel]: ok
        ? { ok: true, text: `복사됐어요! 이제 아래 [${plan.label} 열기] 를 누르고 붙여넣으세요.` }
        : { ok: false, text: '이 브라우저는 복사 버튼이 막혀 있어요. 아래 상자를 길게 눌러 직접 복사해주세요.' },
    }));
  }

  function openApp(plan: HandoffPlan) {
    // 앱이 없으면 1.2초 뒤 웹페이지로 넘어갑니다.
    const started = Date.now();
    location.href = plan.appUrl;
    setTimeout(() => {
      if (Date.now() - started < 2000 && !document.hidden) window.open(plan.webUrl, '_blank');
    }, 1200);
  }

  /** 공유창으로 넘기면 클립보드를 쓰지 않아서, 복사가 막힌 기기에서도 됩니다. */
  async function share(plan: HandoffPlan, index: number, withFiles: boolean) {
    const text = textOf(plan, index);
    try {
      await navigator.share(withFiles ? { text, files } : { text });
      setMsg((m) => ({ ...m, [plan.channel]: { ok: true, text: '넘겼어요!' } }));
    } catch {
      /* 사용자가 취소한 경우 - 무시 */
    }
  }

  return (
    <>
      {plans.map((plan) => {
        const index = part[plan.channel] ?? 0;
        const info = msg[plan.channel];
        const multi = plan.parts.length > 1;

        return (
          <div key={plan.channel} style={{ marginBottom: 18 }}>
            <p className="note" style={{ marginTop: 0, marginBottom: 6 }}>
              <b>{plan.label}</b> — ① 복사 → ② 앱 열기 → 붙여넣기
            </p>

            {multi && (
              <>
                <p className="note" style={{ marginBottom: 6 }}>
                  ✂️ 글이 {plan.limit}자를 넘어서 <b>{plan.parts.length}개</b>로 나눴어요.
                  하나씩 복사해서 차례로 올려주세요.
                </p>
                <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                  {plan.parts.map((p, i) => (
                    <button
                      key={i}
                      className={i === index ? 'btn-main' : 'btn-sub'}
                      onClick={() => doCopy(plan, i)}
                    >
                      {i + 1}번째 복사 ({p.length}자)
                    </button>
                  ))}
                </div>
              </>
            )}

            {!multi && (
              <button className="btn-main" style={{ width: '100%' }} onClick={() => doCopy(plan, 0)}>
                ① 내용 복사하기
              </button>
            )}

            <button
              className="btn-main"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => openApp(plan)}
            >
              ② {plan.label} 열기
            </button>

            {(canShareText || canShareFiles) && (
              <button
                className="btn-sub"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => share(plan, index, canShareFiles)}
              >
                {canShareFiles ? '📷 사진과 함께 공유로 보내기' : '공유로 보내기 (복사가 안 될 때)'}
              </button>
            )}

            {info && (
              <p className="note" style={{ color: info.ok ? undefined : 'var(--bad)' }}>
                {info.ok ? '✅' : '⚠️'} {info.text}
              </p>
            )}

            <details style={{ marginTop: 8 }}>
              <summary className="note" style={{ cursor: 'pointer' }}>
                복사가 안 되면 여기를 눌러 직접 복사하세요
              </summary>
              <textarea
                readOnly
                value={textOf(plan, index)}
                style={{ minHeight: 160, marginTop: 6 }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <p className="note">
                상자를 길게 눌러 <b>전체 선택 → 복사</b> 하시면 됩니다.
              </p>
            </details>
          </div>
        );
      })}
    </>
  );
}
