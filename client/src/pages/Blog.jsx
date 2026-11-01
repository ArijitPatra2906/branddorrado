import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { container } from '../components/Section';
import { EmptyState, ErrorState, Skeleton } from '../components/feedback/States';
import { Pagination } from '../components/Pagination';
import { BlogCard } from '../components/blog/BlogCard';
import { BlogCategorySections } from '../components/blog/BlogCategorySections';
import { usePageMeta } from '../components/seo/usePageMeta';
import { useBlog, useBlogCategories } from '../lib/queries';
// Same structure as the "Our Work" page: heading, category chips, search, per-category sections, and a filtered grid with pagination.
export default function Blog() {
    usePageMeta('Our Blog', 'Articles and updates from BrandDorrado.');
    const [sp, setSp] = useSearchParams();
    const category = sp.get('category') ?? '';
    const q = sp.get('q') ?? '';
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const [draft, setDraft] = useState(q);
    const { data, isLoading, isError, refetch, isFetching } = useBlog({ category: category || undefined, q: q || undefined, page });
    const { data: cats } = useBlogCategories();
    const update = (next) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(next))
        v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); };
    const chip = (active) => `rounded-full border px-4 py-2 text-sm transition ${active ? 'border-gold bg-gold text-obsidian' : 'border-gold/40 hover:border-gold'}`;
    return (<section className={`${container} py-16 lg:py-24`}>
      <p className="eyebrow">Our blog</p>
      <h1 className="mt-4">Ideas for Growing Brands.</h1>
      <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
      <p className="mt-6 max-w-xl text-cream/75">Practical thinking on branding, content and digital growth from the BrandDorrado team.</p>

      <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!category} className={chip(!category)} onClick={() => update({ category: '', page: '' })}>All</button>
          {cats?.map((c) => <button key={c} type="button" aria-pressed={category === c} className={chip(category === c)} onClick={() => update({ category: c, page: '' })}>{c}</button>)}
        </div>
        <form role="search" onSubmit={(e) => { e.preventDefault(); update({ q: draft.trim(), page: '' }); }} className="flex gap-2">
          <label className="sr-only" htmlFor="blog-search">Search articles</label>
          <input id="blog-search" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} placeholder="Search articles" className="w-full rounded-full border border-gold/40 bg-transparent px-5 py-2.5 text-sm placeholder:text-cream/45 lg:w-64"/>
          <button type="submit" className="btn-outline !px-4" aria-label="Search"><Search size={16} aria-hidden="true"/></button>
        </form>
      </div>

      {!category && !q ? (<div className="mt-12"><BlogCategorySections perCategory={6} HeadingLevel="h2"/></div>) : (
      <div className="mt-10" aria-busy={isFetching}>
        {isLoading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/5]"/>)}</div>}
        {isError && <ErrorState onRetry={() => refetch()}/>}
        {data && data.data.length === 0 && <EmptyState title={category || q ? 'No articles match your filters.' : 'Articles are on their way.'}>{category || q ? 'Try a different category or search term.' : 'New articles will appear here once they are published.'}</EmptyState>}
        {data && data.data.length > 0 && <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.data.map((a) => <li key={a.id}><BlogCard a={a}/></li>)}</ul>}
        {data && <Pagination {...data.meta} onChange={(p) => { update({ page: p > 1 ? String(p) : '' }); window.scrollTo({ top: 0 }); }}/>}
      </div>)}
    </section>);
}
