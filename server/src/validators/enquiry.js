import { z } from 'zod';
import { enquiryOptions } from '../lib/enquiryOptions.js';
const clean = (max) => z.string().trim().max(max);
const optionalText = (max) => clean(max).optional().transform((v) => (v ? v : undefined));
const oneOf = (list) => clean(80).optional().transform((v) => (v ? v : undefined)).refine((v) => v === undefined || list.includes(v), 'Please choose one of the listed options.');
// Accepts "+91 98765-43210", "(022) 1234 5678" etc. Stored as optional "+" followed by 8-15 digits.
export const normalisePhone = (raw) => {
    const hasPlus = raw.trim().startsWith('+');
    const digits = raw.replace(/\D/g, '');
    return `${hasPlus ? '+' : ''}${digits}`;
};
const phone = clean(30).optional().transform((v) => (v ? normalisePhone(v) : undefined))
    .refine((v) => v === undefined || /^\+?\d{8,15}$/.test(v), 'Enter a valid phone number, including the country code if possible.');
const url = clean(300).optional().transform((v) => (v ? v : undefined)).refine((v) => {
    if (!v)
        return true;
    try {
        const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
        return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.');
    }
    catch {
        return false;
    }
}, 'Enter a valid website or social media link.').transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v));
export const enquirySchema = z.object({
    fullName: clean(100).min(2, 'Please enter your name.'),
    businessName: optionalText(120),
    email: clean(254).email('Enter a valid email address.').transform((v) => v.toLowerCase()),
    phone,
    websiteUrl: url,
    service: clean(80).min(1, 'Please choose a service.'), // service slug
    package: optionalText(80), // pricing package slug
    budgetRange: oneOf(enquiryOptions.budgets),
    timeline: oneOf(enquiryOptions.timelines),
    contactMethod: oneOf(enquiryOptions.contactMethods),
    description: clean(3000).optional().default(''), // optional: stored as an empty string when left blank
    referralSource: oneOf(enquiryOptions.referralSources),
    consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm you have read the privacy notice.' }) }),
    // Honeypot: real visitors never see or fill this field.
    companyWebsite: z.string().max(200).optional(),
}).strict()
    .refine((d) => !enquiryOptions.phoneRequired || !!d.phone, { path: ['phone'], message: 'Please enter a phone number.' });
