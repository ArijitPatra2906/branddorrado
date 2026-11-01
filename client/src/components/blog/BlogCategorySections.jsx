import { Link } from 'react-router-dom';
import { Reveal } from '../Section';
import { EmptyState, ErrorState, Skeleton } from '../feedback/States';
import { useBlogByCategory } from '../../lib/queries';
import { BlogCard } from './BlogCard';
import { HScroller } from '../HScroller';
import { parseShowreel } from '../../lib/links';
import { cardRatio, ratioWidth } from '../../lib/videoRatio';
export const blogAnchor = (c) => `blog-${c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
// "Our Blog" divided into one sub-section per category, mirroring CategorySections ("Our Work"). Used on the homepage and on /blog.
export function BlogCategorySections({ perCategory = 5, compact = false, HeadingLevel = 'h3' }) {
    const { data, isLoading, isError, refetch } = useBlogByCategory(perCategory);
    if (isLoading)
        return <div className="flex gap-4 overflow-hidden">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] w-[58vw] shrink-0 sm:w-64"/>)}</div>;
    if (isError)
        return <ErrorState onRetry={() => refetch()}/>;
    if (!data || data.length === 0)
        return <EmptyState title="Articles are on their way.">New articles will appear here once they are published.</EmptyState>;
    return (<div>
      <nav aria-label="Blog categories" className="flex flex-wrap justify-center gap-2">
        {data.map((g) => <a key={g.category} href={`#${blogAnchor(g.category)}`} className="rounded-full border border-gold/40 px-4 py-2 text-sm transition hover:border-gold hover:text-gold">{g.category}</a>)}
      </nav>
      <div className="mt-12 space-y-16">
        {data.map((g) => (<section key={g.category} id={blogAnchor(g.category)} aria-labelledby={`${blogAnchor(g.category)}-t`} className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gold/25 pb-4">
              <HeadingLevel id={`${blogAnchor(g.category)}-t`} className="!text-2xl">{g.category} <span className="ml-2 text-sm font-sans text-cream/50">{g.total} {g.total === 1 ? 'article' : 'articles'}</span></HeadingLevel>
              {g.total > g.items.length && <Link to={`/blog?category=${encodeURIComponent(g.category)}`} className="text-sm text-gold underline-offset-4 hover:underline">View all {g.category} ({g.total})</Link>}
            </div>
            <div className="mt-6"><HScroller label={`${g.category} articles`}>{g.items.map((a) => {
                    const hasVideo = !!parseShowreel(a.videoUrl ?? undefined);
                    const ratio = cardRatio(hasVideo, a.videoRatio);
                    return (<li key={a.id} className={`shrink-0 snap-start ${ratioWidth(ratio)}`}><Reveal className="h-full"><BlogCard a={a} ratio={ratio} compact={compact} Heading={compact ? 'h4' : 'h3'} autoPlayOnTouch/></Reveal></li>);
                })}</HScroller></div>
          </section>))}
      </div>
    </div>);
}
