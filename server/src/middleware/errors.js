import { ZodError } from 'zod';
import { env } from '../config/env.js';
export class HttpError extends Error {
    status;
    code;
    constructor(status, message, code = 'error') {
        super(message);
        this.status = status;
        this.code = code;
    }
}
export const notFound = (_req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Resource not found.' } });
// Never leaks stack traces, SQL or infrastructure detail to the browser.
export const errorHandler = (err, req, res, _next) => {
    if (err instanceof ZodError)
        return res.status(400).json({ error: { code: 'validation_error', message: 'Please check the highlighted fields.',
                fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } });
    if (err?.type === 'entity.parse.failed')
        return res.status(400).json({ error: { code: 'bad_json', message: 'The request could not be read.' } });
    if (err?.type === 'entity.too.large')
        return res.status(413).json({ error: { code: 'too_large', message: 'The request is too large.' } });
    if (err instanceof HttpError)
        return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    console.error(`[error] ${req.method} ${req.path}: ${err?.name ?? 'Error'}${env.isProd ? '' : ` ${err?.message}`}`);
    if (!env.isProd && err?.stack)
        console.error(err.stack);
    res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } });
};
