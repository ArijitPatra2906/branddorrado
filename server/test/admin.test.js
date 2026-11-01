import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('resend', () => ({ Resend: class { emails = { send: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }) }; } }));

import { app, api, freshIp, makeAdmin, makeService, signIn, uniq, PASSWORD, validEnquiry } from './helpers.js';
import { db } from '../src/db/client.js';
import { enquiries } from '../src/db/schema.js';

describe('authentication', () => {
    it('signs in with correct credentials and sets an HTTP-only cookie (no token in the body)', async () => {
        const u = await makeAdmin();
        const res = await request(app).post('/api/auth/login').set('X-Forwarded-For', freshIp()).send({ email: u.email, password: PASSWORD });
        expect(res.status).toBe(200);
        const cookie = res.headers['set-cookie'][0];
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite/i);
        expect(res.body.data.user.email).toBe(u.email);
        expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    });

    it('rejects a wrong password and an unknown email with the same message', async () => {
        const u = await makeAdmin();
        const wrong = await api().post('/api/auth/login').send({ email: u.email, password: 'Wrong!pass1' });
        const unknown = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong!pass1' });
        expect(wrong.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(wrong.body.error.message).toBe(unknown.body.error.message);
    });

    it('rejects a login from an origin that is not allow-listed', async () => {
        const u = await makeAdmin();
        const res = await request(app).post('/api/auth/login').set('X-Forwarded-For', freshIp()).set('Origin', 'https://evil.example').send({ email: u.email, password: PASSWORD });
        expect(res.status).toBe(403);
    });

    it('accepts a private-network origin outside production (phone on the same Wi-Fi), still rejects public ones', async () => {
        const u = await makeAdmin();
        const lan = await request(app).post('/api/auth/login').set('X-Forwarded-For', freshIp()).set('Origin', 'http://192.168.1.50:5173').send({ email: u.email, password: PASSWORD });
        expect(lan.status).toBe(200);
        expect(lan.headers['access-control-allow-origin']).toBe('http://192.168.1.50:5173');
        const pub = await request(app).post('/api/auth/login').set('X-Forwarded-For', freshIp()).set('Origin', 'http://203.0.113.9:5173').send({ email: u.email, password: PASSWORD });
        expect(pub.status).toBe(403);
    });

    it('locks out after repeated failed attempts from one address', async () => {
        const ip = freshIp();
        const codes = [];
        for (let i = 0; i < 11; i++) codes.push((await request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({ email: 'x@example.com', password: 'Nope!pass1' })).status);
        expect(codes[10]).toBe(429);
    });

    it('logout revokes the session on the server', async () => {
        const s = await signIn(await makeAdmin());
        expect((await s.get('/api/auth/me')).status).toBe(200);
        expect((await s.post('/api/auth/logout')).status).toBe(200);
        expect((await s.get('/api/auth/me')).status).toBe(401);
    });

    it('a deactivated admin cannot use an existing session', async () => {
        const u = await makeAdmin();
        const s = await signIn(u);
        const { adminUsers } = await import('../src/db/schema.js');
        const { eq } = await import('drizzle-orm');
        await db.update(adminUsers).set({ active: false }).where(eq(adminUsers.id, u.id));
        expect((await s.get('/api/admin/dashboard')).status).toBe(401);
    });
});

describe('admin authorisation', () => {
    it('blocks every admin route without a session', async () => {
        for (const path of ['/api/admin/dashboard', '/api/admin/enquiries', '/api/admin/projects', '/api/admin/services', '/api/admin/settings', '/api/admin/team']) {
            const res = await api().get(path);
            expect(res.status, path).toBe(401);
        }
    });

    it('requires the CSRF token on state-changing requests', async () => {
        const s = await signIn(await makeAdmin());
        const res = await request(app).post('/api/admin/services').set('X-Forwarded-For', freshIp()).set('Cookie', s.cookie).send({ title: 'No csrf', shortDescription: 'x' });
        expect(res.status).toBe(403);
    });

    it('enforces per-area permissions on the server', async () => {
        const s = await signIn(await makeAdmin({ permissions: ['blog'] }));
        expect((await s.get('/api/admin/enquiries')).status).toBe(403);
        expect((await s.get('/api/admin/services')).status).toBe(403);
        expect((await s.get('/api/admin/blog')).status).toBe(200);
    });

    it('only the super admin can reach Team and Activity', async () => {
        const admin = await signIn(await makeAdmin());
        expect((await admin.get('/api/admin/team')).status).toBe(403);
        expect((await admin.get('/api/admin/activity')).status).toBe(403);
        const sup = await signIn(await makeAdmin({ role: 'super_admin' }));
        expect((await sup.get('/api/admin/team')).status).toBe(200);
    });
});

