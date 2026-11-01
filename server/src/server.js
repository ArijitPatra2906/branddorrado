import { env } from './config/env.js';
import { createApp } from './app.js';
import { retryUnsentEmails } from './services/enquiries.js';
const server = createApp().listen(env.PORT, () => console.log(`API listening on :${env.PORT} (${env.NODE_ENV})`));
// Connection settings for running behind a load balancer / proxy: keep idle connections open a little longer than the proxy does,
// and allow big uploads on slow connections (15 minutes) while still cutting off stalled clients.
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;
server.requestTimeout = 15 * 60 * 1000;
// Finish in-flight requests on shutdown (deploys, restarts), then exit. Force-exit if something hangs.
let stopping = false;
function stop(code = 0) {
    if (stopping)
        return;
    stopping = true;
    console.log('Shutting down…');
    setTimeout(() => process.exit(code || 1), 10000).unref();
    server.close(() => process.exit(code));
    server.closeIdleConnections?.();
}
for (const sig of ['SIGINT', 'SIGTERM'])
    process.on(sig, () => stop(0));
// A failed background promise must not take the whole site down; a truly unknown error exits so the host restarts a clean process.
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', env.isProd ? err?.name : err));
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', env.isProd ? err?.name : err); stop(1); });
// Recovery sweep: retries emails that failed or were interrupted (e.g. a restart right after a save).
const sweep = setInterval(() => { retryUnsentEmails().catch(() => console.error('[email] retry sweep failed')); }, 5 * 60 * 1000);
sweep.unref();
