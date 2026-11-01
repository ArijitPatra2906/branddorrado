import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../lib/adminApi';
import { ErrorState, Skeleton } from '../../components/feedback/States';
import { formatDate } from '../../lib/format';
export const STATUS_LABEL = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal_sent: 'Proposal sent', won: 'Won', lost: 'Lost', archived: 'Archived' };
export default function Dashboard() {
    const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => adminGet('/admin/dashboard') });
    if (isLoading)
        return <Skeleton className="h-64"/>;
    if (isError || !data)
        return <ErrorState onRetry={() => refetch()}/>;
    const card = (label, value, to) => (<div className="rounded-card border border-gold/25 p-5"><p className="text-xs uppercase tracking-wider text-cream/60">{label}</p><p className="mt-2 font-serif text-4xl text-gold">{to ? <Link to={to}>{value}</Link> : value}</p></div>);
    return (<div>
      <h1 className="!text-4xl">Overview</h1>
      {data.enquiries.emailFailures > 0 && <p role="alert" className="mt-4 rounded-lg border border-red-500/60 p-4 text-sm text-red-200">{data.enquiries.emailFailures} enquiry email(s) failed to send. Open the enquiry and use “Retry emails”.</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {card('Total enquiries', data.enquiries.total, '/admin/enquiries')}{card('New enquiries', data.enquiries.byStatus.new ?? 0, '/admin/enquiries?status=new')}
        {card('Published projects', data.projects.published, '/admin/projects')}{card('Draft projects', data.projects.draft, '/admin/projects')}
        {card('Published services', data.services.published, '/admin/services')}{card('Published posts', data.blog.published, '/admin/blog')}
        {card('Draft posts', data.blog.draft, '/admin/blog')}{card('Published testimonials', data.testimonials.published, '/admin/testimonials')}
      </div>
      <h2 className="mt-10 !text-2xl">Enquiries by status</h2>
      {data.enquiries.total === 0 ? <p className="mt-3 text-sm text-cream/65">No enquiries yet. They will appear here as soon as the contact form is used.</p> :
            <ul className="mt-3 flex flex-wrap gap-3">{Object.entries(data.enquiries.byStatus).map(([s, n]) => <li key={s} className="rounded-full border border-gold/30 px-4 py-1.5 text-sm">{STATUS_LABEL[s] ?? s}: <strong>{n}</strong></li>)}</ul>}
      <h2 className="mt-10 !text-2xl">Recent activity</h2>
      {data.recentEnquiries.length === 0 ? <p className="mt-3 text-sm text-cream/65">Nothing yet.</p> :
            <ul className="mt-3 divide-y divide-gold/15 rounded-card border border-gold/25">{data.recentEnquiries.map((e) => (<li key={e.id}><Link to={`/admin/enquiries/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-gold/5">
            <span><strong>{e.fullName}</strong> <span className="text-cream/60">· {e.serviceLabel ?? 'Service'} · {e.reference}</span></span>
            <span className="text-xs text-cream/60">{STATUS_LABEL[e.status]} · {formatDate(e.createdAt)}</span></Link></li>))}</ul>}
    </div>);
}
