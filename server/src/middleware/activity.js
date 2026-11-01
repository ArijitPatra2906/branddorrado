import { logActivity } from '../lib/activity.js';
// Records every successful state-changing admin request (and every permission denial) after it completes.
// Logs the actor, the action, the record id and the names of changed fields. Values are never logged, except a short
// title/name label for content records (never for enquiries or team accounts' passwords).
const LABELLED = new Set(['services', 'projects', 'testimonials', 'pricing', 'blog']);
export const activityLogger = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method))
        return next();
    res.on('finish', () => {
        const denied = res.statusCode === 403;
        const ok = res.statusCode < 400;
        if ((!ok && !denied) || !req.admin)
            return;
        const [entity = 'admin', entityId, sub] = req.originalUrl.split('?')[0].replace(/^\/api\/admin\/?/, '').split('/');
        const verb = sub ? sub.replace(/-/g, ' ') : req.method === 'POST' ? 'created' : req.method === 'PATCH' ? 'updated' : req.method === 'DELETE' ? 'deleted' : req.method.toLowerCase();
        const body = (req.body && typeof req.body === 'object' ? req.body : {});
        const label = LABELLED.has(entity) ? [body.title, body.name, body.clientName].find((v) => typeof v === 'string') : undefined;
        const fields = req.method === 'PATCH' || req.method === 'POST' ? Object.keys(body).filter((k) => k !== 'password').slice(0, 12).join(', ') : '';
        const summary = denied ? `Blocked: ${req.method} ${entity} (no permission)`
            : `${verb} ${entity}${label ? ` “${label.slice(0, 80)}”` : ''}${fields && req.method === 'PATCH' ? ` (fields: ${fields})` : ''}`;
        void logActivity({ id: req.admin.userId, name: req.admin.name }, denied ? 'denied' : verb, entity, entityId ?? null, summary);
    });
    next();
};
