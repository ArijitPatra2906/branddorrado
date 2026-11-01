import { describe, expect, it } from 'vitest';
import { api, makeService, uniq } from './helpers.js';
import { db } from '../src/db/client.js';
import { projects } from '../src/db/schema.js';

describe('health and public content', () => {
    it('GET /api/health reports the database as up', async () => {
        const res = await api().get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok', db: 'up' });
    });

    it('unknown API routes return a structured 404', async () => {
        const res = await api().get('/api/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('not_found');
    });

    it('lists only published services and hides drafts', async () => {
        const pub = await makeService({ status: 'published' });
        const draft = await makeService({ status: 'draft' });
        const res = await api().get(`/api/services?t=${uniq()}`);
        expect(res.status).toBe(200);
        const slugs = res.body.data.map((s) => s.slug);
        expect(slugs).toContain(pub.slug);
        expect(slugs).not.toContain(draft.slug);
    });

    it('lists only published projects and exposes no internal fields', async () => {
        const slug = uniq('proj');
        await db.insert(projects).values({ title: 'Published one', slug, industry: 'Restaurants', shortDescription: 'x', status: 'published' });
        await db.insert(projects).values({ title: 'Draft one', slug: uniq('draft'), industry: 'Restaurants', shortDescription: 'x', status: 'draft' });
        const res = await api().get(`/api/projects?q=Published%20one&t=${uniq()}`);
        expect(res.status).toBe(200);
        expect(res.body.data.some((p) => p.slug === slug)).toBe(true);
        expect(res.body.data.every((p) => p.title !== 'Draft one')).toBe(true);
        expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|dedupe|internal/i);
    });

    it('rejects invalid query parameters', async () => {
        const res = await api().get('/api/projects?limit=9999');
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('validation_error');
    });

    it('public settings never include secrets', async () => {
        const res = await api().get('/api/site-settings/public');
        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toMatch(/SESSION_SECRET|RESEND_API_KEY|TURSO_AUTH_TOKEN|re_test_key/);
    });
});
