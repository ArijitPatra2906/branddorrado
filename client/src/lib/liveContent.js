import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Keeps every open page in step with admin edits, without reloading.
//  1. In the same tab: any successful admin save refetches the public data (see main.jsx).
//  2. Other tabs on this computer: told straight away through a BroadcastChannel.
//  3. Other visitors and devices: a tiny request every few seconds (only while the tab is visible) asks the server
//     whether anything changed, and refetches when it did.
const isPublic = (q) => !String(q.queryKey[0]).startsWith('admin');
export const refreshPublicContent = (qc) => qc.invalidateQueries({ predicate: isPublic });

const CHANNEL = 'branddorrado-content';
export const announceContentChange = () => {
    try { const c = new BroadcastChannel(CHANNEL); c.postMessage('changed'); c.close(); } catch { /* not supported: polling still works */ }
};

export function useLiveContent(intervalMs = 10_000) {
    const qc = useQueryClient();
    const last = useRef(null);
    const { data } = useQuery({
        queryKey: ['admin-revision-poll'], // the 'admin' prefix keeps it out of refreshPublicContent
        queryFn: () => api('/revision').then((r) => r.data.revision),
        refetchInterval: intervalMs, refetchIntervalInBackground: false, staleTime: 0, retry: false, gcTime: 0,
    });
    useEffect(() => {
        if (!data) return;
        if (last.current && last.current !== data) refreshPublicContent(qc);
        last.current = data;
    }, [data, qc]);
    useEffect(() => {
        let c;
        try { c = new BroadcastChannel(CHANNEL); c.onmessage = () => refreshPublicContent(qc); } catch { /* ignore */ }
        return () => c?.close();
    }, [qc]);
}