describe('admin CRUD', () => {
    it('creates, updates, publishes and deletes a service', async () => {
        const s = await signIn(await makeAdmin());
        const title = `Test Service ${uniq()}`;
        const created = await s.post('/api/admin/services').send({ title, shortDescription: 'A short description', status: 'draft' });
        expect(created.status).toBe(201);
        const id = created.body.data.id;

        const patched = await s.patch(`/api/admin/services/${id}`).send({ status: 'published' });
        expect(patched.status).toBe(200);
        const read = await s.get(`/api/admin/services/${id}`);
        expect(read.body.data.status).toBe('published');
        expect(read.body.data.title).toBe(title); // PATCH must not reset omitted fields

        const del = await s.delete(`/api/admin/services/${id}`);
        expect(del.status).toBe(200);
        expect((await s.get(`/api/admin/services/${id}`)).status).toBe(404);
    });

    it('rejects invalid bodies and unsafe URLs', async () => {
        const s = await signIn(await makeAdmin());
        const bad = await s.post('/api/admin/services').send({ title: '', shortDescription: '' });
        expect(bad.status).toBe(400);
        const unsafe = await s.post('/api/admin/projects').send({ title: 'P', industry: 'Fitness', shortDescription: 'x', coverImageUrl: 'javascript:alert(1)' });
        expect(unsafe.status).toBe(400);
    });

    it('returns 409 for a duplicate slug', async () => {
        const s = await signIn(await makeAdmin());
        const slug = uniq('dup');
        expect((await s.post('/api/admin/services').send({ title: 'One', slug, shortDescription: 'x' })).status).toBe(201);
        expect((await s.post('/api/admin/services').send({ title: 'Two', slug, shortDescription: 'x' })).status).toBe(409);
    });

    it('creates a project and only shows it publicly once published', async () => {
        const s = await signIn(await makeAdmin());
        const title = `Case ${uniq()}`;
        const created = await s.post('/api/admin/projects').send({ title, industry: 'Fitness', shortDescription: 'Demo', isDemo: true, status: 'draft' });
        expect(created.status).toBe(201);
        const slug = (await s.get(`/api/admin/projects/${created.body.data.id}`)).body.data.slug;
        expect((await api().get(`/api/projects/${slug}?t=${uniq()}`)).status).toBe(404);
        await s.patch(`/api/admin/projects/${created.body.data.id}`).send({ status: 'published' });
        expect((await api().get(`/api/projects/${slug}?t=${uniq()}`)).status).toBe(200);
    });
});

describe('admin changes appear publicly at once', () => {
    it('public responses are not cached by browsers, and an admin save shows immediately', async () => {
        const s = await signIn(await makeAdmin());
        const primed = await api().get('/api/services'); // fills the server's short-term copy
        expect(primed.headers['cache-control']).toBe('no-cache');
        const rev1 = (await api().get('/api/revision')).body.data.revision;

        const title = `Instant ${uniq()}`;
        const created = await s.post('/api/admin/services').send({ title, shortDescription: 'Appears at once', status: 'published' });
        expect(created.status).toBe(201);

        const after = await api().get('/api/services');
        expect(after.body.data.some((x) => x.title === title)).toBe(true);
        const rev2 = (await api().get('/api/revision')).body.data.revision;
        expect(rev2).not.toBe(rev1);
    });
});

describe('enquiry management and protected data', () => {
    it('lists, updates status, adds a private note, exports CSV; public APIs never expose notes', async () => {
        const svc = await makeService();
        const marker = uniq('lead');
        const sub = await request(app).post('/api/enquiries').set('X-Forwarded-For', freshIp()).send(validEnquiry(svc.slug, { fullName: `Lead ${marker}` }));
        expect(sub.status).toBe(201);

        const s = await signIn(await makeAdmin());
        const list = await s.get(`/api/admin/enquiries?q=${marker}`);
        expect(list.status).toBe(200);
        expect(list.body.data).toHaveLength(1);
        const id = list.body.data[0].id;

        expect((await s.patch(`/api/admin/enquiries/${id}`).send({ status: 'contacted', followUpOn: '2026-12-01' })).status).toBe(200);
        expect((await s.patch(`/api/admin/enquiries/${id}`).send({ status: 'bogus' })).status).toBe(400);

        const secret = `internal-note-${marker}`;
        expect((await s.post(`/api/admin/enquiries/${id}/notes`).send({ body: secret })).status).toBeLessThan(300);
        const detail = await s.get(`/api/admin/enquiries/${id}`);
        expect(detail.body.data.status).toBe('contacted');
        expect(detail.body.data.notes[0].body).toBe(secret);
        expect(detail.body.data.dedupeHash).toBeUndefined();

        const csv = await s.get('/api/admin/enquiries/export.csv');
        expect(csv.status).toBe(200);
        expect(csv.headers['content-type']).toMatch(/text\/csv/);

        for (const path of ['/api/services', '/api/projects', '/api/testimonials', '/api/pricing', '/api/blog', '/api/site-settings/public', '/api/enquiry-options']) {
            const res = await api().get(path);
            expect(JSON.stringify(res.body), path).not.toContain(secret);
            expect(JSON.stringify(res.body), path).not.toContain(`Lead ${marker}`);
        }
        const rows = await db.select().from(enquiries);
        expect(rows.length).toBeGreaterThan(0);
    });
});
