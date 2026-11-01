import { Router } from 'express';
import { and, asc, desc, eq, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { adminUsers, blogGallery, categories, blogPosts, blogServices, emailAttempts, enquiries, enquiryNotes, pricingDeliverables, pricingPackages, projectGallery, projectServices, projects, serviceDeliverables, services, siteSettings, testimonials } from '../db/schema.js';
import { requireAuth, requireCsrf, requirePermission, requireSuper } from '../middleware/auth.js';
import { activityLogger } from '../middleware/activity.js';
import { activityRouter, teamRouter } from './team.js';
import { uploadsRouter } from './uploads.js';
import { clearMemo } from '../middleware/memo.js';
import { HttpError } from '../middleware/errors.js';
import { blogBody, enquiryListQuery, enquiryPatch, noteBody, pricingBody, projectBody, serviceBody, slugify, testimonialBody } from '../validators/admin.js';
import { loadSettings, settingsSchema } from '../lib/siteSettings.js';
import { likePattern } from './content.js';
import { effectivePermissions } from '../lib/permissions.js';
import { processEmails } from '../services/enquiries.js';
export const adminRouter = Router();
// Any successful change by an admin clears the short public-content cache so visitors see it straight away.
adminRouter.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method))
        res.on('finish', () => { if (res.statusCode < 400)
            clearMemo(); });
    next();
});
adminRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
adminRouter.use(requireAuth, requireCsrf, activityLogger);
// Super admin only.
adminRouter.use('/team', requireSuper, teamRouter);
adminRouter.use('/activity', requireSuper, activityRouter);
// Every other area is gated by a per-admin permission (admins have all of them unless the super admin restricts them).
adminRouter.use('/enquiries', requirePermission('enquiries'));
adminRouter.use('/settings', requirePermission('settings'));
// Photo/video uploads for the Projects and Blog editors: allowed for anyone with access to either area.
adminRouter.use('/uploads', (req, res, next) => ['projects', 'blog'].some((a) => effectivePermissions(req.admin.role, req.admin.permissions).includes(a)) ? next() : next(new HttpError(403, 'You have not been given access to this area.', 'forbidden')), uploadsRouter);
// Lets someone with 'projects' or 'blog' access pick services without needing access to the services area.
adminRouter.get('/service-options', (req, res, next) => ['projects', 'blog'].some((a) => effectivePermissions(req.admin.role, req.admin.permissions).includes(a)) ? next() : next(new HttpError(403, 'You have not been given access to this area.', 'forbidden')), (_req, res, next) => {
    db.select({ id: services.id, title: services.title }).from(services).orderBy(asc(services.displayOrder)).then((rows) => res.json({ data: rows })).catch(next);
});
const wrap = (fn) => (req, res, next) => { fn(req, res).catch(next); };
const asConflict = (e) => /UNIQUE/i.test(String(e?.message) + String(e?.cause?.message))
    ? new HttpError(409, 'That slug or name is already in use.', 'conflict') : e;
