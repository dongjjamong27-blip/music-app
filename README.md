# 📱 한번에 올리기

**글 한 번만 쓰면 → 유튜브 · 인스타그램 · 네이버 블로그 · 헬로톡에 올려주는 휴대폰용 앱입니다.**

주제만 정해주면 **인터넷을 검색하고 자료 주소까지 확인해서 글을 대신 써주는 기능**도 들어있어요.

---

## 🙋 먼저 솔직하게 (중요!)

| 어디에 | 자동으로 올라가나요? | 왜요? |
|---|---|---|
| ▶️ 유튜브 | ✅ **완전 자동** | 구글이 공식 통로(API)를 열어놨어요 |
| 📸 인스타그램 | ✅ **완전 자동** | 메타가 공식 통로를 열어놨어요 |
| 🟢 네이버 블로그 | ⚠️ **버튼 1번 (반자동)** | 네이버가 자동 글쓰기를 막았어요 |
| 💬 헬로톡 | ⚠️ **버튼 1번 (반자동)** | 공식 통로가 아예 없어요 |

**반자동이 뭔가요?**
버튼을 누르면 → 글 내용이 자동으로 **복사**되고 → 앱이 **바로 열립니다**.
거기서 화면을 길게 눌러 **"붙여넣기"** 하고 **[발행]** 만 누르면 끝이에요. (5초)

> 몰래 자동으로 올리는 방법(매크로)은 **일부러 쓰지 않았습니다.** 계정이 정지될 수 있거든요.

---

## ⚡ 바로가기 (누르면 그 페이지로 갑니다)

설정하다 막히면 아래를 그냥 누르세요. 필요한 정확한 페이지로 바로 이동합니다.

