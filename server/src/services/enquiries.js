import { createHash, randomInt } from 'node:crypto';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { emailAttempts, enquiries, pricingPackages, services } from '../db/schema.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { CONSENT_VERSION } from '../lib/enquiryOptions.js';
import { loadSettings } from '../lib/siteSettings.js';
import { agencyEmail, customerEmail } from '../templates/emails.js';
import { leadInboxConfigured, sendEmail } from './email.js';
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_EMAIL_ATTEMPTS = 5;
// No 0/O/1/I/L, so references can be read out over the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeReference = () => {
    const d = new Date();
    const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    return `BD-${ymd}-${Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;
};
const dedupeHash = (i) => createHash('sha256').update(`${i.email}|${i.service}|${i.description.toLowerCase().replace(/\s+/g, ' ')}`).digest('hex');
// 1. Validate service/package server-side  2. Persist  3. Return. Emails are processed afterwards (see processEmails).
export async function createEnquiry(input) {
    const service = await db.query.services.findFirst({ where: and(eq(services.slug, input.service), eq(services.status, 'published')) });
    if (!service)
        throw new HttpError(400, 'Please choose one of the listed services.', 'invalid_service');
    const pkg = input.package
        ? await db.query.pricingPackages.findFirst({ where: and(eq(pricingPackages.slug, input.package), eq(pricingPackages.available, true)) })
        : undefined;
    const hash = dedupeHash(input);
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const dup = await db.query.enquiries.findFirst({ where: and(eq(enquiries.dedupeHash, hash), gte(enquiries.createdAt, since)) });
    if (dup)
        return { reference: dup.reference, duplicate: true, id: null }; // an accidental double submit: already saved, so success is truthful
    for (let attempt = 0; attempt < 5; attempt++) {
        const reference = makeReference();
        try {
            const [row] = await db.insert(enquiries).values({
                reference, fullName: input.fullName, businessName: input.businessName ?? null, email: input.email, phone: input.phone ?? null,
                websiteUrl: input.websiteUrl ?? null, serviceId: service.id, serviceLabel: service.title, packageId: pkg?.id ?? null,
                budgetRange: input.budgetRange ?? null, timeline: input.timeline ?? null, contactMethod: input.contactMethod ?? null,
                description: input.description, referralSource: input.referralSource ?? null,
                consentAt: new Date().toISOString(), consentVersion: CONSENT_VERSION, dedupeHash: hash,
            }).returning({ id: enquiries.id });
            return { reference, duplicate: false, id: row.id };
        }
        catch (err) {
            if (!/UNIQUE/i.test(String(err?.message)))
                throw err; // reference collision: try another
        }
    }
    throw new Error('Could not allocate an enquiry reference.');
}
async function record(enquiryId, kind, r) {
    await db.insert(emailAttempts).values({
        enquiryId, kind, status: r.ok ? 'sent' : 'failed', providerId: r.ok ? r.providerId : null, errorCode: r.ok ? null : r.errorCode,
    });
    if (!r.ok)
        console.warn(`[email] ${kind} failed for enquiry ${enquiryId}: ${r.errorCode}`);
}
// Never throws: a failure here must not affect the saved enquiry. Safe to call again for retries.
export async function processEmails(enquiryId) {
    try {
        const e = await db.query.enquiries.findFirst({ where: eq(enquiries.id, enquiryId) });
        if (!e)
            return;
        const pkg = e.packageId ? await db.query.pricingPackages.findFirst({ where: eq(pricingPackages.id, e.packageId) }) : undefined;
        const view = { ...e, packageName: pkg?.name ?? null };
        const site = env.PUBLIC_SITE_URL.replace(/\/$/, '');
        const settings = await loadSettings();
        if (e.notifyStatus !== 'sent') {
            if (!leadInboxConfigured()) {
                await db.update(enquiries).set({ notifyStatus: 'failed' }).where(eq(enquiries.id, e.id));
                console.warn('[email] BRAND_LEAD_EMAIL_TO is not configured.');
                return;
            }
            const m = agencyEmail(view, { siteUrl: site, adminUrl: `${site}/admin/enquiries/${e.id}` });
            const r = await sendEmail({ to: env.BRAND_LEAD_EMAIL_TO, ...m, replyTo: e.email });
            await record(e.id, 'agency_notification', r);
            await db.update(enquiries).set({ notifyStatus: r.ok ? 'sent' : 'failed' }).where(eq(enquiries.id, e.id));
            if (!r.ok)
                return; // acknowledgement follows only once the agency has been notified
        }
        if (e.ackStatus !== 'sent' && e.ackStatus !== 'skipped') {
            const m = customerEmail(view, { siteUrl: site, publicEmail: settings.publicEmail, social: settings.social, responseTimeText: settings.responseTimeText });
            const r = await sendEmail({ to: e.email, ...m, replyTo: settings.publicEmail || env.BRAND_LEAD_EMAIL_TO || undefined });
            await record(e.id, 'customer_ack', r);
            await db.update(enquiries).set({ ackStatus: r.ok ? 'sent' : 'failed' }).where(eq(enquiries.id, e.id));
        }
    }
    catch (err) {
        console.error(`[email] processing failed for enquiry ${enquiryId}: ${err?.name ?? 'Error'}`);
    }
}
// Recovery: re-tries enquiries whose emails are still pending/failed (fewer than MAX attempts, older than 2 minutes).
export async function retryUnsentEmails() {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const rows = await db.select({ id: enquiries.id, n: enquiries.notifyStatus, a: enquiries.ackStatus }).from(enquiries)
        .where(and(lt(enquiries.createdAt, cutoff), inArray(enquiries.status, ['new', 'contacted', 'qualified', 'proposal_sent'])));
    const todo = rows.filter((r) => r.n !== 'sent' || (r.a !== 'sent' && r.a !== 'skipped'));
    let done = 0;
    for (const r of todo.slice(0, 20)) {
        const attempts = await db.select({ id: emailAttempts.id }).from(emailAttempts).where(and(eq(emailAttempts.enquiryId, r.id), eq(emailAttempts.status, 'failed')));
        if (attempts.length >= MAX_EMAIL_ATTEMPTS)
            continue;
        await processEmails(r.id);
        done++;
    }
    return done;
}