const idOf = (req) => String(req.params.id).slice(0, 60);
const page = (q) => ({ limit: q.limit, offset: (q.page - 1) * q.limit });
const count = (t, where) => db.select({ n: sql `count(*)` }).from(t).where(where).then((r) => Number(r[0].n));
// ---------- dashboard (real records only) ----------
adminRouter.get('/dashboard', wrap(async (req, res) => {
    const canEnq = effectivePermissions(req.admin.role, req.admin.permissions).includes('enquiries');
    const byStatus = !canEnq ? [] : await db.select({ status: enquiries.status, n: sql `count(*)` }).from(enquiries).groupBy(enquiries.status);
    const recent = !canEnq ? [] : await db.select({ id: enquiries.id, reference: enquiries.reference, fullName: enquiries.fullName, serviceLabel: enquiries.serviceLabel,
        status: enquiries.status, createdAt: enquiries.createdAt, notifyStatus: enquiries.notifyStatus }).from(enquiries).orderBy(desc(enquiries.createdAt)).limit(8);
    const emailFailures = !canEnq ? 0 : await count(enquiries, or(eq(enquiries.notifyStatus, 'failed'), eq(enquiries.ackStatus, 'failed')));
    res.json({ data: {
            enquiries: { total: byStatus.reduce((a, b) => a + Number(b.n), 0), byStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])), emailFailures },
            projects: { published: await count(projects, eq(projects.status, 'published')), draft: await count(projects, eq(projects.status, 'draft')) },
            services: { published: await count(services, eq(services.status, 'published')) },
            blog: { published: await count(blogPosts, eq(blogPosts.status, 'published')), draft: await count(blogPosts, eq(blogPosts.status, 'draft')) },
            testimonials: { published: await count(testimonials, eq(testimonials.status, 'published')) },
            recentEnquiries: recent,
        } });
}));
// ---------- enquiries ----------
function enquiryFilters(q) {
    const c = [];
    if (q.status)
        c.push(eq(enquiries.status, q.status));
    if (q.service)
        c.push(eq(enquiries.serviceLabel, q.service));
    if (q.budget)
        c.push(eq(enquiries.budgetRange, q.budget));
    if (q.from)
        c.push(gte(enquiries.createdAt, `${q.from}T00:00:00.000Z`));
    if (q.to)
        c.push(lte(enquiries.createdAt, `${q.to}T23:59:59.999Z`));
    if (q.q) {
        const p = likePattern(q.q);
        c.push(or(...[enquiries.fullName, enquiries.email, enquiries.businessName, enquiries.reference].map((col) => sql `${col} like ${p} escape '!'`)));
    }
    return and(...c);
}
adminRouter.get('/enquiries', wrap(async (req, res) => {
    const q = enquiryListQuery.parse(req.query);
    const where = enquiryFilters(q);
    const rows = await db.select({ id: enquiries.id, reference: enquiries.reference, fullName: enquiries.fullName, businessName: enquiries.businessName, email: enquiries.email,
        serviceLabel: enquiries.serviceLabel, budgetRange: enquiries.budgetRange, status: enquiries.status, followUpOn: enquiries.followUpOn,
        notifyStatus: enquiries.notifyStatus, ackStatus: enquiries.ackStatus, createdAt: enquiries.createdAt })
        .from(enquiries).where(where).orderBy(desc(enquiries.createdAt)).limit(page(q).limit).offset(page(q).offset);
    res.json({ data: rows, meta: { page: q.page, pageSize: q.limit, total: await count(enquiries, where) } });
}));
const csvCell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s))
        s = `'${s}`; // neutralises spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
};
adminRouter.get('/enquiries/export.csv', wrap(async (req, res) => {
    const q = enquiryListQuery.parse({ ...req.query, page: 1, limit: 100 });
    const rows = await db.select().from(enquiries).where(enquiryFilters(q)).orderBy(desc(enquiries.createdAt)).limit(5000);
    const cols = ['reference', 'createdAt', 'status', 'fullName', 'businessName', 'email', 'phone', 'serviceLabel', 'budgetRange', 'timeline', 'contactMethod', 'referralSource', 'followUpOn', 'description'];
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="enquiries.csv"' });
    res.send('\uFEFF' + [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n'));
}));
adminRouter.get('/enquiries/:id', wrap(async (req, res) => {
    const [e] = await db.select().from(enquiries).where(eq(enquiries.id, idOf(req)));
    if (!e)
        throw new HttpError(404, 'Enquiry not found.', 'not_found');
    const { dedupeHash: _d, ...enquiry } = e;
    const notes = await db.select({ id: enquiryNotes.id, body: enquiryNotes.body, createdAt: enquiryNotes.createdAt, author: adminUsers.name })
        .from(enquiryNotes).leftJoin(adminUsers, eq(adminUsers.id, enquiryNotes.authorId)).where(eq(enquiryNotes.enquiryId, e.id)).orderBy(desc(enquiryNotes.createdAt));
    const attempts = await db.select({ kind: emailAttempts.kind, status: emailAttempts.status, errorCode: emailAttempts.errorCode, createdAt: emailAttempts.createdAt })
        .from(emailAttempts).where(eq(emailAttempts.enquiryId, e.id)).orderBy(desc(emailAttempts.createdAt));
    res.json({ data: { ...enquiry, notes, emailAttempts: attempts } });
}));
adminRouter.patch('/enquiries/:id', wrap(async (req, res) => {
    const patch = enquiryPatch.parse(req.body);
    if (patch.assignedTo) {
        const u = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, patch.assignedTo) });
        if (!u)
            throw new HttpError(400, 'Unknown team member.', 'invalid_assignee');
    }
    const [row] = await db.update(enquiries).set(patch).where(eq(enquiries.id, idOf(req))).returning({ id: enquiries.id });
    if (!row)
        throw new HttpError(404, 'Enquiry not found.', 'not_found');
    res.json({ data: { id: row.id } });
}));
adminRouter.post('/enquiries/:id/notes', wrap(async (req, res) => {
    const { body } = noteBody.parse(req.body);
    const e = await db.query.enquiries.findFirst({ where: eq(enquiries.id, idOf(req)) });
    if (!e)
        throw new HttpError(404, 'Enquiry not found.', 'not_found');
    await db.insert(enquiryNotes).values({ enquiryId: e.id, authorId: req.admin.userId, body });
    res.status(201).json({ data: { ok: true } });
}));
// Admin recovery for failed notification emails.
adminRouter.post('/enquiries/:id/retry-email', wrap(async (req, res) => {
    const e = await db.query.enquiries.findFirst({ where: eq(enquiries.id, idOf(req)) });
    if (!e)
        throw new HttpError(404, 'Enquiry not found.', 'not_found');
    await processEmails(e.id);
    const after = await db.query.enquiries.findFirst({ where: eq(enquiries.id, e.id) });
    res.json({ data: { notifyStatus: after?.notifyStatus, ackStatus: after?.ackStatus } });
}));
adminRouter.delete('/enquiries/:id', wrap(async (req, res) => {
    const [row] = await db.delete(enquiries).where(eq(enquiries.id, idOf(req))).returning({ id: enquiries.id });
    if (!row)
        throw new HttpError(404, 'Enquiry not found.', 'not_found');
    res.json({ data: { ok: true } });
}));
function mount(c) {
    const r = Router();
    const prep = (body) => {
        const parsed = c.schema.parse(body);
        if (c.slugFrom && !parsed.slug)
            parsed.slug = slugify(String(parsed[c.slugFrom]));
        if (c.slugFrom && !parsed.slug)
            throw new HttpError(400, 'Could not create a slug from that title.', 'invalid_slug');
        return c.extract ? c.extract(parsed) : { row: parsed, children: async () => { } };
    };
    r.get('/', wrap(async (_req, res) => {
        const rows = await db.select().from(c.table).orderBy(...c.order);
        res.json({ data: c.load ? await c.load(rows) : rows });
    }));
    r.get('/:id', wrap(async (req, res) => {
        const [row] = await db.select().from(c.table).where(eq(c.table.id, idOf(req)));
        if (!row)
            throw new HttpError(404, 'Not found.', 'not_found');
        res.json({ data: (c.load ? await c.load([row]) : [row])[0] });
    }));
    r.post('/', wrap(async (req, res) => {
        const { row, children } = prep(req.body);
        try {
            const id = await db.transaction(async (tx) => { const [x] = await tx.insert(c.table).values(row).returning({ id: c.table.id }); await children(tx, x.id); return x.id; });
            res.status(201).json({ data: { id } });
        }
        catch (e) {
            throw asConflict(e);
        }
    }));
    r.patch('/:id', wrap(async (req, res) => {
        const id = idOf(req);
        // PATCH merges onto the stored record so omitted fields are never reset to schema defaults.
        const [current] = await db.select().from(c.table).where(eq(c.table.id, id));
        if (!current)
            throw new HttpError(404, 'Not found.', 'not_found');
        const [full] = c.load ? await c.load([current]) : [current];
        const { row, children } = prep({ ...full, ...req.body });
        try {
            const ok = await db.transaction(async (tx) => {
                const [x] = await tx.update(c.table).set(row).where(eq(c.table.id, id)).returning({ id: c.table.id });
                if (!x)
                    return false;
                await children(tx, id);
                return true;
            });
            if (!ok)
                throw new HttpError(404, 'Not found.', 'not_found');
            res.json({ data: { id } });
        }
        catch (e) {
            throw asConflict(e);
        }
    }));
    r.delete('/:id', wrap(async (req, res) => {
        const [x] = await db.delete(c.table).where(eq(c.table.id, idOf(req))).returning({ id: c.table.id });
        if (!x)
            throw new HttpError(404, 'Not found.', 'not_found');
        res.json({ data: { ok: true } });
    }));
    adminRouter.use(c.path, requirePermission(c.path.slice(1)), r);
}
// Saves a category the first time a project or article uses it, so it is offered in the list from then on.
// A spelling that differs only by capitals from an existing category is not saved a second time.
const rememberCategory = async (tx, kind, value) => {
    const name = String(value ?? '').trim();
    if (!name)
        return;
    const existing = await tx.select({ name: categories.name }).from(categories).where(eq(categories.kind, kind));
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase()))
        return;
    await tx.insert(categories).values({ kind, name }).onConflictDoNothing();
};
const group = (rows, key) => rows.reduce((m, r) => ((m[r[key]] ??= []).push(r), m), {});
mount({ path: '/services', table: services, schema: serviceBody, slugFrom: 'title', order: [asc(services.displayOrder)],
    extract: ({ deliverables, ...row }) => ({ row, children: async (tx, id) => {
            await tx.delete(serviceDeliverables).where(eq(serviceDeliverables.serviceId, id));
            if (deliverables.length)
                await tx.insert(serviceDeliverables).values(deliverables.map((label, position) => ({ serviceId: id, label, position })));
        } }),
    load: async (rows) => { const d = group(await db.select().from(serviceDeliverables).orderBy(asc(serviceDeliverables.position)), 'serviceId'); return rows.map((r) => ({ ...r, deliverables: (d[r.id] ?? []).map((x) => x.label) })); } });
