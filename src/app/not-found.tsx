import Link from 'next/link';

/** 없는 주소로 들어왔을 때 보여주는 화면입니다. (영어 404 대신 친절하게) */
export default function NotFound() {
  return (
    <>
      <h1>🤔 없는 페이지예요</h1>
      <p className="sub">주소를 잘못 눌렀거나, 없어진 화면일 수 있어요.</p>

      <div className="card">
        <p className="note" style={{ marginTop: 0 }}>아래에서 가고 싶은 곳을 골라주세요.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="btn-main" style={{ width: '100%' }}>✏️ 글쓰기로 가기</button>
          </Link>
          <Link href="/setup" style={{ textDecoration: 'none' }}>
            <button className="btn-sub" style={{ width: '100%' }}>⚙️ 처음 설정 도우미</button>
          </Link>
        </div>
      </div>
    </>
  );
}
