import { env } from '../config/env.js';
// Prints one line per API request to the terminal, e.g.  14:02:11  POST  /api/admin/uploads/image  201  842 ms  admin
// Never prints request bodies, headers, cookies, tokens or passwords. Shown while developing/testing; LOG_REQUESTS=false turns it off (use this for load tests), and in production LOG_REQUESTS=true turns it on.
const on = process.env.LOG_REQUESTS === 'true' || (!env.isProd && process.env.LOG_REQUESTS !== 'false');
const tty = process.stdout.isTTY;
const paint = (code, text) => (tty ? `\x1b[${code}m${text}\x1b[0m` : text);
const colour = (status) => (status >= 500 ? 31 : status >= 400 ? 33 : status >= 300 ? 36 : 32);
export function requestLogger(req, res, next) {
    if (!on)
        return next();
    const started = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        const url = env.isProd ? req.originalUrl.split('?')[0] : req.originalUrl; // keep query strings out of production logs
        const who = req.admin ? ` ${paint(90, `admin:${req.admin.name ?? req.admin.userId}`)}` : '';
        console.log(`${paint(90, new Date().toTimeString().slice(0, 8))}  ${req.method.padEnd(6)} ${url}  ${paint(colour(res.statusCode), String(res.statusCode))}  ${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms${who}`);
    });
    next();
}