mount({ path: '/projects', table: projects, schema: projectBody, slugFrom: 'title', order: [desc(projects.updatedAt)],
    extract: ({ gallery, serviceIds, ...row }) => ({ row, children: async (tx, id) => {
            await rememberCategory(tx, 'project', row.industry);
            await tx.delete(projectGallery).where(eq(projectGallery.projectId, id));
            if (gallery.length)
                await tx.insert(projectGallery).values(gallery.map((g, position) => ({ projectId: id, url: g.url, alt: g.alt, position })));
            await tx.delete(projectServices).where(eq(projectServices.projectId, id));
            const valid = serviceIds.length ? (await tx.select({ id: services.id }).from(services)).map((s) => s.id).filter((s) => serviceIds.includes(s)) : [];
            if (valid.length)
                await tx.insert(projectServices).values(valid.map((serviceId) => ({ projectId: id, serviceId })));
        } }),
    load: async (rows) => {
        const g = group(await db.select().from(projectGallery).orderBy(asc(projectGallery.position)), 'projectId');
        const s = group(await db.select().from(projectServices), 'projectId');
        return rows.map((r) => ({ ...r, gallery: (g[r.id] ?? []).map((x) => ({ url: x.url, alt: x.alt })), serviceIds: (s[r.id] ?? []).map((x) => x.serviceId) }));
    } });
