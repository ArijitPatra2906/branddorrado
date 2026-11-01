// Where the API lives. VITE_API_BASE_URL usually says http://localhost:4000/api, which is right on the computer running the server
// but wrong on a phone or another computer that opens the site by its network address (http://192.168.x.x:5173): there,
// "localhost" means that device itself. So when the configured address is a local one and the page was opened from a different
// host, the page's own host is used instead (same port). Deployed sites are never affected.
const configured = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/;
const pageHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

function resolve() {
    try {
        const u = new URL(configured);
        if (LOCAL.test(u.hostname) && !LOCAL.test(pageHost)) {
            u.hostname = pageHost;
            return { base: u.toString().replace(/\/$/, ''), onLan: true, configuredOrigin: new URL(configured).origin };
        }
    }
    catch { /* fall through */ }
    return { base: configured, onLan: false, configuredOrigin: '' };
}
const r = resolve();
export const API_BASE = r.base;
const API_ORIGIN = new URL(r.base, 'http://localhost').origin;
const LOCAL_MEDIA = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/media\//;

// Uploaded files are saved with the address the server knew itself by (http://localhost:4000/media/...). On another device
// that address does not work, so links coming from the API are pointed at the address this page uses for the API...
export function localizeMedia(value) {
    if (!r.onLan)
        return value;
    if (typeof value === 'string')
        return LOCAL_MEDIA.test(value) ? value.replace(LOCAL_MEDIA, `${API_ORIGIN}/media/`) : value;
    if (Array.isArray(value))
        return value.map(localizeMedia);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localizeMedia(v)]));
    return value;
}
// ...and links sent back to the API are turned back, so the database keeps the same address whichever device saved the edit.
export function canonicalizeMediaText(text) {
    return r.onLan && typeof text === 'string' ? text.split(`${API_ORIGIN}/media/`).join(`${r.configuredOrigin}/media/`) : text;
}
