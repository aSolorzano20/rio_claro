import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { config } from '../config/index.js';
import { users } from '../data/demo-store.js';

const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, expectedHash] = String(passwordHash).split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) return false;

  const derivedKey = await scrypt(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  return expectedBuffer.length === derivedKey.length
    && crypto.timingSafeEqual(expectedBuffer, derivedKey);
}

export function sanitizeUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

export function createToken(user) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 86400,
  }));
  const signature = crypto.createHmac('sha256', config.jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;

  try {
    const [header, payload, signature, extra] = token.split('.');
    if (!header || !payload || !signature || extra) return null;

    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') return null;

    const expectedSignature = crypto.createHmac('sha256', config.jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.sub || !decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function bootstrapDemoAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (Boolean(email) !== Boolean(password)) {
    throw new Error('Configura BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD juntos.');
  }
  if (!config.demoMode || !email || !password) return;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/.test(password)) {
    throw new Error('La cuenta inicial requiere un correo válido y una contraseña segura.');
  }

  users.push({
    id: crypto.randomUUID(),
    name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrador Río Claro',
    email,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
  });
}
