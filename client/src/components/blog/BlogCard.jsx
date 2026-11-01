import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Logo } from '../Logo';
import { hoverEmbed, parseShowreel } from '../../lib/links';
import { formatDate } from '../../lib/format';
import { ratioCss } from '../../lib/videoRatio';
import { useTouchAutoplay } from '../../lib/useTouchAutoplay';
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// An article card, built exactly like the "Our Work" project card (and behaving the same way):
// when the article has a video, hovering (or keyboard-focusing) the card plays it silently inside the card.
// Thumbnail: the featured image; with none, the first frame of an uploaded video, then the BrandDorrado symbol.
export function BlogCard({ a, compact = false, Heading = 'h2', ratio = null, autoPlayOnTouch = false }) {
    const video = parseShowreel(a.videoUrl ?? undefined);
    const ref = useRef(null);
    const [on, setOn] = useState(false);
    const [playing, setPlaying] = useState(false);
    const start = () => {
        if (!video || reduced())
            return;
        setOn(true);
        ref.current?.play?.().catch(() => { });
    };
    const stop = () => {
        setOn(false);
        setPlaying(false);
        const v = ref.current;
        if (v?.pause) {
            v.pause();
            v.currentTime = 0;
        }
    };
    const embed = video?.kind === 'iframe' ? hoverEmbed(video.src) : null;
    const card = useRef(null);
    useTouchAutoplay({ enabled: autoPlayOnTouch && !!video, card, start, stop, deps: [a.videoUrl] });
    const meta = [formatDate(a.publishedAt), a.authorName].filter(Boolean).join(' · ');
    return (<Link ref={card} to={`/blog/${a.slug}`} onPointerEnter={(e) => e.pointerType === 'mouse' && start()} onPointerLeave={stop} onFocus={start} onBlur={stop}
        style={ratio ? { aspectRatio: ratioCss(ratio) } : undefined}
        className={`group relative block ${ratio ? '' : compact ? 'aspect-[3/4]' : 'aspect-[4/5]'} overflow-hidden rounded-card border border-gold/20 bg-[#1a1a1a]`}>
      {a.featuredImageUrl
            ? <img src={a.featuredImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
            : video?.kind === 'video'
                ? <video src={`${video.src}#t=0.5`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="h-full w-full object-cover"/>
                : <div aria-hidden="true" className="grid h-full w-full place-items-center bg-[linear-gradient(160deg,#2a2112,#141414_70%)]"><Logo variant="symbol" className="h-24 w-auto opacity-25"/></div>}
      {video?.kind === 'video' && <video ref={ref} src={video.src} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} onPlaying={() => setPlaying(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${playing ? 'opacity-100' : 'opacity-0'}`}/>}
      {embed && on && <iframe src={embed} title="" aria-hidden="true" tabIndex={-1} allow="autoplay; encrypted-media" onLoad={() => setPlaying(true)}
        className="pointer-events-none absolute inset-0 h-full w-full scale-[1.8] border-0"/>}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent"/>
      {video && <span aria-hidden="true" className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-gold/60 bg-obsidian/60 text-gold transition-opacity ${on && playing ? 'opacity-0' : 'opacity-100'}`}><Play size={14} fill="currentColor"/></span>}
      <div className={`absolute inset-x-0 bottom-0 ${compact ? 'p-4' : 'p-5'}`}>
        {a.isDemo && <span className="mb-2 inline-block rounded-full border border-gold/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-gold">Sample</span>}
        <p className="eyebrow !tracking-[0.2em]">{a.category ?? 'General'}</p>
        <Heading className={`mt-1 ${compact ? '!text-lg' : '!text-xl'} leading-snug`}>{a.title}</Heading>
        {meta && <p className="mt-1 text-xs text-cream/65">{meta}</p>}
        {video && <span className="sr-only">Video article</span>}
      </div>
    </Link>);
}
