'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Channel } from '@/lib/store';
import { getLocalAccounts, saveNaver, saveHellotalk, removeLocal, type LocalAccounts } from '@/lib/localStore';

type AccountInfo = { channel: Channel; name: string; connectedAt: number; extra?: Record<string, string> };

export default function ConnectPanel({ accounts, ok, error }: { accounts: AccountInfo[]; ok?: string; error?: string }) {
  const router = useRouter();
  const [blogId, setBlogId] = useState('');
  const [nickname, setNickname] = useState('');
  // 메시지는 누른 버튼 바로 아래에 띄웁니다. (맨 위에 띄우면 휴대폰에서 안 보여요)
  const [msg, setMsg] = useState<{ where: 'naver' | 'hellotalk'; text: string } | null>(null);
  // 네이버·헬로톡은 휴대폰 안에 저장합니다. (서버에 쓸 수 없는 곳에서도 동작하도록)
  const [local, setLocal] = useState<LocalAccounts>({});

  useEffect(() => {
    const saved = getLocalAccounts();
    setLocal(saved);
    setBlogId(saved.naver?.blogId ?? '');
    setNickname(saved.hellotalk?.nickname ?? '');
  }, []);

  const find = (c: Channel) => accounts.find((a) => a.channel === c);

  /** 주소를 통째로 붙여넣어도(예: https://blog.naver.com/abc123) 아이디만 뽑아냅니다. */
  function cleanBlogId(input: string): string {
    return input
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^(m\.)?blog\.naver\.com\//i, '')
      .split(/[/?#]/)[0]
      .trim();
  }

  function saveManual(channel: 'naver' | 'hellotalk') {
    if (channel === 'naver') {
      const id = cleanBlogId(blogId);
      if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) {
        setMsg({
          where: 'naver',
          text: '⚠️ 아이디는 영문·숫자로만 되어 있어요. blog.naver.com/ 뒤에 오는 부분을 적어주세요.',
        });
        return;
      }
      setBlogId(id); // 다듬어진 값으로 칸도 정리
      if (!saveNaver(id)) {
        setMsg({ where: 'naver', text: '⚠️ 휴대폰에 저장하지 못했습니다. 시크릿 모드라면 일반 창에서 열어주세요.' });
        return;
      }
      setLocal(getLocalAccounts());
      setMsg({ where: 'naver', text: `✅ 저장 완료! (blog.naver.com/${id})` });
      return;
    }

    if (!saveHellotalk(nickname)) {
      setMsg({ where: 'hellotalk', text: '⚠️ 휴대폰에 저장하지 못했습니다. 시크릿 모드라면 일반 창에서 열어주세요.' });
      return;
    }
    setLocal(getLocalAccounts());
    setMsg({ where: 'hellotalk', text: '✅ 켰습니다! 이제 [글쓰기]에서 고를 수 있어요.' });
  }

  function forgetLocal(channel: 'naver' | 'hellotalk') {
    if (!confirm('정말 지울까요?')) return;
    removeLocal(channel);
    setLocal(getLocalAccounts());
    if (channel === 'naver') setBlogId('');
    else setNickname('');
    setMsg({ where: channel, text: '지웠습니다.' });
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

      <div className="card">
        <h2>⚙️ 처음이신가요?</h2>
        <p className="note" style={{ marginTop: 0 }}>
          버튼만 누르면 필요한 사이트가 바로 열리는 설명서를 준비했어요.
        </p>
        <a href="/setup" style={{ textDecoration: 'none' }}>
          <button className="btn-main" style={{ width: '100%' }}>처음 설정 도우미 열기 →</button>
        </a>
      </div>

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
            <p className="note">
              구글 계정으로 로그인하면 영상이 자동으로 올라갑니다.
              <br />
              아직 준비가 안 됐다면 <a href="/setup">설정 도우미</a>를 먼저 보세요.
            </p>
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
              <br />
              준비 방법은 <a href="/setup">설정 도우미</a>에 버튼으로 정리해뒀어요.
            </p>
            <a href="/api/connect/meta"><button className="btn-main">페이스북으로 연결하기</button></a>
          </>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>🟢 네이버 블로그</h2>
          {local.naver && <span className="badge manual">반자동</span>}
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
          {local.naver && <button className="btn-sub" onClick={() => forgetLocal('naver')}>지우기</button>}
        </div>
        {msg?.where === 'naver' && (
          <div className={`alert ${msg.text.startsWith('⚠️') ? 'bad' : 'ok'}`} style={{ marginTop: 10, marginBottom: 0 }}>
            {msg.text}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>💬 헬로톡</h2>
          {local.hellotalk && <span className="badge manual">반자동</span>}
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
          {local.hellotalk && <button className="btn-sub" onClick={() => forgetLocal('hellotalk')}>지우기</button>}
        </div>
        {msg?.where === 'hellotalk' && (
          <div className={`alert ${msg.text.startsWith('⚠️') ? 'bad' : 'ok'}`} style={{ marginTop: 10, marginBottom: 0 }}>
            {msg.text}
          </div>
        )}
      </div>
    </>
  );
}
