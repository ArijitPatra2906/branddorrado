import { useEffect } from 'react';
import { HERO_POSE } from './sceneState';
// One scrubbed GSAP timeline (duration 1 = scroll progress 0..1 across the tall hero wrapper). The stage is
// pinned with CSS `position: sticky`, so nothing hijacks the wheel and the page scrolls at normal speed.
// Scrolling up plays the same timeline in reverse. GSAP is loaded on demand so it stays out of the main bundle.
export function useHeroScrollTimeline(enabled, wrap, stage, state) {
    useEffect(() => {
        if (!enabled)
            return;
        let revert;
        let cancelled = false;
        (async () => {
            const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
            if (cancelled || !wrap.current || !stage.current)
                return;
            gsap.registerPlugin(ScrollTrigger);
            const root = stage.current;
            const copy = root.querySelectorAll('[data-hero-copy]');
            const beats = root.querySelectorAll('[data-beat]');
            const canvas = root.querySelector('[data-canvas]');
            const arch = root.querySelector('[data-arch]');
            const s = state;
            const ctx = gsap.context(() => {
                const tl = gsap.timeline({
                    defaults: { ease: 'power1.inOut' },
                    scrollTrigger: {
                        trigger: wrap.current, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true,
                        onUpdate: () => s.invalidate?.(),
                    },
                });
                const FULL = Math.PI * 2 + HERO_POSE.rotY;
                // Object / camera / light states
                tl.to(s, { light: 0.12, camZ: 7.4, posX: 0, rotY: 0.1, duration: 0.12 }, 0.06) // a. silhouette
                    .to(s, { light: 1.15, camZ: 3.6, camY: 0.35, posX: 0.05, rotY: 0.55, rotX: 0.1, duration: 0.16 }, 0.18) // b. surface close-up
                    .to(s, { light: 1, camZ: 5.4, camY: 0.15, rotY: 0.55 + Math.PI * 1.1, rotX: 0.05, duration: 0.22 }, 0.34) // c. rotation / depth
                    .to(s, { explode: 1, camZ: 6.2, duration: 0.1 }, 0.56) // d. parts ease apart
                    .to(s, { explode: 0, duration: 0.08 }, 0.72) //    ...and reassemble
                    .to(s, { camZ: HERO_POSE.camZ, camY: HERO_POSE.camY, posX: HERO_POSE.posX, rotY: FULL, rotX: 0, duration: 0.14 }, 0.8); // e. hero composition
                // Hero copy leaves, story beats cross-fade in and out
                tl.to(copy, { autoAlpha: 0, y: -40, duration: 0.05 }, 0.03);
                const windows = [[0.09, 0.17], [0.22, 0.33], [0.38, 0.53], [0.58, 0.78], [0.86, 0.95]];
                beats.forEach((el, i) => {
                    const [a, b] = windows[i];
                    tl.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.03 }, a);
                    tl.to(el, { autoAlpha: 0, y: -28, duration: 0.03 }, b);
                });
                // Depth layer + hand-off to Services (the scene and light fade while the stage unpins)
                if (arch)
                    tl.to(arch, { xPercent: -6, scale: 1.08, ease: 'none', duration: 1 }, 0);
                if (canvas)
                    tl.to(canvas, { autoAlpha: 0, duration: 0.05 }, 0.95);
                tl.to(root.querySelectorAll('[data-fade-out]'), { autoAlpha: 0, duration: 0.05 }, 0.95);
                tl.set({}, {}, 1); // pin the timeline length to exactly 1
            }, wrap.current);
            const onLoad = () => ScrollTrigger.refresh();
            window.addEventListener('load', onLoad);
            document.fonts?.ready.then(() => ScrollTrigger.refresh());
            revert = () => { window.removeEventListener('load', onLoad); ctx.revert(); };
        })();
        return () => { cancelled = true; revert?.(); Object.assign(state, HERO_POSE); };
    }, [enabled, wrap, stage, state]);
}
