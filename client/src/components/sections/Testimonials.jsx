import { Star } from 'lucide-react';
import { Reveal, SectionHeading, container } from '../Section';
import { EmptyState, ErrorState, Skeleton } from '../feedback/States';
import { useTestimonials } from '../../lib/queries';
export function Testimonials() {
    const { data, isLoading, isError, refetch } = useTestimonials();
    return (<section id="testimonials" aria-labelledby="testimonials-title" className="scroll-mt-20 bg-cream py-20 text-obsidian lg:py-28">
      <div className={container}>
        <SectionHeading id="testimonials-title" eyebrow="Clients say" title="Stories That Inspire."/>
        <div className="mt-14">
          {isLoading && <div className="grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56"/>)}</div>}
          {isError && <ErrorState onRetry={() => refetch()}/>}
          {data && data.length === 0 && <EmptyState title="Client stories are coming soon.">We only publish testimonials that clients have approved.</EmptyState>}
          {data && data.length > 0 && (<ul className="grid gap-5 md:grid-cols-3">
              {data.slice(0, 6).map((t) => (<li key={t.id}>
                  <Reveal className="h-full">
                    <figure className="flex h-full flex-col rounded-card border border-gold/30 bg-white/60 p-6">
                      {t.rating != null && (<p className="flex gap-0.5 text-gold-deep" role="img" aria-label={`Rated ${t.rating} out of 5`}>
                          {Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} aria-hidden="true" className={i < t.rating ? 'fill-current' : 'opacity-30'}/>)}
                        </p>)}
                      <blockquote className="mt-4 flex-1 font-serif text-xl leading-snug">&ldquo;{t.body}&rdquo;</blockquote>
                      <figcaption className="mt-6 flex items-center gap-3 text-sm">
                        {t.avatarUrl && <img src={t.avatarUrl} alt="" loading="lazy" width={44} height={44} className="h-11 w-11 rounded-full object-cover"/>}
                        <span><span className="block font-semibold">{t.clientName}</span><span className="text-obsidian/60">{[t.businessName, t.industry].filter(Boolean).join(' · ')}</span></span>
                      </figcaption>
                    </figure>
                  </Reveal>
                </li>))}
            </ul>)}
        </div>
      </div>
    </section>);
}
