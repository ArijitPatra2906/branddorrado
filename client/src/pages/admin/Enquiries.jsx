import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Mail } from 'lucide-react';
import { adminApi as rawApi, adminGet, adminSend } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/Toast';
import { ErrorState, Skeleton } from '../../components/feedback/States';
import { Pagination } from '../../components/Pagination';
import { formatDate } from '../../lib/format';
import { STATUS_LABEL } from './Dashboard';
import { API_BASE as API } from '../../lib/api';
export function EnquiryList() {
    const [sp, setSp] = useSearchParams();
    const qs = new URLSearchParams(sp);
    if (!qs.get('page'))
        qs.set('page', '1');
    const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin-enquiries', qs.toString()], queryFn: () => adminApi(qs), placeholderData: (p) => p });
    const [q, setQ] = useState(sp.get('q') ?? '');
    const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); n.delete('page'); setSp(n, { replace: true }); };
    const exportQs = new URLSearchParams(sp);
    exportQs.delete('page');
    return (<div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="!text-4xl">Enquiries</h1>
        <a className="btn-outline !py-2" href={`${API}/admin/enquiries/export.csv?${exportQs}`}><Download size={14} aria-hidden="true"/>Export CSV</a></div>
      <form role="search" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }}>
        <div className="lg:col-span-2"><label className="label" htmlFor="eq">Search</label><input id="eq" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, business or reference"/></div>
        <div><label className="label" htmlFor="es">Status</label><select id="es" className="field" value={sp.get('status') ?? ''} onChange={(e) => set('status', e.target.value)}><option value="">All</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="ef">From</label><input id="ef" type="date" className="field" value={sp.get('from') ?? ''} onChange={(e) => set('from', e.target.value)}/></div>
        <div><label className="label" htmlFor="et">To</label><input id="et" type="date" className="field" value={sp.get('to') ?? ''} onChange={(e) => set('to', e.target.value)}/></div>
        <div><label className="label" htmlFor="esv">Service</label><input id="esv" className="field" value={sp.get('service') ?? ''} onChange={(e) => set('service', e.target.value)} placeholder="Exact service name"/></div>
        <div><label className="label" htmlFor="eb">Budget</label><input id="eb" className="field" value={sp.get('budget') ?? ''} onChange={(e) => set('budget', e.target.value)} placeholder="Exact budget option"/></div>
        <div className="flex items-end"><button type="submit" className="btn-gold !py-2.5">Search</button></div>
      </form>
      <div className="mt-6">
        {isLoading && <Skeleton className="h-64"/>}{isError && <ErrorState onRetry={() => refetch()}/>}
        {data && data.data.length === 0 && <p className="rounded-card border border-gold/30 p-8 text-center text-cream/70">No enquiries match.</p>}
        {data && data.data.length > 0 && (<div className="overflow-x-auto rounded-card border border-gold/25"><table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-gold/10 text-xs uppercase tracking-wider text-cream/70"><tr><th className="p-3">Reference</th><th className="p-3">Name</th><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Email</th><th className="p-3">Received</th></tr></thead>
            <tbody>{data.data.map((r) => (<tr key={r.id} className="border-t border-gold/15 hover:bg-gold/5">
                <td className="p-3"><Link className="text-gold underline-offset-4 hover:underline" to={`/admin/enquiries/${r.id}`}>{r.reference}</Link></td>
                <td className="p-3">{r.fullName}{r.businessName && <span className="block text-xs text-cream/55">{r.businessName}</span>}</td>
                <td className="p-3">{r.serviceLabel}</td><td className="p-3">{STATUS_LABEL[r.status]}</td>
                <td className="p-3">{r.notifyStatus === 'failed' || r.ackStatus === 'failed' ? <span className="text-red-300">Failed</span> : r.notifyStatus === 'sent' ? 'Sent' : 'Pending'}</td>
                <td className="p-3 whitespace-nowrap">{formatDate(r.createdAt)}</td></tr>))}</tbody></table></div>)}
        {data && <Pagination {...data.meta} onChange={(p) => { const n = new URLSearchParams(sp); n.set('page', String(p)); setSp(n); }}/>}
      </div>
    </div>);
}
const adminApi = (qs) => rawApi(`/admin/enquiries?${qs}`);
export function EnquiryDetail() {
    const { id = '' } = useParams();
    const qc = useQueryClient();
    const toast = useToast();
    const nav = useNavigate();
    const key = ['admin-enquiry', id];
    const { data: e, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: () => adminGet(`/admin/enquiries/${id}`), retry: false });
    const [note, setNote] = useState('');
    const [confirm, setConfirm] = useState(false);
    const fail = (x) => toast('err', x instanceof ApiError ? x.message : 'Something went wrong.');
    const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['admin-enquiries'] }); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); };
    const patch = useMutation({ mutationFn: (b) => adminSend('PATCH', `/admin/enquiries/${id}`, b), onSuccess: () => { toast('ok', 'Saved.'); refresh(); }, onError: fail });
    const addNote = useMutation({ mutationFn: () => adminSend('POST', `/admin/enquiries/${id}/notes`, { body: note }), onSuccess: () => { setNote(''); toast('ok', 'Note added.'); refresh(); }, onError: fail });
    const retry = useMutation({ mutationFn: () => adminSend('POST', `/admin/enquiries/${id}/retry-email`), onSuccess: (r) => { toast(r.notifyStatus === 'sent' ? 'ok' : 'err', r.notifyStatus === 'sent' ? 'Emails sent.' : 'Emails still failing. Check Resend configuration.'); refresh(); }, onError: fail });
    const del = useMutation({ mutationFn: () => adminSend('DELETE', `/admin/enquiries/${id}`), onSuccess: () => { toast('ok', 'Enquiry deleted.'); refresh(); nav('/admin/enquiries'); }, onError: fail });
    if (isLoading)
        return <Skeleton className="h-96"/>;
    if (error || !e)
        return error instanceof ApiError && error.status === 404 ? <p>Enquiry not found. <Link className="text-gold" to="/admin/enquiries">Back to list</Link></p> : <ErrorState onRetry={() => refetch()}/>;
    const row = (l, v) => v ? <div><dt className="text-xs uppercase tracking-wider text-cream/55">{l}</dt><dd className="mt-0.5 break-words">{v}</dd></div> : null;
    return (<div>
      <Link to="/admin/enquiries" className="text-sm text-gold">← All enquiries</Link>
      <h1 className="mt-3 !text-4xl">{e.fullName}</h1><p className="text-sm text-cream/60">{e.reference} · received {formatDate(e.createdAt)}</p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <dl className="grid gap-4 rounded-card border border-gold/25 p-6 sm:grid-cols-2">
            {row('Email', e.email)}{row('Phone / WhatsApp', e.phone)}{row('Business', e.businessName)}{row('Website / social', e.websiteUrl)}
            {row('Service', e.serviceLabel)}{row('Budget', e.budgetRange)}{row('Timeline', e.timeline)}{row('Preferred contact', e.contactMethod)}{row('Heard about us via', e.referralSource)}
            {row('Consent', e.consentAt ? `${formatDate(e.consentAt)} (${e.consentVersion})` : null)}
          </dl>
          <div className="rounded-card border border-gold/25 p-6"><h2 className="!text-xl">Project description</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm text-cream/85">{e.description || <span className="text-cream/50">No description provided.</span>}</p></div>
          <a className="btn-gold" href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: your BrandDorrado enquiry ${e.reference}`)}`}><Mail size={14} aria-hidden="true"/>Email customer</a>
        </div>
        <div className="space-y-6">
          <div className="rounded-card border border-gold/25 p-6">
            <label className="label" htmlFor="st">Status</label>
            <select id="st" className="field" value={e.status} disabled={patch.isPending} onChange={(x) => patch.mutate({ status: x.target.value })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <label className="label mt-4" htmlFor="fu">Follow-up date</label>
            <input id="fu" type="date" className="field" defaultValue={e.followUpOn?.slice(0, 10) ?? ''} onBlur={(x) => x.target.value !== (e.followUpOn?.slice(0, 10) ?? '') && patch.mutate({ followUpOn: x.target.value || null })}/>
          </div>
          <div className="rounded-card border border-gold/25 p-6">
            <h2 className="!text-xl">Internal notes</h2><p className="text-xs text-cream/55">Private. Never shown to customers or the public.</p>
            <label className="sr-only" htmlFor="note">New note</label><textarea id="note" rows={3} maxLength={4000} className="field mt-3" value={note} onChange={(x) => setNote(x.target.value)}/>
            <button type="button" className="btn-gold mt-3 !py-2 disabled:opacity-60" disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()}>Add note</button>
            <ul className="mt-4 space-y-3 text-sm">{e.notes.map((n) => <li key={n.id} className="border-t border-gold/15 pt-3"><p className="whitespace-pre-wrap break-words">{n.body}</p><p className="mt-1 text-xs text-cream/50">{n.author ?? 'Team'} · {formatDate(n.createdAt)}</p></li>)}</ul>
          </div>
          <div className="rounded-card border border-gold/25 p-6">
            <h2 className="!text-xl">Email delivery</h2>
            <p className="mt-2 text-sm">Agency notification: <strong>{e.notifyStatus}</strong> · Customer acknowledgement: <strong>{e.ackStatus}</strong></p>
            <ul className="mt-2 space-y-1 text-xs text-cream/60">{e.emailAttempts.map((a, i) => <li key={i}>{formatDate(a.createdAt)} · {a.kind.replace('_', ' ')} · {a.status}{a.errorCode ? ` (${a.errorCode})` : ''}</li>)}</ul>
            {(e.notifyStatus !== 'sent' || (e.ackStatus !== 'sent' && e.ackStatus !== 'skipped')) && <button type="button" className="btn-outline mt-4 !py-2" disabled={retry.isPending} onClick={() => retry.mutate()}>{retry.isPending ? 'Retrying…' : 'Retry emails'}</button>}
          </div>
          {<button type="button" className="text-sm text-red-300 underline underline-offset-4" onClick={() => setConfirm(true)}>Delete this enquiry permanently</button>}
        </div>
      </div>
      <ConfirmDialog open={confirm} title="Delete enquiry?" message="This permanently removes the enquiry and its notes. Consider archiving instead." onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); del.mutate(); }}/>
    </div>);
}
