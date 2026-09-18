import { NextResponse } from 'next/server';
import { listAccountsPublic, removeAccount, type Channel } from '@/lib/store';
import { isLoggedIn } from '@/lib/session';

export async function GET() {
  if (!(await isLoggedIn())) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return NextResponse.json({ accounts: await listAccountsPublic() });
}

export async function DELETE(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const channel = new URL(req.url).searchParams.get('channel') as Channel | null;
  if (!channel) return NextResponse.json({ error: '어떤 채널인지 알려주세요.' }, { status: 400 });
  await removeAccount(channel);
  return NextResponse.json({ ok: true });
}
