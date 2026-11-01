import { Resend } from 'resend';
import { env } from '../config/env.js';
const SEND_TIMEOUT_MS = 10_000;
let client = null;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// BRAND_EMAIL_FROM may be "BrandDorrado <hello@yourdomain.com>" or a bare address on a domain verified in Resend.
const fromOk = (v) => !!v && (emailRe.test(v) || /^[^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(v));
export const emailConfigured = () => !!env.RESEND_API_KEY && fromOk(env.BRAND_EMAIL_FROM);
export const leadInboxConfigured = () => !!env.BRAND_LEAD_EMAIL_TO;
// Never logs bodies or recipient addresses: only a short error code and the provider id.
export async function sendEmail(msg) {
    if (!emailConfigured())
        return { ok: false, errorCode: 'not_configured' };
    if (!emailRe.test(msg.to))
        return { ok: false, errorCode: 'invalid_recipient' };
    client ??= new Resend(env.RESEND_API_KEY);
    try {
        const result = await Promise.race([
            client.emails.send({ from: env.BRAND_EMAIL_FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, replyTo: msg.replyTo }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), SEND_TIMEOUT_MS)),
        ]);
        if (result.error)
            return { ok: false, errorCode: String(result.error.name ?? 'provider_error').slice(0, 60) };
        return { ok: true, providerId: result.data?.id ?? null };
    }
    catch (err) {
        return { ok: false, errorCode: err instanceof Error && err.message === 'timeout' ? 'timeout' : 'network_error' };
    }
}
