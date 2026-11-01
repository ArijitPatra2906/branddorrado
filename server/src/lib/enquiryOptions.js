// Selectable options for the enquiry form. Served by GET /api/enquiry-options so the client never hardcodes them.
// Edit here until the admin settings screen (Phase 5) takes over. Budget bands are choices for the visitor, not price commitments.
export const CONSENT_VERSION = 'privacy-v1';
export const enquiryOptions = {
    budgets: ['Under ₹25,000', '₹25,000 – ₹75,000', '₹75,000 – ₹2,00,000', '₹2,00,000+', 'Not sure yet'],
    timelines: ['As soon as possible', 'Within 1 month', '1 – 3 months', 'Flexible'],
    contactMethods: ['Email', 'Phone call', 'WhatsApp'],
    referralSources: ['Instagram', 'Google search', 'Friend or colleague', 'YouTube', 'LinkedIn', 'Other'],
    phoneRequired: false,
};
