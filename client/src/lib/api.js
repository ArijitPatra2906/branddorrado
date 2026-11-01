import { API_BASE, canonicalizeMediaText, localizeMedia } from './apiBase';
const BASE = API_BASE;
export { API_BASE };
export class ApiError extends Error {
    status;
    fields;
    constructor(status, message, fields) {
        super(message);
        this.status = status;
        this.fields = fields;
    }
}
export async function api(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init, body: canonicalizeMediaText(init.body) });
    const body = localizeMedia(await res.json().catch(() => null));
    if (!res.ok)
        throw new ApiError(res.status, body?.error?.message ?? 'Request failed.', body?.error?.fields);
    return body;
}
