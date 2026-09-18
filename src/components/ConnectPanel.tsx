'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Channel } from '@/lib/store';

type AccountInfo = { channel: Channel; name: string; connectedAt: number; extra?: Record<string, string> };

export default function ConnectPanel({ accounts, ok, error }: { accounts: AccountInfo[]; ok?: string; error?: string }) {
  const router = useRouter();
  const [blogId, setBlogId] = useState(accounts.find((a) => a.channel === 'naver')?.extra?.blogId ?? '');
  const [nickname, setNickname] = useState(accounts.find((a) => a.channel === 'hellotalk')?.name ?? '');
  const [msg, setMsg] = useState('');

  const find = (c: Channel) => accounts.find((a) => a.channel === c);

  async function saveManual(channel: 'naver' | 'hellotalk') {
    const res = await fetch('/api/connect/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, blogId, nickname }),
    });
    const data = (await res.json()) as { error?: string };
    setMsg(res.ok ? '저장했어요!' : (data.error ?? '저장에 실패했습니다.'));
    router.refresh();
  }

  async function disconnect(channel: Channel) {
    if (!confirm('정말 연결을 끊을까요?')) return;
    await fetch(`/api/accounts?channel=${channel}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <>
      <h1>🔗 계정 연결</h1>
      <p className="sub">한 번만 연결해두면 계속 쓸 수 있어요.</p>

      {ok && <div className="alert ok">✅ {ok === 'youtube' ? '유튜브' : '인스타그램'} 연결 완료!</div>}
      {error && <div className="alert bad">⚠️ {error}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>▶️ 유튜브</h2>
          {find('youtube') && <span className="badge done">연결됨</span>}
        </div>
        {find('youtube') ? (
          <>
            <p className="note">채널: <b>{find('youtube')!.name}</b></p>
            <button className="btn-sub" onClick={() => disconnect('youtube')}>연결 끊기</button>
          </>
        ) : (
          <>
            <p className="note">구글 계정으로 로그인하면 영상이 자동으로 올라갑니다.</p>
            <a href="/api/connect/google"><button className="btn-main">구글 계정으로 연결하기</button></a>
          </>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>📸 인스타그램</h2>
          {find('instagram') && <span className="badge done">연결됨</span>}
        </div>
        {find('instagram') ? (
          <>
            <p className="note">계정: <b>{find('instagram')!.name}</b></p>
            <button className="btn-sub" onClick={() => disconnect('instagram')}>연결 끊기</button>
          </>
        ) : (
          <>
            <p className="note">
              인스타 계정이 <b>프로페셔널(비즈니스/크리에이터)</b> 이어야 하고, 페이스북 페이지와 연결되어 있어야 해요.
              (인스타 설정 → 계정 → 프로페셔널 계정으로 전환, 무료)
            </p>
            <a href="/api/connect/meta"><button className="btn-main">페이스북으로 연결하기</button></a>
          </>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>🟢 네이버 블로그</h2>
          {find('naver') && <span className="badge manual">반자동</span>}
        </div>
        <p className="note" style={{ marginTop: 0 }}>
          네이버는 자동 글쓰기 기능을 막아놔서 완전 자동은 안 돼요. 대신 아이디만 적어두면 글쓰기 화면을 바로 열어드려요.
        </p>
        <div className="field">
          <label htmlFor="blogId">내 블로그 아이디 (blog.naver.com/<b>여기</b>)</label>
          <input id="blogId" type="text" value={blogId} onChange={(e) => setBlogId(e.target.value)} placeholder="mymusic123" />
        </div>
        <div className="btn-row">
          <button className="btn-main" style={{ flex: 1 }} onClick={() => saveManual('naver')}>저장</button>
          {find('naver') && <button className="btn-sub" onClick={() => disconnect('naver')}>지우기</button>}
        </div>
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>💬 헬로톡</h2>
          {find('hellotalk') && <span className="badge manual">반자동</span>}
        </div>
        <p className="note" style={{ marginTop: 0 }}>
          헬로톡은 외부에서 글을 올리는 공식 방법이 없어요. 켜두면 [복사 + 앱 열기] 버튼이 생깁니다.
        </p>
        <div className="field">
          <label htmlFor="nick">헬로톡 닉네임 (표시용)</label>
          <input id="nick" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="내 헬로톡" />
        </div>
        <div className="btn-row">
          <button className="btn-main" style={{ flex: 1 }} onClick={() => saveManual('hellotalk')}>사용하기</button>
          {find('hellotalk') && <button className="btn-sub" onClick={() => disconnect('hellotalk')}>지우기</button>}
        </div>
      </div>
    </>
  );
}
