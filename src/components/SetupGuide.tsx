'use client';

import { useState } from 'react';

/**
 * "처음 설정 도우미" 화면입니다.
 * 버튼을 누르면 필요한 사이트의 정확한 페이지가 바로 열립니다.
 * 붙여넣어야 하는 주소는 [복사] 버튼으로 한 번에 복사됩니다.
 */

/** 새 탭으로 그 페이지를 바로 여는 버튼 */
function OpenButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flex: 1, minWidth: 150 }}>
      <button className="btn-main" style={{ width: '100%' }}>{children} ↗</button>
    </a>
  );
}

/** 값을 보여주고 한 번에 복사해주는 줄 */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
        <input type="text" readOnly value={value} onFocus={(e) => e.target.select()} />
        <button className="btn-sub" style={{ whiteSpace: 'nowrap' }} onClick={copy}>
          {copied ? '복사됨 ✓' : '복사'}
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2>
        <span className="step-no">{n}</span> {title}
      </h2>
      {children}
    </div>
  );
}

export default function SetupGuide({
  appUrl,
  passwordSet,
  canSaveOnServer,
}: {
  appUrl: string;
  passwordSet: boolean;
  canSaveOnServer: boolean;
}) {
  const [key, setKey] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/logout', { method: 'POST' });
    location.href = '/';
  }

  const base = appUrl || '아직-내주소를-모릅니다';
  const googleRedirect = `${base}/api/connect/google/callback`;
  const metaRedirect = `${base}/api/connect/meta/callback`;

  function makeKey() {
    // 브라우저가 만들어주는 진짜 무작위 값이라 안전합니다.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setKey(Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''));
  }

  return (
    <>
      <h1>⚙️ 처음 설정 도우미</h1>
      <p className="sub">버튼을 누르면 필요한 페이지가 바로 열려요. 순서대로만 따라오세요.</p>

      <div className="card">
        <h2>🔒 앱 잠금 (로그인)</h2>
        {passwordSet ? (
          <>
            <p className="note" style={{ marginTop: 0 }}>
              ✅ 비밀번호가 켜져 있습니다. 주소를 알아도 비밀번호 없이는 못 들어와요.
            </p>
            <button className="btn-sub" style={{ width: '100%' }} disabled={loggingOut} onClick={logout}>
              {loggingOut ? '나가는 중...' : '로그아웃 (잠금 확인해보기)'}
            </button>
          </>
        ) : (
          <>
            <p className="note" style={{ marginTop: 0, color: 'var(--bad)' }}>
              ⚠️ <b>지금은 잠금이 꺼져 있습니다.</b> 이 주소를 아는 사람은 누구나 들어와서
              회원님 이름으로 글을 올릴 수 있어요.
            </p>
            <p className="note">
              Vercel에 <b>APP_PASSWORD</b> 를 넣으면 바로 켜집니다. 아래 버튼으로 가서
              <b> Key</b> 에 <code>APP_PASSWORD</code>, <b>Value</b> 에 원하는 비밀번호를 넣고 저장하세요.
            </p>
            <CopyRow label="환경변수 이름" value="APP_PASSWORD" />
            <div className="btn-row">
              <OpenButton href="https://vercel.com/dashboard">Vercel 열기</OpenButton>
            </div>
          </>
        )}
      </div>

      {!canSaveOnServer && (
        <div className="card">
          <h2>💾 저장에 대해 (꼭 읽어주세요)</h2>
          <p className="note" style={{ marginTop: 0 }}>
            이 서버는 <b>파일을 저장할 수 없는 곳</b>이에요 (Vercel은 읽기 전용입니다).
          </p>
          <div style={{ fontSize: 14, lineHeight: 1.9 }}>
            ✅ <b>네이버 · 헬로톡</b> — 휴대폰에 저장돼서 <b>정상 동작합니다</b><br />
            ⚠️ <b>유튜브 · 인스타</b> — 계정 연결을 저장할 수 없어 <b>아직 사용할 수 없습니다</b>
          </div>
          <p className="note">
            유튜브·인스타까지 쓰시려면 저장소를 붙여야 합니다.
            필요하시면 말씀해주세요 — 무료로 붙이는 방법을 안내해드릴게요.
          </p>
        </div>
      )}

      {!appUrl && (
        <div className="alert bad">
          ⚠️ <b>APP_URL</b> 환경변수가 아직 없어요. 배포한 뒤 진짜 주소를 넣고 다시 배포하면 아래 주소들이 자동으로 채워집니다.
        </div>
      )}

      <Step n={1} title="🔐 비밀 열쇠 만들기">
        <p className="note" style={{ marginTop: 0 }}>
          내 계정 정보를 잠그는 데 쓰는 열쇠예요. 버튼만 누르면 안전한 값이 만들어집니다.
        </p>
        <button className="btn-main" onClick={makeKey}>열쇠 만들기</button>
        {key && <div style={{ marginTop: 12 }}><CopyRow label="ENCRYPTION_KEY (복사해서 Vercel에 붙여넣기)" value={key} /></div>}
      </Step>

      <Step n={2} title="▶️ 유튜브 자동 업로드 준비">
        <p className="note" style={{ marginTop: 0 }}>① 먼저 유튜브 기능을 켭니다. (파란 버튼 → [사용] 클릭)</p>
        <div className="btn-row">
          <OpenButton href="https://console.cloud.google.com/apis/library/youtube.googleapis.com">
            유튜브 API 켜러 가기
          </OpenButton>
        </div>

        <p className="note">② 그다음 &quot;출입증&quot;을 만듭니다. 유형은 <b>웹 애플리케이션</b>을 고르세요.</p>
        <div className="btn-row">
          <OpenButton href="https://console.cloud.google.com/apis/credentials/oauthclient">
            출입증 만들러 가기
          </OpenButton>
        </div>

        <p className="note">③ &quot;승인된 리디렉션 URI&quot; 칸에 아래 주소를 그대로 붙여넣으세요.</p>
        <CopyRow label="승인된 리디렉션 URI" value={googleRedirect} />

        <p className="note">④ 나온 <b>클라이언트 ID</b>와 <b>보안 비밀번호</b>를 Vercel 환경변수에 넣습니다.</p>
        <CopyRow label="환경변수 이름 1" value="GOOGLE_CLIENT_ID" />
        <CopyRow label="환경변수 이름 2" value="GOOGLE_CLIENT_SECRET" />
      </Step>

      <Step n={3} title="📸 인스타 자동 등록 준비">
        <p className="note" style={{ marginTop: 0 }}>
          ① 인스타 앱에서 내 계정을 <b>프로페셔널(비즈니스/크리에이터)</b> 로 바꾸고, <b>페이스북 페이지</b>와 연결하세요. (둘 다 무료)
        </p>
        <div className="btn-row">
          <OpenButton href="https://www.facebook.com/pages/create">페이스북 페이지 만들기</OpenButton>
        </div>

        <p className="note">② 페이스북 개발자 사이트에서 앱을 만듭니다. 유형은 <b>비즈니스</b>를 고르세요.</p>
        <div className="btn-row">
          <OpenButton href="https://developers.facebook.com/apps/create/">페이스북 앱 만들러 가기</OpenButton>
        </div>

        <p className="note">③ 앱 안에서 [Facebook 로그인 → 설정]으로 가서 아래 주소를 붙여넣으세요.</p>
        <CopyRow label="유효한 OAuth 리디렉션 URI" value={metaRedirect} />

        <p className="note">④ 앱 ID와 시크릿 코드를 Vercel 환경변수에 넣습니다.</p>
        <CopyRow label="환경변수 이름 1" value="META_APP_ID" />
        <CopyRow label="환경변수 이름 2" value="META_APP_SECRET" />
      </Step>

      <Step n={4} title="🤖 주제 자동 글쓰기 준비 (선택)">
        <p className="note" style={{ marginTop: 0 }}>
          주제만 적으면 알아서 검색하고 글을 써주는 기능이에요. 안 쓰실 거면 건너뛰어도 됩니다.
        </p>
        <div className="btn-row">
          <OpenButton href="https://console.anthropic.com/settings/keys">API 키 발급받으러 가기</OpenButton>
        </div>
        <CopyRow label="환경변수 이름" value="ANTHROPIC_API_KEY" />
      </Step>

      <Step n={5} title="📋 Vercel에 환경변수 넣기">
        <p className="note" style={{ marginTop: 0 }}>
          위에서 복사한 값들을 여기에 붙여넣습니다. <b>Settings → Environment Variables</b> 를 찾으세요.
          값을 넣은 뒤에는 꼭 <b>다시 배포(Redeploy)</b> 해야 적용됩니다.
        </p>
        <div className="btn-row">
          <OpenButton href="https://vercel.com/dashboard">Vercel 열기</OpenButton>
        </div>
      </Step>

      <Step n={6} title="✅ 마지막! 계정 연결하기">
        <p className="note" style={{ marginTop: 0 }}>여기까지 했으면 [연결] 탭에서 버튼만 누르면 끝입니다.</p>
        <a href="/connect" style={{ textDecoration: 'none' }}>
          <button className="btn-main" style={{ width: '100%' }}>연결하러 가기 →</button>
        </a>
      </Step>
    </>
  );
}
