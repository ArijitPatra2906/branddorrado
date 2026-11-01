import { Router } from 'express';
import { and, eq, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { blogPosts, projects, services } from '../db/schema.js';
import { env } from '../config/env.js';
export const seoRouter = Router();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Served by the API; point your frontend host at it (rewrite /sitemap.xml) or copy it into the static build. See README → SEO.
seoRouter.get('/sitemap.xml', async (_req, res, next) => {
    try {
        const base = env.PUBLIC_SITE_URL.replace(/\/$/, '');
        const [sv, pj, bl] = await Promise.all([
            db.select({ slug: services.slug }).from(services).where(eq(services.status, 'published')),
            db.select({ slug: projects.slug }).from(projects).where(eq(projects.status, 'published')),
            db.select({ slug: blogPosts.slug }).from(blogPosts).where(and(eq(blogPosts.status, 'published'), lte(blogPosts.publishedAt, new Date().toISOString()))),
        ]);
        const urls = ['/', '/services', '/work', '/about', '/pricing', '/blog', '/contact', '/privacy-policy', '/terms',
            ...sv.map((x) => `/services/${x.slug}`), ...pj.map((x) => `/work/${x.slug}`), ...bl.map((x) => `/blog/${x.slug}`)];
        res.type('application/xml').set('Cache-Control', 'public, max-age=3600')
            .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(base + u)}</loc></url>`).join('\n')}\n</urlset>`);
    }
    catch (e) {
        next(e);
    }
});
