import fs from 'node:fs/promises';
import path from 'node:path';
import { isLoggedIn } from '@/lib/session';
import Login from '@/components/Login';
import SetupGuide from '@/components/SetupGuide';
import { resolveAppUrl } from '@/lib/appUrl';

export const dynamic = 'force-dynamic';

/**
 * 이 서버에 파일을 쓸 수 있는지 실제로 한 번 해봅니다.
 * Vercel 같은 곳은 읽기 전용이라 유튜브·인스타 연결을 저장할 수 없어요.
 */
async function canWriteFiles(): Promise<boolean> {
  const probe = path.join(process.cwd(), 'data', '.write-test');
  try {
    await fs.mkdir(path.dirname(probe), { recursive: true });
    await fs.writeFile(probe, 'ok');
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

export default async function SetupPage() {
  if (!(await isLoggedIn())) return <Login />;

  return (
    <SetupGuide
      appUrl={resolveAppUrl() ?? ''}
      passwordSet={Boolean(process.env.APP_PASSWORD)}
      canSaveOnServer={await canWriteFiles()}
    />
  );
}
