import { describe, expect, it } from 'vitest';
import { enquirySchema, normalisePhone } from '../src/validators/enquiry.js';
import { passwordRule } from '../src/routes/auth.js';
import { likePattern } from '../src/routes/content.js';

const base = { fullName: 'Asha Rao', email: 'a@b.co', service: 'content', description: 'x'.repeat(25), consent: true };

describe('enquiry schema', () => {
    it('lowercases email and prefixes bare website domains with https', () => {
        const r = enquirySchema.parse({ ...base, email: 'ASHA@Example.COM', websiteUrl: 'instagram.com/brand' });
        expect(r.email).toBe('asha@example.com');
        expect(r.websiteUrl).toBe('https://instagram.com/brand');
    });
    it('rejects javascript: and other non-http URLs', () => {
        expect(enquirySchema.safeParse({ ...base, websiteUrl: 'javascript:alert(1)' }).success).toBe(false);
    });
    it('requires consent to be exactly true', () => {
        expect(enquirySchema.safeParse({ ...base, consent: 'true' }).success).toBe(false);
    });
    it('treats the project description as optional but still caps its length', () => {
        const { description: _omit, ...without } = base;
        const parsed = enquirySchema.safeParse(without);
        expect(parsed.success).toBe(true);
        expect(parsed.data.description).toBe('');
        expect(enquirySchema.safeParse({ ...base, description: '' }).success).toBe(true);
        expect(enquirySchema.safeParse({ ...base, description: 'short' }).success).toBe(true);
        expect(enquirySchema.safeParse({ ...base, description: 'x'.repeat(3001) }).success).toBe(false);
    });
    it('rejects over-long names', () => {
        expect(enquirySchema.safeParse({ ...base, fullName: 'n'.repeat(101) }).success).toBe(false);
    });
    it('normalises phone numbers and rejects implausible ones', () => {
        expect(normalisePhone('+91 98765-43210')).toBe('+919876543210');
        expect(enquirySchema.safeParse({ ...base, phone: '12' }).success).toBe(false);
    });
});

describe('password rule', () => {
    it.each([['Ab1!x', false], ['abcdef1!', false], ['ABCDEF1!', false], ['Abcdefg!', false], ['Abcdef12', false], ['Abc1!x', true]])('%s -> %s', (pw, ok) => {
        expect(passwordRule.safeParse(pw).success).toBe(ok);
    });
});

describe('LIKE escaping', () => {
    it('escapes wildcard characters so search input is literal', () => {
        expect(likePattern('50%_off')).toBe('%50!%!_off%');
    });
});
