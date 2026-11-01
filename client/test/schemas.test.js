import { describe, expect, it } from 'vitest';
import { enquiryFormSchema } from '../src/schemas/enquiry';
import { passwordProblem } from '../src/lib/passwordRule';

const valid = { fullName: 'Asha Rao', email: 'asha@example.com', service: 'content', description: 'We need a content plan for our cafe.', consent: true,
    businessName: '', phone: '', websiteUrl: '', package: '', budgetRange: '', timeline: '', contactMethod: '', referralSource: '' };

describe('enquiry form schema', () => {
    it('accepts a valid enquiry', () => expect(enquiryFormSchema.safeParse(valid).success).toBe(true));
    it('requires name, email, service and consent (the description is optional)', () => {
        const r = enquiryFormSchema.safeParse({ ...valid, fullName: '', email: '', service: '', description: '', consent: false });
        expect(r.success).toBe(false);
        const keys = r.error.issues.map((i) => i.path[0]);
        expect(keys).toEqual(expect.arrayContaining(['fullName', 'email', 'service', 'consent']));
    });
    it('rejects a malformed email and accepts a blank or short description', () => {
        expect(enquiryFormSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
        expect(enquiryFormSchema.safeParse({ ...valid, description: '' }).success).toBe(true);
        expect(enquiryFormSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(true);
        expect(enquiryFormSchema.safeParse({ ...valid, description: 'x'.repeat(3001) }).success).toBe(false);
    });
    it('accepts formatted phone numbers but not junk', () => {
        expect(enquiryFormSchema.safeParse({ ...valid, phone: '+91 98765-43210' }).success).toBe(true);
        expect(enquiryFormSchema.safeParse({ ...valid, phone: 'call me' }).success).toBe(false);
    });
});

describe('passwordProblem', () => {
    it.each([['Ab1!x', 'Use at least 6'], ['ABCDE1!', 'lowercase'], ['abcde1!', 'uppercase'], ['Abcdef!', 'number'], ['Abcdef1', 'special']])('%s', (pw, text) => {
        expect(passwordProblem(pw)).toContain(text);
    });
    it('returns empty for a strong password', () => expect(passwordProblem('Abc1!x')).toBe(''));
});
