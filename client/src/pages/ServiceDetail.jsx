import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { container } from '../components/Section';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Markdown } from '../components/Markdown';
import { ErrorState, Skeleton } from '../components/feedback/States';
import { breadcrumbJsonLd, usePageMeta } from '../components/seo/usePageMeta';
import { useServiceDetail } from '../lib/queries';
import { ApiError } from '../lib/api';
import { enquiryLink } from '../lib/links';
import NotFound from './NotFound';
export default function ServiceDetail() {
    const { slug = '' } = useParams();
    const { data: s, isLoading, error, refetch } = useServiceDetail(slug);
    usePageMeta(s?.seoTitle || s?.title || 'Service', s?.seoDescription || s?.shortDescription, { image: s?.imageUrl, jsonLd: s ? [
        breadcrumbJsonLd([{ label: 'Home', to: '/' }, { label: 'Services', to: '/services' }, { label: s.title }]),
        { '@context': 'https://schema.org', '@type': 'Service', name: s.title, description: s.seoDescription || s.shortDescription, provider: { '@type': 'Organization', name: 'BrandDorrado' }, ...(s.imageUrl ? { image: s.imageUrl } : {}) },
    ] : undefined });
    if (error instanceof ApiError && error.status === 404)
        return <NotFound />;
    return (<article className={`${container} py-16 lg:py-24`}>
      {isLoading && <Skeleton className="h-80"/>}
      {error && !(error instanceof ApiError && error.status === 404) && <ErrorState onRetry={() => refetch()}/>}
      {s && (<>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Services', to: '/services' }, { label: s.title }]}/>
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">Service</p>
            <h1 className="mt-4">{s.title}</h1>
            <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
            <p className="mt-6 max-w-xl text-lg text-cream/80">{s.shortDescription}</p>
            {s.detailedDescription && <Markdown source={s.detailedDescription} className="mt-6 max-w-2xl text-cream/80"/>}
            <Link to={enquiryLink({ service: s.slug })} className="btn-gold mt-8">{s.ctaLabel ?? 'Enquire about this service'}</Link>
          </div>
          <div className="space-y-8">
            {s.imageUrl && <img src={s.imageUrl} alt="" className="aspect-[4/3] w-full rounded-card border border-gold/25 object-cover"/>}
            {s.benefits.length > 0 && <List title="Benefits" items={s.benefits}/>}
            {s.deliverables.length > 0 && <List title="What you get" items={s.deliverables}/>}
          </div>
        </div>
      </>)}
    </article>);
}
const List = ({ title, items }) => (<div className="rounded-card border border-gold/25 p-6">
    <h2 className="!text-xl">{title}</h2>
    <ul className="mt-4 space-y-2.5 text-sm text-cream/80">{items.map((i) => <li key={i} className="flex gap-3"><Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gold"/>{i}</li>)}</ul>
  </div>);
