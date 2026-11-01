import { useEffect, useRef } from 'react';
// Content is visible by default; the reveal class is only applied once JS runs and the element is below the fold.
export function useReveal() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;
        if (el.getBoundingClientRect().top < window.innerHeight)
            return;
        el.classList.add('reveal-pending');
        const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                el.classList.remove('reveal-pending');
                el.classList.add('reveal-done');
                io.disconnect();
            }
        }, { threshold: 0.12 });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return ref;
}
