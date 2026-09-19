import { isLoggedIn } from '@/lib/session';
import Login from '@/components/Login';
import SetupGuide from '@/components/SetupGuide';
import { resolveAppUrl } from '@/lib/appUrl';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  if (!(await isLoggedIn())) return <Login />;
  // 내 앱 주소를 알아야 리디렉션 주소를 만들어 줄 수 있어요.
  // APP_URL이 없거나 잘못돼 있으면 Vercel이 알려주는 주소를 대신 씁니다.
  return <SetupGuide appUrl={resolveAppUrl() ?? ''} />;
}
