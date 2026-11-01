import { findSession, readCookie, SESSION_COOKIE } from '../lib/auth.js';
import { effectivePermissions } from '../lib/permissions.js';
import { env } from '../config/env.js';
import { HttpError } from './errors.js';
// Server-side check on every protected route: a valid, unexpired, unrevoked session for an active user.
// Role and permissions are re-read from the database on every request, so a change by the super admin applies immediately.
export const requireAuth = async (req, _res, next) => {
    try {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        const s = token ? await findSession(token) : null;
        if (!token || !s)
            throw new HttpError(401, 'Please sign in.', 'unauthenticated');
        req.sessionToken = token;
        req.admin = s;
        next();
    }
    catch (e) {
        next(e);
    }
};
// CSRF: cookie auth + (a) strict Origin allowlist on state-changing requests + (b) per-session token header.
export const requireCsrf = (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method))
        return next();
    const origin = req.headers.origin;
    if (origin && !env.isOriginAllowed(origin))
        return next(new HttpError(403, 'Request blocked.', 'bad_origin'));
    if (!req.admin || req.headers['x-csrf-token'] !== req.admin.csrfToken)
        return next(new HttpError(403, 'Request blocked.', 'bad_csrf'));
    next();
};
export const requireSuper = (req, _res, next) => req.admin?.role === 'super_admin' ? next() : next(new HttpError(403, 'Only the super admin can do that.', 'forbidden'));
export const requirePermission = (area) => (req, _res, next) => req.admin && effectivePermissions(req.admin.role, req.admin.permissions).includes(area)
    ? next() : next(new HttpError(403, 'You have not been given access to this area.', 'forbidden'));
