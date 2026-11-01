import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, API_BASE } from './api';
import { localizeMedia } from './apiBase';
// The CSRF token is held in memory only (never localStorage). The session itself is an HTTP-only cookie the browser cannot read.
let csrf = '';
export const AREA_LABELS = { enquiries: 'Enquiries', projects: 'Projects', services: 'Services', testimonials: 'Testimonials', pricing: 'Pricing', blog: 'Blog', settings: 'Website settings' };
export async function adminApi(path, init = {}) {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...(method !== 'GET' && csrf ? { 'X-CSRF-Token': csrf } : {}) };
    return api(path, { ...init, headers });
}
export const adminGet = (path) => adminApi(path).then((r) => r.data);
export const adminSend = (method, path, body) => adminApi(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }).then((r) => r.data);
export function useAdmin() {
    const qc = useQueryClient();
    const q = useQuery({
        queryKey: ['admin-me'], retry: false, staleTime: 5 * 60_000,
        queryFn: async () => { try {
            const r = await api('/auth/me');
            csrf = r.data.csrfToken;
            return r.data.user;
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 401)
                return null;
            throw e;
        } },
    });
    return {
        user: q.data ?? null, isLoading: q.isLoading, isError: q.isError,
        async setup(b) {
            const r = await api('/auth/setup', { method: 'POST', body: JSON.stringify(b) });
            csrf = r.data.csrfToken;
            qc.setQueryData(['admin-me'], r.data.user);
        },
        async login(email, password) {
            const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            csrf = r.data.csrfToken;
            qc.setQueryData(['admin-me'], r.data.user);
        },
        async logout() {
            try {
                await adminApi('/auth/logout', { method: 'POST' });
            }
            finally {
                csrf = '';
                qc.setQueryData(['admin-me'], null);
                qc.removeQueries({ predicate: (x) => String(x.queryKey[0]).startsWith('admin') });
            }
        },
    };
}

// Sends photos or videos chosen from the admin's computer. Resolves with [{ url, name, kind }]. Progress is reported as 0..1.
export function adminUpload(kind, files, onProgress) {
    return new Promise((resolve, reject) => {
        const fd = new FormData();
        for (const f of files)
            fd.append('files', f);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/admin/uploads/${kind}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-CSRF-Token', csrf);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable)
            onProgress?.(e.loaded / e.total); };
        xhr.onload = () => {
            let body = null;
            try {
                body = JSON.parse(xhr.responseText);
            }
            catch { /* not JSON */ }
            if (xhr.status >= 200 && xhr.status < 300 && body?.data?.files)
                resolve(localizeMedia(body.data.files));
            else
                reject(new ApiError(xhr.status, body?.error?.message ?? 'Upload failed. Please try again.'));
        };
        xhr.onerror = () => reject(new ApiError(0, 'The upload was interrupted. Check your connection and try again.'));
        xhr.send(fd);
    });
}
