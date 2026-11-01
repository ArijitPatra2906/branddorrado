import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminApi } from '../../lib/adminApi';
import { ErrorState, Skeleton } from '../../components/feedback/States';
import { Pagination } from '../../components/Pagination';
const ENTITIES = ['auth', 'enquiries', 'projects', 'services', 'testimonials', 'pricing', 'blog', 'settings', 'team'];
const when = (iso) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export default function Activity() {
    const [userId, setUserId] = useState('');
    const [entity, setEntity] = useState('');
    const [page, setPage] = useState(1);
    const qs = new URLSearchParams({ page: String(page), limit: '50' });
    if (userId)
        qs.set('userId', userId);
    if (entity)
        qs.set('entity', entity);
    const { data: team } = useQuery({ queryKey: ['admin-team'], queryFn: () => adminGet('/admin/team') });
    const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin-activity', qs.toString()], placeholderData: (p) => p,
        queryFn: () => adminApi(`/admin/activity?${qs}`) });
    return (<div>
      <h1 className="!text-4xl">Activity</h1>
      <p className="mt-2 text-sm text-cream/65">Every change made by every admin, newest first. Only field names and record titles are stored, never passwords or customer details.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <div><label className="label" htmlFor="au">Admin</label><select id="au" className="field" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}><option value="">Everyone</option>{team?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        <div><label className="label" htmlFor="ae">Area</label><select id="ae" className="field" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}><option value="">All</option>{ENTITIES.map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
      <div className="mt-6">
        {isLoading && <Skeleton className="h-64"/>}{isError && <ErrorState onRetry={() => refetch()}/>}
        {data && data.data.length === 0 && <p className="rounded-card border border-gold/30 p-8 text-center text-cream/70">No activity recorded yet.</p>}
        {data && data.data.length > 0 && (<div className="overflow-x-auto rounded-card border border-gold/25"><table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-gold/10 text-xs uppercase tracking-wider text-cream/70"><tr><th className="p-3">When</th><th className="p-3">Admin</th><th className="p-3">Action</th></tr></thead>
            <tbody>{data.data.map((r) => <tr key={r.id} className={`border-t border-gold/15 ${r.action === 'denied' ? 'bg-red-900/10' : ''}`}><td className="whitespace-nowrap p-3 text-cream/70">{when(r.createdAt)}</td><td className="p-3">{r.userName}</td><td className="p-3">{r.summary}</td></tr>)}</tbody></table></div>)}
        {data && <Pagination {...data.meta} onChange={setPage}/>}
      </div>
    </div>);
}
