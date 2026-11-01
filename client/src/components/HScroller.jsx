import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// A single horizontal row of cards that scrolls sideways (swipe, trackpad, keyboard arrow keys, or the arrow buttons).
// Used on every screen size for the project and blog categories. The children must be <li> elements.
export function HScroller({ label, children }) {
    const ref = useRef(null);
    const [edge, setEdge] = useState({ start: true, end: true });
    const update = useCallback(() => {
        const el = ref.current;
        if (!el)
            return;
        setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    }, []);
    useEffect(() => {
        update();
        const el = ref.current;
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
        if (ro && el)
            ro.observe(el);
        window.addEventListener('resize', update);
        return () => { ro?.disconnect(); window.removeEventListener('resize', update); };
    }, [update, children]);
    const by = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: reduced() ? 'auto' : 'smooth' });
    const btn = 'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-gold/60 bg-obsidian/80 text-gold transition hover:bg-gold hover:text-obsidian focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold md:grid';
    return (<div className="relative">
      <ul ref={ref} onScroll={update} tabIndex={0} aria-label={label} className="flex snap-x snap-proximity items-start gap-4 overflow-x-auto overscroll-x-contain pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/70 [scrollbar-color:#A1731F_transparent] [scrollbar-width:thin]">
        {children}
      </ul>
      {!edge.start && <button type="button" aria-label={`Scroll ${label} left`} onClick={() => by(-1)} className={`${btn} left-1`}><ChevronLeft size={20} aria-hidden="true"/></button>}
      {!edge.end && <button type="button" aria-label={`Scroll ${label} right`} onClick={() => by(1)} className={`${btn} right-1`}><ChevronRight size={20} aria-hidden="true"/></button>}
    </div>);
}
