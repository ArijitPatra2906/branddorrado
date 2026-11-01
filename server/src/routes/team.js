import { Router } from 'express';
import { desc, eq, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { activityLog, adminUsers } from '../db/schema.js';
import { hashPassword, revokeAllSessions } from '../lib/auth.js';
import { AREAS, effectivePermissions } from '../lib/permissions.js';
import { HttpError } from '../middleware/errors.js';
import { passwordRule } from './auth.js';
// Mounted at /api/admin/team and /api/admin/activity behind requireSuper (super admin only).
export const teamRouter = Router();
export const activityRouter = Router();
const wrap = (fn) => (req, res, next) => { fn(req, res).catch(next); };
const conflict = (e) => /UNIQUE/i.test(String(e?.message) + String(e?.cause?.message)) ? new HttpError(409, 'An admin with that email already exists.', 'conflict') : e;
// 'all' = full access (stored as null). Otherwise a non-empty list of areas the admin is limited to.
const perms = z.union([z.literal('all'), z.array(z.enum(AREAS)).min(1, 'Choose at least one area, or give full access')]);
const toStored = (p) => (p === 'all' ? null : [...new Set(p)]);
const view = (u) => ({
    id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
    access: u.permissions == null ? 'all' : u.permissions, effective: effectivePermissions(u.role, u.permissions),
});
teamRouter.get('/', wrap(async (_req, res) => {
    res.json({ data: (await db.select().from(adminUsers).orderBy(desc(adminUsers.role), adminUsers.name)).map(view) });
}));
teamRouter.post('/', wrap(async (req, res) => {
    const b = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email().max(254), password: passwordRule, permissions: perms.default('all') }).parse(req.body);
    try {
        const [u] = await db.insert(adminUsers).values({ name: b.name, email: b.email, passwordHash: await hashPassword(b.password), role: 'admin', permissions: toStored(b.permissions), createdBy: req.admin.userId }).returning();
        res.status(201).json({ data: view(u) });
    }
    catch (e) {
        throw conflict(e);
    }
}));
teamRouter.patch('/:id', wrap(async (req, res) => {
    const id = String(req.params.id).slice(0, 60);
    const b = z.object({ name: z.string().trim().min(1).max(80).optional(), active: z.boolean().optional(), permissions: perms.optional(), password: passwordRule.optional() }).strict().parse(req.body);
    const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    if (!target)
        throw new HttpError(404, 'Admin not found.', 'not_found');
    // The super admin is protected: it cannot be deactivated or restricted. It changes its own password via /auth/change-password.
    if (target.role === 'super_admin' && (b.active !== undefined || b.permissions !== undefined || b.password !== undefined))
        throw new HttpError(400, 'The super admin account cannot be restricted, deactivated or have its password reset here.', 'protected');
    const set = {};
    if (b.name !== undefined)
        set.name = b.name;
    if (b.active !== undefined)
        set.active = b.active;
    if (b.permissions !== undefined)
        set.permissions = toStored(b.permissions);
    if (b.password !== undefined)
        set.passwordHash = await hashPassword(b.password);
    if (Object.keys(set).length)
        await db.update(adminUsers).set(set).where(eq(adminUsers.id, id));
    if (b.active === false || b.password !== undefined)
        await revokeAllSessions(id); // takes effect immediately
    const [u] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    res.json({ data: view(u) });
}));
const q = z.object({ userId: z.string().max(60).optional(), entity: z.string().max(40).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) });
activityRouter.get('/', wrap(async (req, res) => {
    const f = q.parse(req.query);
    const where = and(f.userId ? eq(activityLog.userId, f.userId) : undefined, f.entity ? eq(activityLog.entity, f.entity) : undefined);
    const [{ n }] = await db.select({ n: sql `count(*)` }).from(activityLog).where(where);
    const rows = await db.select().from(activityLog).where(where).orderBy(desc(activityLog.createdAt)).limit(f.limit).offset((f.page - 1) * f.limit);
    res.json({ data: rows, meta: { page: f.page, pageSize: f.limit, total: Number(n) } });
}));