mount({ path: '/testimonials', table: testimonials, schema: testimonialBody, order: [asc(testimonials.displayOrder)] });
mount({ path: '/pricing', table: pricingPackages, schema: pricingBody, slugFrom: 'name', order: [asc(pricingPackages.displayOrder)],
    extract: ({ deliverables, ...row }) => ({ row: { ...row, priceMinor: row.customQuote ? null : row.priceMinor }, children: async (tx, id) => {
            await tx.delete(pricingDeliverables).where(eq(pricingDeliverables.packageId, id));
            if (deliverables.length)
                await tx.insert(pricingDeliverables).values(deliverables.map((label, position) => ({ packageId: id, label, position })));
        } }),
    load: async (rows) => { const d = group(await db.select().from(pricingDeliverables).orderBy(asc(pricingDeliverables.position)), 'packageId'); return rows.map((r) => ({ ...r, deliverables: (d[r.id] ?? []).map((x) => x.label) })); } });
mount({ path: '/blog', table: blogPosts, schema: blogBody, slugFrom: 'title', order: [desc(blogPosts.updatedAt)],
    // Publishing without a date publishes now; a future date schedules it (the public API hides posts dated in the future).
    // Gallery and related services are saved the same way as for projects.
    extract: ({ gallery, serviceIds, ...b }) => ({ row: { ...b, publishedAt: b.status === 'published' ? (b.publishedAt ?? new Date().toISOString()) : b.publishedAt }, children: async (tx, id) => {
            await rememberCategory(tx, 'blog', b.category);
            await tx.delete(blogGallery).where(eq(blogGallery.postId, id));
            if (gallery.length)
                await tx.insert(blogGallery).values(gallery.map((g, position) => ({ postId: id, url: g.url, alt: g.alt, position })));
            await tx.delete(blogServices).where(eq(blogServices.postId, id));
            const valid = serviceIds.length ? (await tx.select({ id: services.id }).from(services)).map((s) => s.id).filter((s) => serviceIds.includes(s)) : [];
            if (valid.length)
                await tx.insert(blogServices).values(valid.map((serviceId) => ({ postId: id, serviceId })));
        } }),
    load: async (rows) => {
        const g = group(await db.select().from(blogGallery).orderBy(asc(blogGallery.position)), 'postId');
        const s = group(await db.select().from(blogServices), 'postId');
        return rows.map((r) => ({ ...r, gallery: (g[r.id] ?? []).map((x) => ({ url: x.url, alt: x.alt })), serviceIds: (s[r.id] ?? []).map((x) => x.serviceId) }));
    } });
