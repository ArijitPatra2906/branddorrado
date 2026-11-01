import { z } from 'zod';
import { enquiryStatuses, publishStatus, videoRatios } from '../db/schema.js';
import { env } from '../config/env.js';
export const slugify = (v) => v.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only').max(100);
const text = (max) => z.string().trim().max(max);
// Shape of the video card. Missing or empty falls back to the default portrait card.
const ratio = z.enum(videoRatios).nullish().transform((v) => v ?? '4:5');
const optText = (max) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
// Only https URLs, site-relative paths, or files uploaded through this API: blocks javascript:, data: and other schemes.
const mediaPrefix = `${env.publicApiUrl}/media/`;
const safeUrl = z.string().trim().max(600).refine((v) => v === '' || v.startsWith('/') && !v.startsWith('//') || /^https:\/\//i.test(v) || v.startsWith(mediaPrefix), 'Must be an https:// URL or an uploaded file');
const optUrl = safeUrl.nullish().transform((v) => (v ? v : null));
const status = z.enum(publishStatus);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/, 'Use YYYY-MM-DD').nullish().transform((v) => (v ? v : null));
const strList = (n, max = 200) => z.array(z.string().trim().min(1).max(max)).max(n).default([]);
const seo = { seoTitle: optText(70), seoDescription: optText(170) };
export const serviceBody = z.object({
    title: text(100).min(1), slug: slug.optional(), shortDescription: text(300).min(1), detailedDescription: optText(8000),
    imageUrl: optUrl, iconId: optText(40), ctaLabel: optText(40), benefits: strList(12), deliverables: strList(20),
    displayOrder: z.number().int().min(0).max(999).default(0), status: status.default('draft'), ...seo,
});
export const projectBody = z.object({
    title: text(120).min(1), slug: slug.optional(), clientName: optText(120), industry: text(60).min(1), projectType: optText(80),
    shortDescription: text(300).min(1), caseStudy: optText(20000), coverImageUrl: optUrl, videoUrl: optUrl, videoRatio: ratio, externalUrl: optUrl,
    results: z.array(z.object({ label: text(60).min(1), value: text(40).min(1) })).max(8).default([]),
    gallery: z.array(z.object({ url: safeUrl.refine((v) => v !== ''), alt: text(160).default('') })).max(24).default([]),
    serviceIds: z.array(z.string().max(60)).max(10).default([]),
    isDemo: z.boolean().default(false), featured: z.boolean().default(false), status: status.default('draft'), completedOn: isoDate, ...seo,
});
export const testimonialBody = z.object({
    clientName: text(100).min(1), businessName: optText(100), industry: optText(60), avatarUrl: optUrl, body: text(1200).min(1),
    rating: z.number().int().min(1).max(5).nullish().transform((v) => v ?? null),
    approved: z.boolean().default(false), status: status.default('draft'), displayOrder: z.number().int().min(0).max(999).default(0),
});
export const pricingBody = z.object({
    name: text(80).min(1), slug: slug.optional(), description: optText(500),
    priceMinor: z.number().int().min(0).max(1_000_000_000).nullish().transform((v) => v ?? null), customQuote: z.boolean().default(false),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('INR'),
    billingPeriod: z.enum(['one_time', 'monthly', 'quarterly', 'yearly']).default('monthly'),
    revisionTerms: optText(300), deliveryTimeline: optText(200), deliverables: strList(20),
    featured: z.boolean().default(false), available: z.boolean().default(false), displayOrder: z.number().int().min(0).max(999).default(0),
}).refine((v) => v.customQuote || v.priceMinor !== null || !v.available, { message: 'Set a price or mark as custom quote before making it available', path: ['priceMinor'] });
// Same fields and rules as projectBody: a required category and short description, thumbnail, gallery, video, external link, related services, featured and sample flags.
export const blogBody = z.object({
    title: text(160).min(1), slug: slug.optional(), excerpt: text(400).min(1), content: text(60000).min(1), featuredImageUrl: optUrl,
    category: text(60).min(1), authorName: optText(80), videoUrl: optUrl, videoRatio: ratio, externalUrl: optUrl,
    gallery: z.array(z.object({ url: safeUrl.refine((v) => v !== ''), alt: text(160).default('') })).max(24).default([]),
    serviceIds: z.array(z.string().max(60)).max(10).default([]),
    isDemo: z.boolean().default(false), featured: z.boolean().default(false),
    status: status.default('draft'), publishedAt: isoDate, ...seo,
});
export const enquiryPatch = z.object({
    status: z.enum(enquiryStatuses).optional(), followUpOn: isoDate.optional(), assignedTo: z.string().max(60).nullable().optional(),
}).strict();
export const noteBody = z.object({ body: text(4000).min(1) });
export const enquiryListQuery = z.object({
    q: z.string().trim().max(100).optional(), status: z.enum(enquiryStatuses).optional(), service: z.string().trim().max(100).optional(),
    budget: z.string().trim().max(100).optional(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
});
