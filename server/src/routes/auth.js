import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { adminUsers } from '../db/schema.js';
import { consumeReset, cookieOptions, createResetToken, createSession, DUMMY_HASH, findValidReset, hashPassword, RESET_TTL_MS, readCookie, revokeAllSessions, revokeSession, SESSION_COOKIE, verifyPassword } from '../lib/auth.js';
import { effectivePermissions } from '../lib/permissions.js';
import { logActivity } from '../lib/activity.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { env } from '../config/env.js';
import { sendEmail } from '../services/email.js';
import { passwordResetEmail } from '../templates/emails.js';
export const authRouter = Router();
const limiter = (limit, message) => rateLimit({
    windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false, skipSuccessfulRequests: true,
    handler: (_req, res) => res.status(429).json({ error: { code: 'rate_limited', message } }),
});
const loginLimiter = limiter(10, 'Too many sign-in attempts. Please wait a few minutes.');
const setupLimiter = limiter(10, 'Too many attempts. Please wait a few minutes.');
const checkOrigin = (origin) => { if (origin && !env.isOriginAllowed(origin))
    throw new HttpError(403, 'Request blocked.', 'bad_origin'); };
// 6+ characters with at least one uppercase letter, lowercase letter, digit and special character. Applies to the super admin and every admin.
export const passwordRule = z.string().max(200).superRefine((pw, ctx) => {
    const problem = pw.length < 6 ? 'Use at least 6 characters'
        : !/[a-z]/.test(pw) ? 'Add a lowercase letter'
        : !/[A-Z]/.test(pw) ? 'Add an uppercase letter'
        : !/\d/.test(pw) ? 'Add a number'
        : !/[^A-Za-z0-9]/.test(pw) ? 'Add a special character, such as ! or @' : '';
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
});
const emailRule = z.string().trim().toLowerCase().email().max(254);
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, permissions: effectivePermissions(u.role, u.permissions) });
// ---- one-time super admin setup, done inside the application ----
const hasSuperAdmin = async () => Number((await db.select({ n: sql `count(*)` }).from(adminUsers).where(eq(adminUsers.role, 'super_admin')))[0].n) > 0;
authRouter.get('/setup-status', async (_req, res, next) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.json({ data: { needsSetup: !(await hasSuperAdmin()) } });
    }
    catch (e) {
        next(e);
    }
});
const setupBody = z.object({ name: z.string().trim().min(1).max(80), email: emailRule, password: passwordRule });
authRouter.post('/setup', setupLimiter, async (req, res, next) => {
    try {
        checkOrigin(req.headers.origin);
        const b = setupBody.parse(req.body);
        // The setup secret is kept by the developer in server/.env and is never typed into the app.
        // In production, setup is refused entirely until it has been configured.
        if (env.isProd && !env.ADMIN_SETUP_SECRET)
            throw new HttpError(503, 'Setup is not available: ADMIN_SETUP_SECRET is not configured on the server.', 'setup_unavailable');
        if (await hasSuperAdmin())
            throw new HttpError(409, 'A super admin already exists.', 'setup_done');
        let user;
        try {
            [user] = await db.insert(adminUsers).values({ name: b.name, email: b.email, passwordHash: await hashPassword(b.password), role: 'super_admin', permissions: null }).returning();
        }
        catch (e) { // the partial unique index guarantees a second super admin can never be inserted, even in a race
            if (/UNIQUE/i.test(String(e.message) + String(e.cause?.message)))
                throw new HttpError(409, 'A super admin already exists.', 'setup_done');
            throw e;
        }
        const { token, csrfToken } = await createSession(user.id);
        await db.update(adminUsers).set({ lastLoginAt: new Date().toISOString() }).where(eq(adminUsers.id, user.id));
        await logActivity(user, 'setup', 'auth', user.id, 'Created the super admin account');
        res.cookie(SESSION_COOKIE, token, cookieOptions);
        res.status(201).json({ data: { user: publicUser(user), csrfToken } });
    }
    catch (e) {
        next(e);
    }
});
// ---- sign in / out ----
authRouter.post('/login', loginLimiter, async (req, res, next) => {
    try {
        checkOrigin(req.headers.origin);
        const { email, password } = z.object({ email: emailRule, password: z.string().min(1).max(200) }).parse(req.body);
        const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
        const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.active || !ok)
            throw new HttpError(401, 'Incorrect email or password.', 'invalid_credentials');
        const { token, csrfToken } = await createSession(user.id);
        await db.update(adminUsers).set({ lastLoginAt: new Date().toISOString() }).where(eq(adminUsers.id, user.id));
        await logActivity(user, 'login', 'auth', user.id, 'Signed in');
        res.cookie(SESSION_COOKIE, token, cookieOptions);
        res.json({ data: { user: publicUser(user), csrfToken } });
    }
    catch (e) {
        next(e);
    }
});
authRouter.get('/me', requireAuth, (req, res) => {
    const a = req.admin;
    res.set('Cache-Control', 'no-store');
    res.json({ data: { user: publicUser({ id: a.userId, name: a.name, email: a.email, role: a.role, permissions: a.permissions }), csrfToken: a.csrfToken } });
});
authRouter.post('/logout', requireAuth, requireCsrf, async (req, res, next) => {
    try {
        await logActivity({ id: req.admin.userId, name: req.admin.name }, 'logout', 'auth', req.admin.userId, 'Signed out');
        await revokeSession(req.sessionToken ?? readCookie(req.headers.cookie, SESSION_COOKIE) ?? '');
        res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
        res.json({ data: { ok: true } });
    }
    catch (e) {
        next(e);
    }
});
// Any signed-in admin can change their own password; all of their sessions are then ended.
authRouter.post('/change-password', requireAuth, requireCsrf, loginLimiter, async (req, res, next) => {
    try {
        const b = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordRule }).parse(req.body);
        const [u] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.admin.userId));
        if (!u || !(await verifyPassword(b.currentPassword, u.passwordHash)))
            throw new HttpError(400, 'Your current password is incorrect.', 'invalid_credentials');
        await db.update(adminUsers).set({ passwordHash: await hashPassword(b.newPassword) }).where(eq(adminUsers.id, u.id));
        await revokeAllSessions(u.id);
        await logActivity(u, 'password', 'auth', u.id, 'Changed own password');
        res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
        res.json({ data: { ok: true } });
    }
    catch (e) {
        next(e);
    }
});
// ---- forgotten password, by email ----
// Counts every request (not only failures) so the form cannot be used to flood someone's inbox.
const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests. Please wait a few minutes.' } }),
});
// The answer is identical whether or not the email belongs to an admin, so the form cannot be used to discover accounts.
authRouter.post('/forgot-password', forgotLimiter, async (req, res, next) => {
    try {
        checkOrigin(req.headers.origin);
        const { email } = z.object({ email: emailRule }).parse(req.body);
        const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
        if (user && user.active) {
            const token = await createResetToken(user.id);
            if (token) {
                const resetUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/admin/reset-password#token=${token}`; // fragment: never sent to servers or logs
                const mail = passwordResetEmail({ siteUrl: env.PUBLIC_SITE_URL, name: user.name, resetUrl, minutes: RESET_TTL_MS / 60000 });
                void sendEmail({ to: user.email, ...mail }).then((r) => {
                    if (!r.ok)
                        console.error(`[auth] reset email not sent: ${r.errorCode}`);
                });
                await logActivity(user, 'reset_requested', 'auth', user.id, 'Requested a password reset email');
            }
        }
        res.json({ data: { ok: true } });
    }
    catch (e) {
        next(e);
    }
});
const resetBody = z.object({ token: z.string().min(20).max(200), newPassword: passwordRule });
authRouter.post('/reset-password', setupLimiter, async (req, res, next) => {
    try {
        checkOrigin(req.headers.origin);
        const b = resetBody.parse(req.body);
        const r = await findValidReset(b.token);
        if (!r || !(await consumeReset(r.id)))
            throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.', 'invalid_token');
        await db.update(adminUsers).set({ passwordHash: await hashPassword(b.newPassword) }).where(eq(adminUsers.id, r.userId));
        await revokeAllSessions(r.userId);
        await logActivity({ id: r.userId, name: r.name }, 'password', 'auth', r.userId, 'Reset own password using an emailed link');
        res.json({ data: { ok: true } });
    }
    catch (e) {
        next(e);
    }
});
