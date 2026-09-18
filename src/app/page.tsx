import { isLoggedIn } from '@/lib/session';
import { listAccountsPublic } from '@/lib/store';
import { isResearchEnabled } from '@/lib/research';
import Composer from '@/components/Composer';
import Login from '@/components/Login';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (!(await isLoggedIn())) return <Login />;
  const accounts = await listAccountsPublic();
  return <Composer accounts={accounts} researchEnabled={isResearchEnabled()} />;
}
