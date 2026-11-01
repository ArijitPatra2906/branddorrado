import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { container } from '../components/Section';
import { EmptyState, ErrorState, Skeleton } from '../components/feedback/States';
import { Pagination } from '../components/Pagination';
import { ProjectCard } from '../components/portfolio/ProjectCard';
import { usePageMeta } from '../components/seo/usePageMeta';
import { CategorySections } from '../components/portfolio/CategorySections';
import { useIndustries, useWork } from '../lib/queries';
export default function WorkList() {
    usePageMeta('Our Work', 'Selected brand, content and digital projects from BrandDorrado.');
    const [sp, setSp] = useSearchParams();
    const industry = sp.get('industry') ?? '';
    const q = sp.get('q') ?? '';
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const [draft, setDraft] = useState(q);
    const { data, isLoading, isError, refetch, isFetching } = useWork({ industry: industry || undefined, q: q || undefined, page });
    const { data: industries } = useIndustries();
    const update = (next) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(next))
        v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); };
    const chip = (active) => `rounded-full border px-4 py-2 text-sm transition ${active ? 'border-gold bg-gold text-obsidian' : 'border-gold/40 hover:border-gold'}`;
    return (<section className={`${container} py-16 lg:py-24`}>
      <p className="eyebrow">Our work</p>
      <h1 className="mt-4">Real Brands. Real Results.</h1>
      <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
      <p className="mt-6 max-w-xl text-cream/75">From local businesses to growing brands, we create content and strategies that bring real impact.</p>

      <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!industry} className={chip(!industry)} onClick={() => update({ industry: '', page: '' })}>All</button>
          {industries?.map((i) => <button key={i} type="button" aria-pressed={industry === i} className={chip(industry === i)} onClick={() => update({ industry: i, page: '' })}>{i}</button>)}
        </div>
        <form role="search" onSubmit={(e) => { e.preventDefault(); update({ q: draft.trim(), page: '' }); }} className="flex gap-2">
          <label className="sr-only" htmlFor="work-search">Search projects</label>
          <input id="work-search" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} placeholder="Search projects" className="w-full rounded-full border border-gold/40 bg-transparent px-5 py-2.5 text-sm placeholder:text-cream/45 lg:w-64"/>
          <button type="submit" className="btn-outline !px-4" aria-label="Search"><Search size={16} aria-hidden="true"/></button>
        </form>
      </div>

      {!industry && !q ? (<div className="mt-12"><CategorySections perCategory={6} HeadingLevel="h2"/></div>) : (
      <div className="mt-10" aria-busy={isFetching}>
        {isLoading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/5]"/>)}</div>}
        {isError && <ErrorState onRetry={() => refetch()}/>}
        {data && data.data.length === 0 && <EmptyState title={industry || q ? 'No projects match your filters.' : 'Selected work is on its way.'}>{industry || q ? 'Try a different category or search term.' : 'Approved case studies will appear here once they are published.'}</EmptyState>}
        {data && data.data.length > 0 && <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.data.map((p) => <li key={p.id}><ProjectCard p={p}/></li>)}</ul>}
        {data && <Pagination {...data.meta} onChange={(p) => { update({ page: p > 1 ? String(p) : '' }); window.scrollTo({ top: 0 }); }}/>}
      </div>)}
    </section>);
}
