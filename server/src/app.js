import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { contentRouter } from './routes/content.js';
import { enquiryRouter } from './routes/enquiries.js';
import { catalogRouter } from './routes/catalog.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { seoRouter } from './routes/seo.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { mediaRouter } from './routes/media.js';
import { requestLogger } from './middleware/requestLogger.js';
export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(requestLogger);
    app.use(helmet());
    app.use(cors({ origin(origin, cb) { cb(null, env.isOriginAllowed(origin)); }, credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
    app.use(compression());
    app.use(express.json({ limit: '50kb' }));
    // Uploaded photos and videos, read from the Turso database. Cross-origin embedding is allowed because the website is served from a different address than this API.
    app.use('/media', mediaRouter);
    app.use('/api/health', healthRouter);
    // Overall protection against a single address flooding the API (shared office / mobile-carrier addresses stay well under this).
    // Set API_RATE_LIMIT to change the number of requests allowed per minute per address.
    app.use('/api', rateLimit({
        windowMs: 60 * 1000, limit: Number(process.env.API_RATE_LIMIT) || 600, standardHeaders: 'draft-7', legacyHeaders: false,
        handler: (_req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests. Please slow down and try again in a moment.' } }),
    }));
    app.use(seoRouter);
    app.use('/api', contentRouter);
    app.use('/api', catalogRouter);
    app.use('/api', enquiryRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api', notFound);
    app.use(errorHandler);
    return app;
}