// The category lists offered when creating or editing a project or an article: every category saved before, plus any already in use.
const categoryList = (kind, column, table) => wrap(async (_req, res) => {
    const saved = await db.select({ name: categories.name }).from(categories).where(eq(categories.kind, kind));
    const used = await db.selectDistinct({ name: column }).from(table);
    const seen = new Map();
    for (const { name } of [...saved, ...used]) {
        const n = String(name ?? '').trim();
        if (n && !seen.has(n.toLowerCase()))
            seen.set(n.toLowerCase(), n);
    }
    res.json({ data: [...seen.values()].sort((a, b) => a.localeCompare(b)) });
});
adminRouter.get('/categories/projects', requirePermission('projects'), categoryList('project', projects.industry, projects));
adminRouter.get('/categories/blog', requirePermission('blog'), categoryList('blog', blogPosts.category, blogPosts));
// ---------- site settings (requires the 'settings' permission, validated against the same schema the public API uses) ----------
adminRouter.get('/settings', wrap(async (_req, res) => { res.json({ data: await loadSettings() }); }));
adminRouter.patch('/settings', wrap(async (req, res) => {
    const current = await loadSettings();
    const next = settingsSchema.parse({ ...current, ...req.body });
    await db.insert(siteSettings).values({ id: 1, data: next }).onConflictDoUpdate({ target: siteSettings.id, set: { data: next, updatedAt: new Date().toISOString() } });
    res.json({ data: next });
}));
