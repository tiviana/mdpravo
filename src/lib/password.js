// Хеширование паролей scrypt. Формат: scrypt$N$r$p$salt$hash (base64url).
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64url');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Пустой хеш для выравнивания времени ответа, когда пользователя нет. */
let dummy;
export async function dummyVerify(password) {
  dummy ??= await hashPassword('dummy-password-for-timing');
  await verifyPassword(password, dummy);
  return false;
}

export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) return `Пароль должен быть не короче ${PASSWORD_MIN} символов`;
  if (pw.length > PASSWORD_MAX) return 'Пароль слишком длинный';
  return null;
}
