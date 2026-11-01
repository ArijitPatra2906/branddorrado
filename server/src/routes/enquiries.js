import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { enquirySchema } from '../validators/enquiry.js';
import { enquiryOptions } from '../lib/enquiryOptions.js';
import { createEnquiry, processEmails } from '../services/enquiries.js';
export const enquiryRouter = Router();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Too many submissions. Please wait a few minutes and try again.' } }),
});
enquiryRouter.get('/enquiry-options', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.json({ data: enquiryOptions });
});
// POST /api/enquiries (and the /api/contact alias). Success is only reported after the enquiry is saved.
const submit = async (req, res, next) => {
    try {
        const input = enquirySchema.parse(req.body);
        if (input.companyWebsite)
            return res.status(201).json({ data: { reference: null } }); // bot: pretend, store nothing
        const result = await createEnquiry(input);
        res.status(201).json({ data: { reference: result.reference } });
        // After the response: emails never delay or fail the request (the enquiry is already saved).
        if (!result.duplicate && result.id)
            void processEmails(result.id);
    }
    catch (err) {
        next(err);
    }
};
enquiryRouter.post('/enquiries', limiter, submit);
enquiryRouter.post('/contact', limiter, submit);
