import { Link } from 'react-router-dom';
import { Reveal } from '../Section';
import { EmptyState, ErrorState, Skeleton } from '../feedback/States';
import { useWorkByCategory } from '../../lib/queries';
import { ProjectCard } from './ProjectCard';
import { parseShowreel } from '../../lib/links';
import { HScroller } from '../HScroller';
import { cardRatio, ratioWidth } from '../../lib/videoRatio';
export const categoryAnchor = (c) => `work-${c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
// "Our Work" divided into one sub-section per category. Used on the homepage and on /work.
export function CategorySections({ perCategory = 5, compact = false, HeadingLevel = 'h3' }) {
    const { data, isLoading, isError, refetch } = useWorkByCategory(perCategory);
    if (isLoading)
        return <div className="flex gap-4 overflow-hidden">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] w-[58vw] shrink-0 sm:w-64"/>)}</div>;
    if (isError)
        return <ErrorState onRetry={() => refetch()}/>;
    if (!data || data.length === 0)
        return <EmptyState title="Selected work is on its way.">Approved case studies will appear here once they are published.</EmptyState>;
    return (<div>
      <nav aria-label="Work categories" className="flex flex-wrap justify-center gap-2">
        {data.map((g) => <a key={g.category} href={`#${categoryAnchor(g.category)}`} className="rounded-full border border-gold/40 px-4 py-2 text-sm transition hover:border-gold hover:text-gold">{g.category}</a>)}
      </nav>
      <div className="mt-12 space-y-16">
        {data.map((g) => (<section key={g.category} id={categoryAnchor(g.category)} aria-labelledby={`${categoryAnchor(g.category)}-t`} className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gold/25 pb-4">
              <HeadingLevel id={`${categoryAnchor(g.category)}-t`} className="!text-2xl">{g.category} <span className="ml-2 text-sm font-sans text-cream/50">{g.total} {g.total === 1 ? 'project' : 'projects'}</span></HeadingLevel>
              {g.total > g.items.length && <Link to={`/work?industry=${encodeURIComponent(g.category)}`} className="text-sm text-gold underline-offset-4 hover:underline">View all {g.category} ({g.total})</Link>}
            </div>
            {/* One row per category that scrolls sideways, on every screen size. On phones and tablets every video plays by itself as it scrolls into view. */}
            <div className="mt-6"><HScroller label={`${g.category} projects`}>{g.items.map((p) => {
                    const hasVideo = !!parseShowreel(p.videoUrl ?? undefined);
                    const ratio = cardRatio(hasVideo, p.videoRatio);
                    return (<li key={p.id} className={`shrink-0 snap-start ${ratioWidth(ratio)}`}><Reveal className="h-full"><ProjectCard p={p} ratio={ratio} compact={compact} Heading={compact ? 'h4' : 'h3'} autoPlayOnTouch/></Reveal></li>);
                })}</HScroller></div>
          </section>))}
      </div>
    </div>);
}
