import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { container } from '../components/Section';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Markdown } from '../components/Markdown';
import { ErrorState, Skeleton } from '../components/feedback/States';
import { breadcrumbJsonLd, usePageMeta } from '../components/seo/usePageMeta';
import { useProjectDetail } from '../lib/queries';
import { ApiError } from '../lib/api';
import { parseShowreel, enquiryLink } from '../lib/links';
import { formatDate } from '../lib/format';
import NotFound from './NotFound';
export default function WorkDetail() {
    const { slug = '' } = useParams();
    const { data: p, isLoading, error, refetch } = useProjectDetail(slug);
    usePageMeta(p?.seoTitle || p?.title || 'Project', p?.seoDescription || p?.shortDescription, { image: p?.coverImageUrl, jsonLd: p ? [
        breadcrumbJsonLd([{ label: 'Home', to: '/' }, { label: 'Work', to: '/work' }, { label: p.title }]),
        { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.seoDescription || p.shortDescription, ...(p.coverImageUrl ? { image: p.coverImageUrl } : {}) },
    ] : undefined });
    if (error instanceof ApiError && error.status === 404)
        return <NotFound />;
    const video = parseShowreel(p?.videoUrl ?? undefined);
    const ext = p?.externalUrl && /^https:\/\//i.test(p.externalUrl) ? p.externalUrl : null;
    return (<article className={`${container} py-16 lg:py-24`}>
      {isLoading && <Skeleton className="h-96"/>}
      {error && !(error instanceof ApiError && error.status === 404) && <ErrorState onRetry={() => refetch()}/>}
      {p && (<>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Work', to: '/work' }, { label: p.title }]}/>
        <p className="eyebrow">{p.industry}{p.projectType ? ` — ${p.projectType}` : ''}</p>
        <h1 className="mt-4 max-w-3xl">{p.title}</h1>
        <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
        {p.isDemo && <p className="mt-4 inline-block rounded-full border border-gold/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">Sample project</p>}
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          {p.clientName && <div><dt className="text-cream/55">Client</dt><dd>{p.clientName}</dd></div>}
          {p.completedOn && <div><dt className="text-cream/55">Completed</dt><dd>{formatDate(p.completedOn)}</dd></div>}
          {p.services.length > 0 && <div><dt className="text-cream/55">Services</dt><dd>{p.services.map((s, i) => <span key={s.slug}>{i > 0 && ', '}<Link to={`/services/${s.slug}`} className="hover:text-gold">{s.title}</Link></span>)}</dd></div>}
        </dl>
        {p.coverImageUrl && <img src={p.coverImageUrl} alt="" className="mt-10 aspect-[16/9] w-full rounded-card border border-gold/25 object-cover"/>}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div><p className="text-lg text-cream/85">{p.shortDescription}</p>{p.caseStudy && <Markdown source={p.caseStudy} className="mt-4 text-cream/80"/>}</div>
          {p.results.length > 0 && (<aside aria-label="Verified results" className="h-fit rounded-card border border-gold/30 p-6">
              <h2 className="!text-xl">Results</h2>
              <dl className="mt-4 space-y-4">{p.results.map((r) => <div key={r.label}><dd className="font-serif text-3xl text-gold">{r.value}</dd><dt className="text-sm text-cream/65">{r.label}</dt></div>)}</dl>
            </aside>)}
        </div>
        {video && <div className="mt-12 aspect-video overflow-hidden rounded-card border border-gold/25">{video.kind === 'iframe'
                    ? <iframe src={video.src.replace('autoplay=1', 'autoplay=0')} title={`${p.title} video`} className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy"/>
                    : <video src={video.src} poster={p.coverImageUrl ?? undefined} controls preload="metadata" className="h-full w-full"/>}</div>}
        {p.gallery.length > 0 && <ul className="mt-12 grid gap-4 sm:grid-cols-2">{p.gallery.map((g) => <li key={g.url}><img src={g.url} alt={g.alt} loading="lazy" className="w-full rounded-card border border-gold/20 object-cover"/></li>)}</ul>}
        <div className="mt-12 flex flex-wrap gap-4">
          <Link to={enquiryLink()} className="btn-gold">Start a Project</Link>
          {ext && <a href={ext} target="_blank" rel="noopener noreferrer" className="btn-outline">Visit project <ExternalLink size={14} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>}
        </div>
      </>)}
    </article>);
}