| 무엇을 | 바로가기 |
|---|---|
| 0️⃣ 배포할 브랜치를 `main`으로 | Vercel 프로젝트 → `Settings` → `Git` → **`Production Branch`** → `main` → `Save` |
| 1️⃣ Vercel에 처음 올리기 | **[새 프로젝트 만들기](https://vercel.com/new)** → `music-app` 선택 |
| 2️⃣ Vercel 환경변수 넣기 | **[Vercel 대시보드](https://vercel.com/dashboard)** → 프로젝트 → `Settings` → `Environment Variables` |
| 3️⃣ 유튜브 기능 켜기 | **[YouTube Data API 켜기](https://console.cloud.google.com/apis/library/youtube.googleapis.com)** |
| 4️⃣ 구글 출입증 만들기 | **[OAuth 클라이언트 만들기](https://console.cloud.google.com/apis/credentials/oauthclient)** (유형: 웹 애플리케이션) |
| 5️⃣ 페이스북 페이지 만들기 | **[페이지 만들기](https://www.facebook.com/pages/create)** |
| 6️⃣ 페이스북 앱 만들기 | **[앱 만들기](https://developers.facebook.com/apps/create/)** (유형: 비즈니스) |
| 7️⃣ 자동 글쓰기 API 키 | **[Anthropic 키 발급](https://console.anthropic.com/settings/keys)** |

> 💡 **더 편한 방법:** 배포가 끝나면 앱 안에 **[⚙️ 설정]** 탭이 생깁니다.
> 거기서는 위 버튼들이 전부 들어있고, **붙여넣을 주소도 [복사] 버튼 한 번**이면 됩니다.
> 비밀 열쇠(`ENCRYPTION_KEY`)도 버튼 한 번으로 만들어 줍니다.

### 붙여넣어야 하는 주소 (내 주소로 바꿔서)

| 어디에 | 무엇을 |
|---|---|
| 구글 → 승인된 리디렉션 URI | `https://내주소/api/connect/google/callback` |
| 페이스북 → 유효한 OAuth 리디렉션 URI | `https://내주소/api/connect/meta/callback` |

---

## 🚀 시작하기 (처음 한 번만)

### 1단계. 인터넷에 올리기 (무료)

이 앱은 인터넷에 올려놔야 휴대폰에서 쓸 수 있어요. **Vercel**이 제일 쉽습니다.

1. 이 저장소를 내 깃허브로 가져옵니다.
2. [vercel.com](https://vercel.com) 에 깃허브로 로그인 → **Add New → Project** → 이 저장소 선택
3. **Environment Variables** 칸에 아래 3개를 먼저 넣습니다.

| 이름 | 값 |
|---|---|
| `APP_URL` | 배포 후 받은 주소 (예: `https://my-post.vercel.app`) — Vercel이면 안 넣어도 자동으로 찾습니다 |
| `ENCRYPTION_KEY` | 아무 글자나 **32자 이상** 길게 (비밀 열쇠예요) |
| `APP_PASSWORD` | 앱에 들어갈 때 쓸 내 비밀번호 |

4. **Deploy** 를 누릅니다. 끝!

> 💡 `APP_URL` 은 배포가 끝나야 주소를 알 수 있죠? **Vercel에 올렸다면 비워두셔도 됩니다.**
> 앱이 Vercel이 알려주는 진짜 주소를 스스로 찾아 씁니다. 나중에 내 도메인을 붙이면 그때 넣어주세요.

### 2단계. 휴대폰 홈 화면에 추가하기

휴대폰 브라우저로 내 주소에 접속 → 공유 버튼 → **"홈 화면에 추가"**
이러면 **진짜 앱처럼** 아이콘이 생깁니다. 📲

### 3단계. 계정 연결하기

앱을 열고 아래 **[🔗 연결]** 탭에서 연결하면 됩니다. (자세한 방법은 바로 아래)

---

## 🔑 계정 연결 방법

### ▶️ 유튜브 (완전 자동)

1. [Google Cloud Console](https://console.cloud.google.com) 접속 → 프로젝트 만들기
2. **API 및 서비스 → 라이브러리** → `YouTube Data API v3` 검색 → **사용 설정**
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 유형: **웹 애플리케이션**
   - 승인된 리디렉션 URI: `https://내주소/api/connect/google/callback`
4. 나온 **클라이언트 ID / 비밀번호**를 Vercel 환경변수에 넣기
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
5. 앱 → [연결] 탭 → **구글 계정으로 연결하기**

### 📸 인스타그램 (완전 자동)

먼저 준비물 2개가 필요해요:
- 인스타 계정을 **프로페셔널(비즈니스/크리에이터)** 로 바꾸기 → 인스타 설정 → 계정 → 프로페셔널 전환 (무료)
- **페이스북 페이지**와 연결하기

그다음:
1. [Facebook 개발자](https://developers.facebook.com) → **앱 만들기** → "비즈니스" 선택
2. **Instagram Graph API** 제품 추가
3. **Facebook 로그인 → 설정** → 유효한 OAuth 리디렉션 URI에
   `https://내주소/api/connect/meta/callback` 넣기
4. 앱 ID / 시크릿을 Vercel 환경변수에 넣기
   - `META_APP_ID`, `META_APP_SECRET`
5. 앱 → [연결] 탭 → **페이스북으로 연결하기**

### 🟢 네이버 블로그 / 💬 헬로톡 (반자동)

복잡한 거 없어요. [연결] 탭에서
- 네이버: 내 블로그 아이디만 적고 **저장**
- 헬로톡: **사용하기** 누르면 끝

---

## 🤖 주제 자동 글쓰기 (선택)

주제만 적으면 → 인터넷 검색 → 자료 주소 직접 열어 확인 → 글 완성!

1. [console.anthropic.com](https://console.anthropic.com) 에서 API 키 발급
2. Vercel 환경변수에 `ANTHROPIC_API_KEY` 추가
3. 앱 [글쓰기] 탭 맨 위에 **"🤖 주제만 정하면 자동으로 써드려요"** 칸이 생깁니다

말투(친근하게 / 정보전달 / 감성적으로 / 짧고굵게)와 분량(짧게 / 보통 / 길게)도 고를 수 있어요.
글이 만들어지면 **참고한 자료 주소**도 같이 보여줍니다. 검색으로 확인 안 된 내용은 지어내지 않도록 해뒀어요.

---

## ⏰ 예약 발행 (선택)

글쓰기 화면에서 시간을 정하면 그때 자동으로 올라갑니다.

Vercel **무료(Hobby) 플랜은 자동 확인을 하루 1번**까지만 허용합니다.
그래서 `vercel.json`은 매일 새벽 0시 5분(UTC)에 한 번만 확인하도록 해뒀어요.

**분 단위로 정확히 예약하고 싶다면** 무료 예약 서비스를 하나 걸어두면 됩니다:

1. [cron-job.org](https://cron-job.org) 가입 (무료)
2. 아래 주소를 **10분마다** 부르도록 등록

```
https://내주소/api/cron?key=CRON_SECRET에넣은값
```

> 💡 Vercel Pro 플랜을 쓰신다면 `vercel.json`의 `schedule`을 `*/10 * * * *` 로 바꾸면 됩니다.

---

## 💻 내 컴퓨터에서 돌려보기

```bash
npm install
cp .env.example .env     # .env 파일을 열어서 값 채우기
npm run dev              # http://localhost:3000
```

> 💡 인스타 자동 등록은 **인터넷에 올라간 주소**가 있어야 동작해요. (인스타가 사진을 가져가야 하거든요)
> 내 컴퓨터에서는 유튜브 · 네이버 · 헬로톡까지만 테스트할 수 있습니다.

---

## 📂 파일이 어디에 뭐가 있나요?

```
src/
 ├ app/                     화면과 서버 기능
 │  ├ page.tsx              ✏️ 글쓰기 화면
 │  ├ connect/              🔗 계정 연결 화면
 │  ├ setup/                ⚙️ 처음 설정 도우미 (바로가기 버튼 모음)
 │  ├ history/              📋 기록 화면
 │  └ api/                  서버가 하는 일들
 │     ├ posts/             글 올리기
 │     ├ upload/            사진·영상 받기
 │     ├ research/          🤖 주제로 글 만들기
 │     ├ connect/           계정 연결
 │     └ cron/              ⏰ 예약 발행
 ├ components/              화면 조각들
 └ lib/
    ├ youtube.ts            유튜브 업로드
    ├ instagram.ts          인스타 업로드
    ├ handoff.ts            네이버·헬로톡 보내기
    ├ research.ts           🤖 검색해서 글 쓰기
    ├ store.ts              데이터 저장 (data/db.json)
    ├ crypto.ts             비밀 정보 잠그기
    ├ appUrl.ts             내 앱 주소 찾기 (Vercel 자동 감지)
    └ publish.ts            전체 지휘
```

---

## 🚑 배포가 안 될 때 (실제로 겪은 것들)

### 1. `Build Failed — Vulnerable version of Next.js detected`

Vercel은 **보안 취약점이 있는 Next.js 버전은 빌드를 거부**합니다.
내 컴퓨터에서는 잘 되는데 Vercel에서만 실패한다면 이걸 의심하세요.

```bash
npm install next@latest   # 또는 npm audit 로 확인
```

> 💡 단서: `npm ci` 할 때 `npm warn deprecated next@...: This version has a security vulnerability` 경고가 나옵니다.

### 2. 배포는 성공(`Ready`)인데 모든 주소가 `404 NOT_FOUND`

가장 흔한 원인은 Vercel이 **이 프로젝트를 Next.js로 인식하지 못한 것**입니다.
(프로젝트를 만들 때 Next.js가 아닌 브랜치를 읽으면 `Framework Preset`이 `Other`로 잡힙니다)

그러면 빌드는 되지만 **`public/` 폴더를 웹사이트로 내보내서** 모든 경로가 404가 됩니다.

이 저장소는 `vercel.json`에 `"framework": "nextjs"` 를 박아둬서 자동으로 해결됩니다.
그래도 안 되면 `Settings` → `Build and Deployment` → **`Framework Preset`** 을 `Next.js` 로 바꾸세요.

**또 다른 원인:** 배포가 **Preview(연습용)** 로만 올라간 경우.
`Settings` → `Git` → **`Production Branch`** 를 `main` 으로 바꾸고 **`Save`** 한 뒤, 다시 한 번 푸시하세요.
(화면이 자동 번역돼 있으면 `Preview`가 **"시사"**, `Production`이 **"생산"** 으로 보입니다)

### 3. `maxDuration` / cron 관련 실패

무료(Hobby) 플랜 한도입니다.
- 함수 실행 시간: **60초 이내**
- 자동 예약(cron): **하루 1번**

이 저장소는 이미 무료 플랜에 맞춰져 있습니다.

---

## ❓ 자주 묻는 질문

**Q. 비밀번호를 안 정하면 어떻게 되나요?**
누구나 내 주소를 알면 들어와서 내 계정으로 글을 올릴 수 있어요. **꼭 정하세요.**

**Q. 내 계정 비밀번호가 저장되나요?**
아니요. 구글·페이스북이 준 **출입증(토큰)** 만 저장되고, 그것도 자물쇠로 잠가서 보관합니다.

**Q. 유튜브 업로드가 "할당량 초과"래요.**
구글이 하루에 올릴 수 있는 양을 정해둬서 그래요 (기본 하루 6개 정도). 다음날이면 풀립니다.

**Q. 인스타에서 "프로페셔널 계정을 못 찾았다"고 나와요.**
인스타를 비즈니스/크리에이터로 바꾸고, **페이스북 페이지와 연결**했는지 확인해주세요.

**Q. 영상은 얼마나 큰 것까지 되나요?**
200MB까지요. 더 큰 영상은 휴대폰에서 화질을 조금 낮춰 저장한 뒤 올려주세요.

**Q. 배포가 "Deployment failed" 로 실패해요.**
Vercel **무료 플랜 제한**을 넘으면 실패합니다. 이 앱은 무료 플랜에 맞춰뒀어요:
- 한 번에 일하는 시간 **60초 이내**
- 자동 예약 확인 **하루 1번**

**Q. 인스타에 영상 올릴 때 "시간이 더 필요합니다" 라고 나와요.**
무료 플랜은 60초 제한이 있어서, 영상이 길면 변환이 안 끝납니다.
**30초쯤 뒤에 [기록] 탭에서 다시 시도**하면 대개 바로 올라가요. 영상을 짧게 자르면 더 빠릅니다.

**Q. 주제 자동 글쓰기가 중간에 끊겨요.**
같은 60초 제한 때문이에요. **분량을 "짧게"** 로 고르면 잘 끝납니다.

**Q. Vercel에 올리면 글 기록이 사라진대요.**
Vercel은 파일을 오래 보관하지 않아요. 기록과 업로드 파일을 계속 남기고 싶으면
[Railway](https://railway.app) 나 [Render](https://render.com) 같이 디스크를 주는 곳에 올리는 게 좋습니다.
