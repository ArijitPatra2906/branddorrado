import { Router } from 'express';
import { and, asc, desc, eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { projects, services, testimonials } from '../db/schema.js';
import { loadSettings, toPublic } from '../lib/siteSettings.js';
import { getRevision, memo } from '../middleware/memo.js';
export const contentRouter = Router();
// Browsers must ask the server every time (a cheap 304 when nothing changed), otherwise admin edits would not show until the browser's copy expired.
// The short in-memory copy on the server (memo.js) keeps this cheap and is cleared by every admin change.
const setCache = (_seconds) => (_q, res, next) => {
    res.set('Cache-Control', 'no-cache');
    next();
};
// Cache headers for browsers/CDNs, plus a short in-memory copy on the server (see middleware/memo.js).
const cache = (seconds) => [setCache(seconds), memo(Math.min(seconds, 30))];
// Settings (3D hero switch, stats, links) must show up as soon as an admin saves them: always revalidate (cheap 304 when unchanged).
const noCache = (_req, res, next) => {
    res.set('Cache-Control', 'no-cache');
    next();
};
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
contentRouter.get('/revision', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ data: { revision: getRevision() } });
});
contentRouter.get('/site-settings/public', noCache, memo(10), wrap(async (_req, res) => {
    res.json({ data: toPublic(await loadSettings()) });
}));
contentRouter.get('/services', cache(60), wrap(async (_req, res) => {
    const rows = await db.select({
        id: services.id, title: services.title, slug: services.slug, shortDescription: services.shortDescription,
        imageUrl: services.imageUrl, iconId: services.iconId, ctaLabel: services.ctaLabel, benefits: services.benefits,
    }).from(services).where(eq(services.status, 'published')).orderBy(asc(services.displayOrder));
    res.json({ data: rows });
}));
const projectQuery = z.object({
    featured: z.enum(['true', 'false']).optional(),
    industry: z.string().trim().max(60).optional(),
    q: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(12),
});
// Escapes LIKE wildcards so user input is matched literally.
export const likePattern = (v) => `%${v.replace(/[!%_]/g, (c) => `!${c}`)}%`;
contentRouter.get('/projects', cache(60), wrap(async (req, res) => {
    const q = projectQuery.parse(req.query);
    const conds = [eq(projects.status, 'published')];
    if (q.featured === 'true')
        conds.push(eq(projects.featured, true));
    if (q.industry)
        conds.push(eq(projects.industry, q.industry));
    if (q.q) {
        const pat = likePattern(q.q);
        conds.push(or(sql `${projects.title} like ${pat} escape '!'`, sql `${projects.shortDescription} like ${pat} escape '!'`, sql `${projects.clientName} like ${pat} escape '!'`));
    }
    const where = and(...conds);
    const [{ total }] = await db.select({ total: sql `count(*)` }).from(projects).where(where);
    const rows = await db.select({
        id: projects.id, title: projects.title, slug: projects.slug, clientName: projects.clientName, industry: projects.industry,
        projectType: projects.projectType, shortDescription: projects.shortDescription, coverImageUrl: projects.coverImageUrl, videoUrl: projects.videoUrl, videoRatio: projects.videoRatio,
        results: projects.results, featured: projects.featured, isDemo: projects.isDemo, completedOn: projects.completedOn,
    }).from(projects).where(where).orderBy(desc(projects.featured), desc(projects.createdAt)).limit(q.limit).offset((q.page - 1) * q.limit);
    res.json({ data: rows, meta: { page: q.page, pageSize: q.limit, total: Number(total) } });
}));
contentRouter.get('/testimonials', cache(60), wrap(async (_req, res) => {
    const rows = await db.select({
        id: testimonials.id, clientName: testimonials.clientName, businessName: testimonials.businessName,
        industry: testimonials.industry, avatarUrl: testimonials.avatarUrl, body: testimonials.body, rating: testimonials.rating,
    }).from(testimonials).where(and(eq(testimonials.status, 'published'), eq(testimonials.approved, true)))
        .orderBy(asc(testimonials.displayOrder)).limit(12);
    res.json({ data: rows });
}));
