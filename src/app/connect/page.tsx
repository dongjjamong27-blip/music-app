import { isLoggedIn } from '@/lib/session';
import { listAccountsPublic } from '@/lib/store';
import Login from '@/components/Login';
import ConnectPanel from '@/components/ConnectPanel';

export const dynamic = 'force-dynamic';

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  if (!(await isLoggedIn())) return <Login />;
  const params = await searchParams;
  const accounts = await listAccountsPublic();
  return <ConnectPanel accounts={accounts} ok={params.ok} error={params.error} />;
}
