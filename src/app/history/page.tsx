import { isLoggedIn } from '@/lib/session';
import { listPosts, listAccountsPublic } from '@/lib/store';
import Login from '@/components/Login';
import HistoryList from '@/components/HistoryList';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  if (!(await isLoggedIn())) return <Login />;
  const [posts, accounts] = await Promise.all([listPosts(), listAccountsPublic()]);
  const blogId = accounts.find((a) => a.channel === 'naver')?.extra?.blogId;
  return <HistoryList posts={posts} blogId={blogId} />;
}
