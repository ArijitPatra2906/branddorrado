import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { container } from '../components/Section';
import { EmptyState, ErrorState, Skeleton } from '../components/feedback/States';
import { usePageMeta } from '../components/seo/usePageMeta';
import { usePricing } from '../lib/queries';
import { enquiryLink } from '../lib/links';
import { formatPrice, PERIOD } from '../lib/format';
export default function Pricing() {
    usePageMeta('Pricing', 'Service packages from BrandDorrado.');
    const { data, isLoading, isError, refetch } = usePricing();
    return (<section className={`${container} py-16 lg:py-24`}>
      <p className="eyebrow">Pricing</p>
      <h1 className="mt-4">Packages built around your goals.</h1>
      <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
      <div className="mt-12">
        {isLoading && <div className="grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-96"/>)}</div>}
        {isError && <ErrorState onRetry={() => refetch()}/>}
        {data?.length === 0 && <EmptyState title="Packages are being finalised.">Tell us about your project and we will put together a custom quote.</EmptyState>}
        {data && data.length > 0 && (<ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (<li key={p.id} className={`flex flex-col rounded-card border p-7 ${p.featured ? 'border-gold bg-[#1b1710]' : 'border-gold/25 bg-[#161616]'}`}>
                {p.featured && <span className="mb-3 w-fit rounded-full bg-gold px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-obsidian">Featured</span>}
                <h2 className="!text-2xl">{p.name}</h2>
                {p.description && <p className="mt-2 text-sm text-cream/70">{p.description}</p>}
                <p className="mt-5 font-serif text-4xl text-gold">{p.customQuote ? 'Custom quote' : formatPrice(p.priceMinor, p.currency)}</p>
                {!p.customQuote && <p className="text-xs text-cream/60">{PERIOD[p.billingPeriod]}</p>}
                {p.deliverables.length > 0 && <ul className="mt-6 space-y-2.5 text-sm text-cream/85">{p.deliverables.map((d) => <li key={d} className="flex gap-3"><Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gold"/>{d}</li>)}</ul>}
                <dl className="mt-6 space-y-2 border-t border-gold/20 pt-5 text-xs text-cream/65">
                  {p.deliveryTimeline && <div><dt className="inline font-medium text-cream/85">Delivery: </dt><dd className="inline">{p.deliveryTimeline}</dd></div>}
                  {p.revisionTerms && <div><dt className="inline font-medium text-cream/85">Revisions: </dt><dd className="inline">{p.revisionTerms}</dd></div>}
                </dl>
                <Link to={enquiryLink({ package: p.slug })} className="btn-gold mt-7 w-full">{p.customQuote ? 'Request a quote' : `Choose ${p.name}`}</Link>
              </li>))}
          </ul>)}
      </div>
      <p className="mt-10 max-w-2xl text-xs text-cream/55">Advertising budgets, third-party costs and additional work are included only where a package explicitly says so.</p>
    </section>);
}
