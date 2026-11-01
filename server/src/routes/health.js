import { Router } from 'express';
import { pingDb } from '../db/client.js';
export const healthRouter = Router();
healthRouter.get('/', async (_req, res) => {
    try {
        await pingDb();
        res.json({ status: 'ok', db: 'up' });
    }
    catch {
        res.status(503).json({ status: 'degraded', db: 'down' });
    }
});
