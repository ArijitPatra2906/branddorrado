import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { siteSettings } from '../db/schema.js';
const httpUrl = z.string().url().max(500).refine((v) => /^https?:\/\//i.test(v), 'Must be an http(s) URL');
const optionalUrl = httpUrl.or(z.literal('')).default('');
const stat = z.object({ label: z.string().max(60), value: z.string().max(30), verified: z.boolean().default(false) });
// Stats start unverified with empty values: nothing is shown publicly until the admin confirms real figures.
const heroStatLabels = ['Brands Worked With', 'Views Generated', 'Engagement', 'Community Growth'];
const aboutStatLabels = ['Brands Worked With', 'Total Views Generated', 'Community Growth', 'Client Satisfaction'];
const blankStats = (labels) => labels.map((label) => ({ label, value: '', verified: false }));
export const settingsSchema = z.object({
    agencyName: z.string().max(80).default('BrandDorrado'),
    tagline: z.string().max(120).default('Turn Brands Golden'),
    publicEmail: z.string().email().or(z.literal('')).default(''),
    whatsappNumber: z.string().regex(/^\d{8,15}$/, 'Digits only, with country code').or(z.literal('')).default(''),
    social: z.object({ instagram: optionalUrl, youtube: optionalUrl, linkedin: optionalUrl }).default({}),
    // sceneEnabled is the master switch; devices lets the admin turn the 3D hero off for one kind of device only.
    hero: z.object({
        videoUrl: optionalUrl, imageUrl: optionalUrl, sceneEnabled: z.boolean().default(true), motion: z.enum(['full', 'low']).default('full'),
        devices: z.object({ phone: z.boolean().default(true), tablet: z.boolean().default(true), laptop: z.boolean().default(true), desktop: z.boolean().default(true) }).default({}),
    }).default({}),
    heroStats: z.array(stat).max(6).default(blankStats(heroStatLabels)),
    aboutStats: z.array(stat).max(6).default(blankStats(aboutStatLabels)),
    aboutImageUrl: optionalUrl,
    footerBlurb: z.string().max(300).default('A creative and digital marketing agency helping businesses build strong, memorable brands.'),
    responseTimeText: z.string().max(200).default(''),
    // Markdown. Empty = the site shows a short factual data-handling notice (privacy) or a pending notice (terms). Have a lawyer review before publishing.
    legal: z.object({ privacy: z.string().max(40000).default(''), terms: z.string().max(40000).default('') }).default({}),
});
export async function loadSettings() {
    const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
    const parsed = settingsSchema.safeParse(row?.data ?? {});
    return parsed.success ? parsed.data : settingsSchema.parse({});
}
const visibleStats = (s) => s.filter((x) => x.verified && x.value.trim() !== '');
// Public projection: only fields meant for visitors.
export function toPublic(s) {
    return {
        agencyName: s.agencyName, tagline: s.tagline, publicEmail: s.publicEmail, whatsappNumber: s.whatsappNumber,
        social: s.social, hero: s.hero, heroStats: visibleStats(s.heroStats), aboutStats: visibleStats(s.aboutStats),
        aboutImageUrl: s.aboutImageUrl, footerBlurb: s.footerBlurb, responseTimeText: s.responseTimeText, legal: s.legal,
    };
}
