import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { db } from '../src/db/client.js';
import { adminUsers, services } from '../src/db/schema.js';
import { hashPassword } from '../src/lib/auth.js';

export const app = createApp();
let ipCounter = 10;
// Each request pretends to come from a different address (the app trusts one proxy hop), so per-IP rate limits do not interfere between tests.
export const freshIp = () => `10.1.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
export const api = () => ({
    get: (url) => request(app).get(url).set('X-Forwarded-For', freshIp()),
    post: (url) => request(app).post(url).set('X-Forwarded-For', freshIp()),
});

export const PASSWORD = 'Sup3r!pass';
export const uniq = (p = 'x') => `${p}-${randomUUID().slice(0, 8)}`;

export async function makeService(overrides = {}) {
    const slug = overrides.slug ?? uniq('svc');
    const [row] = await db.insert(services).values({ title: `Service ${slug}`, slug, shortDescription: 'Short description', status: 'published', ...overrides }).returning();
    return row;
}

export async function makeAdmin({ role = 'admin', permissions = null } = {}) {
    const email = `${uniq('admin')}@example.com`;
    const [row] = await db.insert(adminUsers).values({ name: 'Test Admin', email, passwordHash: await hashPassword(PASSWORD), role, permissions }).returning();
    return { ...row, email, password: PASSWORD };
}

// Signs in through the real endpoint and returns a helper that sends cookie + CSRF header.
export async function signIn(user) {
    const res = await request(app).post('/api/auth/login').set('X-Forwarded-For', freshIp()).send({ email: user.email, password: user.password });
    if (res.status !== 200) throw new Error(`login failed in test helper: ${res.status}`);
    const cookie = res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
    const csrf = res.body.data.csrfToken;
    const call = (method, url) => request(app)[method](url).set('X-Forwarded-For', freshIp()).set('Cookie', cookie).set('X-CSRF-Token', csrf);
    return { cookie, csrf, get: (u) => call('get', u), post: (u) => call('post', u), patch: (u) => call('patch', u), delete: (u) => call('delete', u) };
}

export const validEnquiry = (service, extra = {}) => ({
    fullName: 'Asha Rao',
    email: 'Asha@Example.com',
    service,
    description: `We run a cafe and want a content plan ${uniq('d')} for the next quarter.`,
    consent: true,
    ...extra,
});
