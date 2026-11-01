import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { adminUsers, passwordResets, sessions } from '../db/schema.js';
import { env } from '../config/env.js';
export const SESSION_COOKIE = 'bd_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours, no silent refresh: re-login after expiry
const BCRYPT_ROUNDS = 12;
export const hashPassword = (pw) => bcrypt.hash(pw, BCRYPT_ROUNDS);
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);
// Only a SHA-256 of the session token is stored; a database leak cannot be replayed as a cookie.
const sha = (v) => createHash('sha256').update(`${v}.${env.SESSION_SECRET}`).digest('hex');
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);
export async function createSession(userId) {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(24).toString('base64url');
    await db.insert(sessions).values({ userId, tokenHash: sha(token), csrfToken, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
    return { token, csrfToken };
}
export async function findSession(token) {
    const [row] = await db.select({
        sessionId: sessions.id, csrfToken: sessions.csrfToken, userId: adminUsers.id, name: adminUsers.name,
        email: adminUsers.email, role: adminUsers.role, permissions: adminUsers.permissions, active: adminUsers.active,
    }).from(sessions).innerJoin(adminUsers, eq(adminUsers.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, sha(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date().toISOString())));
    return row && row.active ? row : null;
}
export const revokeSession = (token) => db.update(sessions).set({ revokedAt: new Date().toISOString() }).where(eq(sessions.tokenHash, sha(token)));
export const cookieOptions = {
    httpOnly: true, secure: env.isProd, sameSite: (env.isProd ? 'none' : 'lax'), path: '/',
    domain: env.COOKIE_DOMAIN || undefined, maxAge: SESSION_TTL_MS,
};
export function readCookie(header, name) {
    if (!header)
        return null;
    for (const part of header.split(';')) {
        const i = part.indexOf('=');
        if (i > 0 && part.slice(0, i).trim() === name)
            return decodeURIComponent(part.slice(i + 1).trim());
    }
    return null;
}
export const revokeAllSessions = (userId) => db.update(sessions).set({ revokedAt: new Date().toISOString() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
// ---- password reset ----
export const RESET_TTL_MS = 30 * 60 * 1000; // links work for 30 minutes, once
export const RESET_COOLDOWN_MS = 60 * 1000; // at most one email per minute per admin
export async function createResetToken(userId) {
    const [last] = await db.select({ createdAt: passwordResets.createdAt }).from(passwordResets)
        .where(eq(passwordResets.userId, userId)).orderBy(desc(passwordResets.createdAt)).limit(1);
    if (last && Date.now() - new Date(last.createdAt).getTime() < RESET_COOLDOWN_MS)
        return null;
    // Only the newest link is valid.
    await db.update(passwordResets).set({ usedAt: new Date().toISOString() }).where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)));
    const token = randomBytes(32).toString('base64url');
    await db.insert(passwordResets).values({ userId, tokenHash: sha(`reset:${token}`), expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString() });
    return token;
}
export async function findValidReset(token) {
    const [row] = await db.select({ id: passwordResets.id, userId: adminUsers.id, name: adminUsers.name, email: adminUsers.email, active: adminUsers.active })
        .from(passwordResets).innerJoin(adminUsers, eq(adminUsers.id, passwordResets.userId))
        .where(and(eq(passwordResets.tokenHash, sha(`reset:${token}`)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date().toISOString())));
    return row && row.active ? row : null;
}
// Marks the token used only if it was still unused, so two simultaneous requests cannot both succeed.
export async function consumeReset(id) {
    const r = await db.update(passwordResets).set({ usedAt: new Date().toISOString() }).where(and(eq(passwordResets.id, id), isNull(passwordResets.usedAt)));
    return r.rowsAffected === 1;
}
