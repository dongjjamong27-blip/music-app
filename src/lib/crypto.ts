import crypto from 'node:crypto';

/**
 * 토큰(계정 열쇠)을 파일에 그냥 저장하면 위험해서 자물쇠를 채워 보관합니다.
 * ENCRYPTION_KEY 환경변수를 자물쇠 열쇠로 씁니다.
 */
function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 16) {
    throw new Error('ENCRYPTION_KEY 환경변수가 없습니다. .env 파일에 32자 이상 아무 문자열을 넣어주세요.');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('저장된 토큰 형식이 깨졌습니다.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/** 비밀번호 비교를 안전하게 (타이밍 공격 방지) */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
