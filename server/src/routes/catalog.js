import { Router } from 'express';
import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { blogGallery, blogPosts, blogServices, pricingDeliverables, pricingPackages, projectGallery, projectServices, projects, serviceDeliverables, services } from '../db/schema.js';
import { HttpError } from '../middleware/errors.js';
import { memo } from '../middleware/memo.js';
import { likePattern } from './content.js';
export const catalogRouter = Router();
// Browsers must ask the server every time (a cheap 304 when nothing changed), otherwise admin edits would not show until the browser's copy expired.
// The short in-memory copy on the server (memo.js) keeps this cheap and is cleared by every admin change.
const setCache = (_s) => (_q, res, next) => {
    res.set('Cache-Control', 'no-cache');
    next();
};
const cache = (s) => [setCache(s), memo(Math.min(s, 30))];
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const slugParam = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/);
catalogRouter.get('/services/:slug', cache(60), wrap(async (req, res) => {
    const slug = slugParam.parse(req.params.slug);
    const [s] = await db.select().from(services).where(and(eq(services.slug, slug), eq(services.status, 'published')));
    if (!s)
        throw new HttpError(404, 'Service not found.', 'not_found');
    const deliverables = await db.select({ label: serviceDeliverables.label }).from(serviceDeliverables)
        .where(eq(serviceDeliverables.serviceId, s.id)).orderBy(asc(serviceDeliverables.position));
    const { status: _s, createdAt: _c, updatedAt: _u, ...pub } = s;
    res.json({ data: { ...pub, deliverables: deliverables.map((d) => d.label) } });
}));
catalogRouter.get('/projects/industries', cache(60), wrap(async (_req, res) => {
    const rows = await db.selectDistinct({ industry: projects.industry }).from(projects).where(eq(projects.status, 'published')).orderBy(asc(projects.industry));
    res.json({ data: rows.map((r) => r.industry) });
}));
// "Our Work" split into sub-sections: published projects grouped by category (the first `perCategory` of each, plus the category's total).
catalogRouter.get('/projects/by-category', cache(60), wrap(async (req, res) => {
    const per = z.coerce.number().int().min(1).max(12).default(5).parse(req.query.perCategory);
    const rows = await db.select({
        id: projects.id, title: projects.title, slug: projects.slug, clientName: projects.clientName, industry: projects.industry,
        projectType: projects.projectType, shortDescription: projects.shortDescription, coverImageUrl: projects.coverImageUrl, videoUrl: projects.videoUrl, videoRatio: projects.videoRatio,
        featured: projects.featured, isDemo: projects.isDemo,
    }).from(projects).where(eq(projects.status, 'published')).orderBy(desc(projects.featured), desc(projects.createdAt)).limit(500);
    const groups = new Map();
    for (const r of rows) {
        const g = groups.get(r.industry) ?? { category: r.industry, total: 0, items: [] };
        g.total++;
        if (g.items.length < per)
            g.items.push(r);
        groups.set(r.industry, g);
    }
    res.json({ data: [...groups.values()].sort((a, b) => a.category.localeCompare(b.category)) });
}));
catalogRouter.get('/projects/:slug', cache(60), wrap(async (req, res) => {
    const slug = slugParam.parse(req.params.slug);
    const [p] = await db.select().from(projects).where(and(eq(projects.slug, slug), eq(projects.status, 'published')));
    if (!p)
        throw new HttpError(404, 'Project not found.', 'not_found');
    const gallery = await db.select({ url: projectGallery.url, alt: projectGallery.alt }).from(projectGallery)
        .where(eq(projectGallery.projectId, p.id)).orderBy(asc(projectGallery.position));
    const links = await db.select({ serviceId: projectServices.serviceId }).from(projectServices).where(eq(projectServices.projectId, p.id));
    const svc = links.length ? await db.select({ title: services.title, slug: services.slug }).from(services)
        .where(and(inArray(services.id, links.map((l) => l.serviceId)), eq(services.status, 'published'))) : [];
    const { status: _s, createdAt: _c, updatedAt: _u, ...pub } = p;
    res.json({ data: { ...pub, gallery, services: svc } });
}));
catalogRouter.get('/pricing', cache(60), wrap(async (_req, res) => {
    const pk = await db.select().from(pricingPackages).where(eq(pricingPackages.available, true)).orderBy(asc(pricingPackages.displayOrder));
    const ds = pk.length ? await db.select().from(pricingDeliverables).where(inArray(pricingDeliverables.packageId, pk.map((p) => p.id))).orderBy(asc(pricingDeliverables.position)) : [];
    res.json({ data: pk.map((p) => ({
            id: p.id, name: p.name, slug: p.slug, description: p.description, priceMinor: p.customQuote ? null : p.priceMinor,
            customQuote: p.customQuote, currency: p.currency, billingPeriod: p.billingPeriod, revisionTerms: p.revisionTerms,
            deliveryTimeline: p.deliveryTimeline, featured: p.featured, deliverables: ds.filter((d) => d.packageId === p.id).map((d) => d.label),
        })) });
}));
// Scheduled posts: status 'published' with a publishedAt in the future stays hidden until that time.
const live = () => and(eq(blogPosts.status, 'published'), lte(blogPosts.publishedAt, new Date().toISOString()));
const blogQuery = z.object({
    category: z.string().trim().max(60).optional(), q: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(24).default(9),
});
// Articles with no category are shown under "General", so every published article appears in one category group.
const UNCATEGORISED = 'General';
const inCategory = (c) => c === UNCATEGORISED ? or(eq(blogPosts.category, c), isNull(blogPosts.category)) : eq(blogPosts.category, c);
const postCard = {
    id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, excerpt: blogPosts.excerpt, featuredImageUrl: blogPosts.featuredImageUrl,
    category: blogPosts.category, authorName: blogPosts.authorName, publishedAt: blogPosts.publishedAt,
    videoUrl: blogPosts.videoUrl, videoRatio: blogPosts.videoRatio, featured: blogPosts.featured, isDemo: blogPosts.isDemo,
};
catalogRouter.get('/blog/categories', cache(60), wrap(async (_req, res) => {
    const rows = await db.selectDistinct({ category: blogPosts.category }).from(blogPosts).where(live());
    res.json({ data: [...new Set(rows.map((r) => r.category || UNCATEGORISED))].sort() });
}));
// "Our Blog" split into sub-sections, like Our Work: published articles grouped by category (the newest `perCategory` of each, plus the category's total).
catalogRouter.get('/blog/by-category', cache(60), wrap(async (req, res) => {
    const per = z.coerce.number().int().min(1).max(12).default(5).parse(req.query.perCategory);
    const rows = await db.select(postCard).from(blogPosts).where(live()).orderBy(desc(blogPosts.featured), desc(blogPosts.publishedAt)).limit(500);
    const groups = new Map();
    for (const r of rows) {
        const name = r.category || UNCATEGORISED;
        const g = groups.get(name) ?? { category: name, total: 0, items: [] };
        g.total++;
        if (g.items.length < per)
            g.items.push(r);
        groups.set(name, g);
    }
    res.json({ data: [...groups.values()].sort((a, b) => a.category.localeCompare(b.category)) });
}));
catalogRouter.get('/blog', cache(60), wrap(async (req, res) => {
    const q = blogQuery.parse(req.query);
    const conds = [live()];
    if (q.category)
        conds.push(inCategory(q.category));
    if (q.q) {
        const pat = likePattern(q.q);
        conds.push(or(sql `${blogPosts.title} like ${pat} escape '!'`, sql `${blogPosts.excerpt} like ${pat} escape '!'`, sql `${blogPosts.authorName} like ${pat} escape '!'`));
    }
    const where = and(...conds);
    const [{ total }] = await db.select({ total: sql `count(*)` }).from(blogPosts).where(where);
    const rows = await db.select(postCard).from(blogPosts).where(where).orderBy(desc(blogPosts.featured), desc(blogPosts.publishedAt)).limit(q.limit).offset((q.page - 1) * q.limit);
    res.json({ data: rows, meta: { page: q.page, pageSize: q.limit, total: Number(total) } });
}));
catalogRouter.get('/blog/:slug', cache(60), wrap(async (req, res) => {
    const slug = slugParam.parse(req.params.slug);
    const [p] = await db.select({
        id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, excerpt: blogPosts.excerpt, content: blogPosts.content,
        featuredImageUrl: blogPosts.featuredImageUrl, category: blogPosts.category, authorName: blogPosts.authorName,
        videoUrl: blogPosts.videoUrl, externalUrl: blogPosts.externalUrl, isDemo: blogPosts.isDemo,
        publishedAt: blogPosts.publishedAt, seoTitle: blogPosts.seoTitle, seoDescription: blogPosts.seoDescription,
    }).from(blogPosts).where(and(eq(blogPosts.slug, slug), live()));
    if (!p)
        throw new HttpError(404, 'Article not found.', 'not_found');
    const gallery = await db.select({ url: blogGallery.url, alt: blogGallery.alt }).from(blogGallery)
        .where(eq(blogGallery.postId, p.id)).orderBy(asc(blogGallery.position));
    const links = await db.select({ serviceId: blogServices.serviceId }).from(blogServices).where(eq(blogServices.postId, p.id));
    const svc = links.length ? await db.select({ title: services.title, slug: services.slug }).from(services)
        .where(and(inArray(services.id, links.map((l) => l.serviceId)), eq(services.status, 'published'))) : [];
    res.json({ data: { ...p, gallery, services: svc } });
}));
