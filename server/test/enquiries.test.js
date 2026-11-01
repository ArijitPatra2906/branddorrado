import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';

// Resend is always mocked in tests: no real email is ever sent.
const sendMock = vi.hoisted(() => vi.fn());
vi.mock('resend', () => ({ Resend: class { emails = { send: sendMock }; } }));

import { app, api, freshIp, makeService, uniq, validEnquiry } from './helpers.js';
import { db } from '../src/db/client.js';
import { enquiries, emailAttempts } from '../src/db/schema.js';

const submit = (body, ip = freshIp()) => request(app).post('/api/enquiries').set('X-Forwarded-For', ip).send(body);
const byRef = (reference) => db.query.enquiries.findFirst({ where: eq(enquiries.reference, reference) });

describe('POST /api/enquiries', () => {
    let service;
    beforeEach(async () => {
        sendMock.mockReset();
        sendMock.mockResolvedValue({ data: { id: 'email_123' }, error: null });
        service = await makeService();
    });

    it('saves the enquiry first, normalises it, returns a reference, then sends both emails', async () => {
        const res = await submit(validEnquiry(service.slug, { phone: '+91 98765-43210' }));
        expect(res.status).toBe(201);
        expect(res.body.data.reference).toMatch(/^BD-\d{6}-[A-Z0-9]{5}$/);

        const row = await byRef(res.body.data.reference);
        expect(row.email).toBe('asha@example.com');
        expect(row.phone).toBe('+919876543210');
        expect(row.status).toBe('new');
        expect(row.consentAt).toBeTruthy();

        await vi.waitFor(async () => {
            const after = await byRef(res.body.data.reference);
            expect(after.notifyStatus).toBe('sent');
            expect(after.ackStatus).toBe('sent');
        });
        expect(sendMock).toHaveBeenCalledTimes(2);
        const recipients = sendMock.mock.calls.map((c) => c[0].to).sort();
        expect(recipients).toEqual(['asha@example.com', 'leads@example.com']);
    });

    it('returns field-level errors for invalid input and saves nothing', async () => {
        const res = await submit({ fullName: 'A', email: 'nope', service: '', consent: false });
        expect(res.status).toBe(400);
        const paths = res.body.error.fields.map((f) => f.path);
        expect(paths).toEqual(expect.arrayContaining(['fullName', 'email', 'service', 'consent']));
    });

    it('rejects unknown fields (including client-supplied status or ids)', async () => {
        const res = await submit(validEnquiry(service.slug, { status: 'won', assignedTo: 'someone' }));
        expect(res.status).toBe(400);
    });

    it('rejects a service that is not published', async () => {
        const draft = await makeService({ status: 'draft' });
        const res = await submit(validEnquiry(draft.slug));
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_service');
    });

    it('rejects options that are not on the configured lists', async () => {
        const res = await submit(validEnquiry(service.slug, { budgetRange: 'one million dollars' }));
        expect(res.status).toBe(400);
    });

    it('honeypot: pretends to succeed but stores and sends nothing', async () => {
        const marker = uniq('bot');
        const res = await submit(validEnquiry(service.slug, { fullName: marker, companyWebsite: 'http://spam.example' }));
        expect(res.status).toBe(201);
        expect(res.body.data.reference).toBeNull();
        const found = await db.select().from(enquiries).where(eq(enquiries.fullName, marker));
        expect(found).toHaveLength(0);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('treats an accidental double submit as the same enquiry', async () => {
        const body = validEnquiry(service.slug);
        const a = await submit(body);
        const b = await submit(body);
        expect(a.status).toBe(201);
        expect(b.status).toBe(201);
        expect(b.body.data.reference).toBe(a.body.data.reference);
        await vi.waitFor(async () => expect((await byRef(a.body.data.reference)).ackStatus).toBe('sent'));
        expect(sendMock).toHaveBeenCalledTimes(2); // not 4
    });

    it('keeps the enquiry and reports success when Resend fails; logs only an error code', async () => {
        sendMock.mockResolvedValue({ data: null, error: { name: 'rate_limit_exceeded', message: 'secret details' } });
        const res = await submit(validEnquiry(service.slug));
        expect(res.status).toBe(201);
        await vi.waitFor(async () => expect((await byRef(res.body.data.reference)).notifyStatus).toBe('failed'));
        const row = await byRef(res.body.data.reference);
        expect(row.ackStatus).toBe('pending'); // customer is only emailed after the agency notification succeeds
        const attempts = await db.select().from(emailAttempts).where(eq(emailAttempts.enquiryId, row.id));
        expect(attempts[0].status).toBe('failed');
        expect(attempts[0].errorCode).toBe('rate_limit_exceeded');
        expect(JSON.stringify(attempts)).not.toContain('secret details');
    });

    it('survives Resend throwing', async () => {
        sendMock.mockRejectedValue(new Error('network down'));
        const res = await submit(validEnquiry(service.slug));
        expect(res.status).toBe(201);
        await vi.waitFor(async () => expect((await byRef(res.body.data.reference)).notifyStatus).toBe('failed'));
    });

    it('does not leak internals in the response', async () => {
        const res = await submit(validEnquiry(service.slug));
        expect(JSON.stringify(res.body)).not.toMatch(/dedupe|stack|libsql|SQLITE/i);
    });

    it('rate limits one address after 6 submissions in the window', async () => {
        const ip = freshIp();
        const statuses = [];
        for (let i = 0; i < 7; i++) statuses.push((await submit({ fullName: 'A' }, ip)).status);
        expect(statuses.slice(0, 6).every((s) => s === 400)).toBe(true);
        expect(statuses[6]).toBe(429);
    });

    it('GET /api/enquiry-options serves the configurable option lists', async () => {
        const res = await api().get('/api/enquiry-options');
        expect(res.status).toBe(200);
        expect(res.body.data.budgets.length).toBeGreaterThan(0);
    });
});
