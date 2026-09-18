import { isLoggedIn } from '@/lib/session';
import Login from '@/components/Login';
import SetupGuide from '@/components/SetupGuide';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  if (!(await isLoggedIn())) return <Login />;
  // 내 앱 주소를 알아야 리디렉션 주소를 만들어 줄 수 있어요.
  const appUrl = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');
  return <SetupGuide appUrl={appUrl} />;
}
