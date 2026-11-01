import { Link } from 'react-router-dom';
import { ArrowUpRight, Clapperboard, Code2, Megaphone, Palette, Share2, Sparkles } from 'lucide-react';
import { Logo } from '../Logo';
import { Reveal, SectionHeading, container } from '../Section';
import { EmptyState, ErrorState, Skeleton } from '../feedback/States';
import { useServices } from '../../lib/queries';
import { enquiryLink } from '../../lib/links';
const ICONS = { clapperboard: Clapperboard, share: Share2, palette: Palette, code: Code2, megaphone: Megaphone };
export function Services() {
    const { data, isLoading, isError, refetch } = useServices();
    return (<section id="services" aria-labelledby="services-title" className="scroll-mt-20 bg-cream py-20 text-obsidian lg:py-28">
      <div className={container}>
        <SectionHeading id="services-title" eyebrow="What we do" title="Complete Brand Growth Solutions." text="From content to strategy, we handle everything you need to build a powerful digital presence and turn your business into a brand."/>
        <div className="mt-14">
          {isLoading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-80"/>)}</div>}
          {isError && <ErrorState onRetry={() => refetch()}/>}
          {data && data.length === 0 && <EmptyState title="Services are being updated.">Please check back shortly.</EmptyState>}
          {data && data.length > 0 && (<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {data.map((s) => {
                const Icon = ICONS[s.iconId ?? ''] ?? Sparkles;
                return (<li key={s.id}>
                    <Reveal className="h-full">
                      <Link to={enquiryLink({ service: s.slug })} className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-card bg-obsidian p-5 text-cream focus-visible:outline-gold">
                        {s.imageUrl
                        ? <img src={s.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
                        : <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(160deg,#2a2112,#111_70%)]"><Logo variant="symbol" className="absolute -right-4 -top-2 h-40 w-auto opacity-10"/></div>}
                        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-obsidian/10"/>
                        <div className="relative">
                          <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/60 text-gold"><Icon size={18} aria-hidden="true"/></span>
                          <h3 className="mt-4 text-2xl leading-tight">{s.title}</h3>
                          <p className="mt-2 text-sm text-cream/75">{s.shortDescription}</p>
                          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gold">
                            {s.ctaLabel ?? 'Enquire'} <ArrowUpRight size={14} aria-hidden="true" className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  </li>);
            })}
            </ul>)}
        </div>
        <div className="mt-12 text-center"><Link to="/services" className="btn-dark">Explore Services</Link></div>
      </div>
    </section>);
}
