import { z } from 'zod';
// Client-side validation for a fast, friendly form. The server re-validates every field (server/src/validators/enquiry.js).
const optional = (max) => z.string().trim().max(max);
export const enquiryFormSchema = z.object({
    fullName: z.string().trim().min(2, 'Please enter your name.').max(100),
    businessName: optional(120),
    email: z.string().trim().min(1, 'Please enter your email address.').email('Enter a valid email address.').max(254),
    phone: optional(30).refine((v) => v === '' || /^\+?\d{8,15}$/.test(v.replace(/[\s().-]/g, '')), 'Enter a valid phone number, including the country code if possible.'),
    websiteUrl: optional(300),
    service: z.string().min(1, 'Please choose a service.'),
    package: optional(80),
    budgetRange: optional(80),
    timeline: optional(80),
    contactMethod: optional(80),
    description: z.string().trim().max(3000, 'Please keep this under 3000 characters.').optional().default(''), // optional
    referralSource: optional(80),
    consent: z.boolean().refine((v) => v === true, 'Please confirm you have read the privacy notice.'),
    companyWebsite: z.string().max(200).optional(), // honeypot
});
