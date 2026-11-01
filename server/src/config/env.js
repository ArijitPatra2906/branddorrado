import 'dotenv/config';
import { z } from 'zod';
const list = (s) => s.split(',').map((v) => v.trim()).filter(Boolean);
const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_URL: z.string().url(),
    CLIENT_URLS: z.string().default(''),
    PUBLIC_SITE_URL: z.string().url(),
    TURSO_DATABASE_URL: z.string().min(1),
    TURSO_AUTH_TOKEN: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    BRAND_EMAIL_FROM: z.string().optional(),
    BRAND_LEAD_EMAIL_TO: z.string().email().optional().or(z.literal('')),
    SESSION_SECRET: z.string().min(32, 'must be at least 32 characters'),
    COOKIE_DOMAIN: z.string().optional(),
    ADMIN_SETUP_SECRET: z.string().optional(),
    // Public address of this API, used to build links to uploaded photos and videos (which are stored in Turso).
    PUBLIC_API_URL: z.string().url().optional().or(z.literal('')),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    // Names only: never print values.
    const bad = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    console.error(`Invalid environment configuration:\n  ${bad}`);
    process.exit(1);
}
const e = parsed.data;
if (e.NODE_ENV === 'production' && !e.TURSO_DATABASE_URL.startsWith('libsql://')) {
    console.error('TURSO_DATABASE_URL must be a libsql:// URL in production.');
    process.exit(1);
}
const allowedOrigins = [...new Set([e.CLIENT_URL, ...list(e.CLIENT_URLS)])];
const isProd = e.NODE_ENV === 'production';
// While developing, the site may be opened from another phone or computer on the same network (http://192.168.x.x:5173),
// so private-network addresses are accepted too. In production only the configured origins are ever accepted.
const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|[a-z0-9-]+\.local)$/i;
const isOriginAllowed = (origin) => {
    if (!origin || allowedOrigins.includes(origin))
        return true;
    if (isProd)
        return false;
    try {
        const u = new URL(origin);
        return (u.protocol === 'http:' || u.protocol === 'https:') && PRIVATE_HOST.test(u.hostname);
    }
    catch {
        return false;
    }
};
export const env = {
    ...e,
    allowedOrigins,
    isOriginAllowed,
    isProd,
    publicApiUrl: (e.PUBLIC_API_URL || `http://localhost:${e.PORT}`).replace(/\/$/, ''),
};
