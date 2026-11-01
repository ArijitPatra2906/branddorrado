import { useEffect } from 'react';
import { deviceClass } from '../components/hero/useHeroMode';
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const dataSaver = () => typeof navigator !== 'undefined' && !!navigator.connection?.saveData;
// Phones and tablets only (laptops and desktops keep hover-to-play).
const isTouchDevice = () => typeof window !== 'undefined' && ['phone', 'tablet'].includes(deviceClass());
// Plays a card's video by itself while at least 60% of the card is on screen, and stops it when the card scrolls out of view
// (up, down or sideways inside its row), when the tab is hidden, or when the screen rotates to a laptop-sized layout.
// Skipped for visitors who prefer reduced motion or have data-saver on.
export function useTouchAutoplay({ enabled, card, start, stop, deps = [] }) {
    useEffect(() => {
        const el = card.current;
        if (!enabled || !el || typeof IntersectionObserver === 'undefined')
            return undefined;
        let visible = false;
        const sync = () => {
            if (visible && !document.hidden && isTouchDevice() && !reduced() && !dataSaver())
                start();
            else
                stop();
        };
        const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.6 });
        io.observe(el);
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('resize', sync);
        return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', sync); stop(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ...deps]);
}
