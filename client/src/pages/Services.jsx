import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { container } from '../components/Section';
import { EmptyState, ErrorState, Skeleton } from '../components/feedback/States';
import { usePageMeta } from '../components/seo/usePageMeta';
import { useServices } from '../lib/queries';
import { enquiryLink } from '../lib/links';
export default function Services() {
    usePageMeta('Services', 'Content creation, social media, brand design, websites and digital marketing from BrandDorrado.');
    const { data, isLoading, isError, refetch } = useServices();
    return (<section className={`${container} py-16 lg:py-24`}>
      <p className="eyebrow">What we do</p>
      <h1 className="mt-4">Complete Brand Growth Solutions.</h1>
      <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
      <p className="mt-6 max-w-xl text-cream/75">From content to strategy, we handle everything you need to build a powerful digital presence and turn your business into a brand.</p>
      <div className="mt-12">
        {isLoading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-64"/>)}</div>}
        {isError && <ErrorState onRetry={() => refetch()}/>}
        {data?.length === 0 && <EmptyState title="Services are being updated.">Please check back shortly, or get in touch directly.</EmptyState>}
        {data && data.length > 0 && (<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((s) => (<li key={s.id}>
                <Link to={`/services/${s.slug}`} className="group flex h-full flex-col rounded-card border border-gold/25 bg-[#161616] p-6 transition hover:border-gold">
                  {s.imageUrl && <img src={s.imageUrl} alt="" loading="lazy" className="mb-5 aspect-[16/10] w-full rounded-lg object-cover"/>}
                  <h2 className="!text-2xl">{s.title}</h2>
                  <p className="mt-3 flex-1 text-sm text-cream/70">{s.shortDescription}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm text-gold">{s.ctaLabel ?? 'Learn more'} <ArrowUpRight size={14} aria-hidden="true" className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></span>
                </Link>
              </li>))}
          </ul>)}
      </div>
      <div className="mt-12"><Link to={enquiryLink()} className="btn-gold">Start a Project</Link></div>
    </section>);
}
