import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { isLoggedIn } from '@/lib/session';

export const runtime = 'nodejs';
export const maxDuration = 300;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/x-m4v']);
const MAX_BYTES = 200 * 1024 * 1024; // 200MB

/** 휴대폰에서 고른 사진/영상을 서버에 저장하고, 인터넷 주소를 돌려줍니다. */
export async function POST(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: '파일이 너무 큽니다. (200MB 이하)' }, { status: 400 });

  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: '사진(jpg/png/webp) 또는 영상(mp4/mov)만 올릴 수 있습니다.' }, { status: 400 });
  }

  // 파일 이름은 우리가 새로 지어야 안전합니다 (사용자 이름 그대로 쓰면 위험).
  const ext = isVideo ? (file.type === 'video/mp4' ? 'mp4' : 'mov') : file.type.split('/')[1].replace('jpeg', 'jpg');
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), new Uint8Array(await file.arrayBuffer()));

  return NextResponse.json({ path: `/uploads/${name}`, type: isVideo ? 'video' : 'image' });
}
