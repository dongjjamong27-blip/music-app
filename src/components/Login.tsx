'use client';

import { useState } from 'react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) location.reload();
    else setError(((await res.json()) as { error?: string }).error ?? '로그인에 실패했습니다.');
  }

  return (
    <>
      <h1>🔒 한번에 올리기</h1>
      <p className="sub">나만 쓸 수 있게 잠가뒀어요. 비밀번호를 넣어주세요.</p>
      <form className="card" onSubmit={submit}>
        {error && <div className="alert bad">{error}</div>}
        <div className="field">
          <label htmlFor="pw">비밀번호</label>
          <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button className="btn-main" disabled={busy || !password}>{busy ? '확인 중...' : '들어가기'}</button>
      </form>
    </>
  );
}
