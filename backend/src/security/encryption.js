import crypto from 'crypto';

function getKey() {
  const configured = process.env.AI_ENCRYPTION_KEY;
  if (configured) {
    if (/^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, 'hex');
    if (configured.length >= 32) return Buffer.from(configured.slice(0, 32), 'utf8');
    return crypto.createHash('sha256').update(configured).digest();
  }
  return crypto.createHash('sha256')
    .update(process.env.JWT_SECRET || 'jinnah-legal-dev-secret')
    .digest();
}

export function encryptSensitive(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptSensitive(payload) {
  const [ivPart, tagPart, dataPart] = String(payload || '').split('.');
  if (!ivPart || !tagPart || !dataPart) return '';
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}
