import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { ShowreelModal } from '../ShowreelModal';
import { Logo } from '../Logo';
import { SceneBoundary } from '../hero/SceneBoundary';
import { HERO_POSE, createSceneState } from '../hero/sceneState';
import { useHeroMode } from '../hero/useHeroMode';
import { useHeroScrollTimeline } from '../hero/useHeroScrollTimeline';
import { useSiteSettings } from '../../lib/queries';
import { enquiryLink, parseShowreel } from '../../lib/links';
// The 3D scene (three.js + react-three-fiber) is a separate chunk, only fetched when the story hero is used.
const Scene = lazy(() => import('../hero/BrandDorrado3DScene'));
const BEATS = [
    { eyebrow: 'First light', title: 'Form, in shadow.', text: 'Every brand begins as an outline.' },
    { eyebrow: 'The surface', title: 'Gold, brought to light.', text: 'Edges catch the light. Detail earns the shine.' },
    { eyebrow: 'The form', title: 'Depth in every angle.', text: 'Strategy gives a brand its shape and weight.' },
    { eyebrow: 'The parts', title: 'Every part, in place.', text: 'Content, design and growth, built to work as one.' },
    { eyebrow: "Let's begin", title: 'Turn your brand golden.', text: '' },
];
const ANGLES = [-0.8, -0.4, 0, 0.4, 0.8];
const showBtn = 'group inline-flex items-center gap-3 text-sm text-cream/90 hover:text-gold';
const circle = 'grid h-11 w-11 place-items-center rounded-full border border-gold/70 transition group-hover:bg-gold/15';
const ctrl = 'inline-flex items-center gap-2 rounded-full border border-gold/40 bg-obsidian/60 px-4 py-2 text-xs font-medium text-cream/90 transition hover:border-gold hover:text-gold aria-pressed:border-gold aria-pressed:text-gold';
function Copy({ embed, onPlay }) {
    const play = <><span className={circle}><Play size={14} className="ml-0.5 fill-current" aria-hidden="true"/></span>Watch Showreel</>;
    return (<div className="hero-in w-full lg:max-w-[48%]">
      {/* lg only: the header has no room for the logo between 1024 and 1279px, so the hero carries it */}
      <Logo variant="wordmark-dark" className="mb-8 hidden h-12 w-auto lg:block xl:hidden"/>
      <p className="relative font-serif text-xl uppercase tracking-[0.35em] text-cream/90 lg:text-[clamp(1.1rem,1.9vw,1.9rem)]">
        <span aria-hidden="true" className="absolute right-full top-1/2 mr-[3vw] hidden h-px w-[2.6vw] bg-gold/60 lg:block"/>
        We
      </p>
      <h1 id="hero-title" className="relative mt-1 text-[length:clamp(2.6rem,13.2vw,4.6rem)] font-medium uppercase leading-[0.92] tracking-[-0.005em] sm:text-[length:clamp(3.4rem,9vw,5.5rem)] lg:text-[length:clamp(3.4rem,5.7vw,8rem)]">
        <span className="sr-only">BrandDorrado: </span>
        <span className="block whitespace-nowrap text-cream">Turn Brands</span>
        <span className="block bg-gold-metal bg-clip-text text-transparent">Golden.</span>
      </h1>
      <p className="mt-6 max-w-[27em] text-base leading-relaxed text-cream/85 lg:mt-[2vw] lg:text-[clamp(1rem,1.25vw,1.3rem)]">
        Strategy, storytelling and digital experiences for ambitious brands.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 lg:mt-[2.2vw]">
        <Link to={enquiryLink()} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#E3C07A] to-gold px-7 py-3.5 text-sm font-semibold text-obsidian shadow-[0_8px_30px_-10px_rgba(200,154,60,0.7)] transition hover:brightness-110">
          Start your project <ArrowUpRight size={16} aria-hidden="true"/>
        </Link>
        {embed ? <button type="button" onClick={onPlay} className={showBtn}>{play}</button> : <Link to="/work" className={showBtn}>{play}</Link>}
      </div>
    </div>);
}
function Stats({ stats, story }) {
    if (stats.length === 0)
        return null;
    return (<div data-hero-copy={story ? '' : undefined} className={`z-10 px-6 pb-8 sm:px-10 lg:pb-[2.2vw] lg:pl-[5.4%] lg:pr-[5%] ${story ? 'absolute inset-x-0 bottom-0' : 'relative'}`}>
      <div aria-hidden="true" className="mb-6 h-px w-full bg-gradient-to-r from-gold/30 via-gold/10 to-transparent lg:mb-[1.8vw]"/>
      <dl className="grid grid-cols-2 gap-y-6 lg:flex lg:items-center lg:gap-0">
        <span aria-hidden="true" className="mr-[2.8vw] hidden h-px w-[2.6vw] bg-gold/60 lg:block"/>
        {stats.map((st, i) => (<div key={st.label} className={`pr-4 lg:pr-[2.6vw] ${i > 0 ? 'lg:ml-[2.6vw] lg:border-l lg:border-gold/20 lg:pl-[2.6vw]' : ''}`}>
            <dd className="font-serif text-[length:clamp(1.7rem,2.2vw,2.4rem)] leading-none text-cream">{st.value}</dd>
            <dt className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-cream/60 lg:text-[clamp(0.55rem,0.62vw,0.7rem)]">{st.label}</dt>
          </div>))}
      </dl>
    </div>);
}
function SideDecor() {
    return (<>
      <div aria-hidden="true" data-fade-out className="absolute right-[3.8%] top-[40%] hidden text-[clamp(0.6rem,0.78vw,0.8rem)] uppercase leading-[2.3] tracking-[0.3em] text-cream/75 lg:block">
        <p>Digital</p><p>Branding</p><p>Storytelling</p>
        <span className="mt-3 block h-px w-[3.5vw] bg-gold/70"/>
      </div>
      <Link to="/#services" aria-label="Scroll to services" data-fade-out className="absolute bottom-[8%] right-[2.2%] z-20 hidden flex-col items-center gap-3 lg:flex">
        <span className="[writing-mode:vertical-rl] text-[0.55rem] uppercase tracking-[0.3em] text-cream/50">Scroll</span>
        <span className="relative block h-9 w-5 rounded-full border border-gold/70"><span className="absolute left-1/2 top-2 h-1.5 w-px -translate-x-1/2 bg-gold"/></span>
      </Link>
    </>);
}
const Backdrop = () => (<>
    <div aria-hidden="true" className="absolute inset-0 -z-30 bg-[url('/hero/rock-bg.jpg')] bg-cover bg-center opacity-50"/>
    <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(115deg,rgba(10,9,8,0.55),rgba(10,9,8,0.9))]"/>
    <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(28%_38%_at_0%_0%,rgba(200,154,60,0.22),transparent_70%),radial-gradient(28%_38%_at_100%_0%,rgba(200,154,60,0.26),transparent_70%)]"/>
  </>);
const copyPad = 'px-6 pb-10 pt-32 sm:px-10 lg:pb-8 lg:pl-[11.3%] lg:pr-[5%] lg:pt-[8.5vw]';
export function Hero() {
    const { data: s } = useSiteSettings();
    const mode = useHeroMode(s?.hero);
    const [failed, setFailed] = useState(false);
    const [playing, setPlaying] = useState(false);
    const close = useCallback(() => setPlaying(false), []);
    const embed = parseShowreel(s?.hero.videoUrl);
    const stats = s?.heroStats ?? [];
    const art = s?.hero.imageUrl || '/hero/hero-art.jpg';
    const artFit = s?.hero.imageUrl ? 'object-contain object-right-bottom' : 'object-cover object-left-bottom';
    const story = mode === 'story' && !failed;
    const lite = mode === 'lite' && !failed;
    const modal = playing && embed ? <ShowreelModal embed={embed} onClose={close}/> : null;
    if (story)
        return <><StoryHero art={art} artFit={artFit} embed={embed} stats={stats} lowMotion={s?.hero.motion === 'low'} onPlay={() => setPlaying(true)} onFail={() => setFailed(true)}/>{modal}</>;
    if (lite)
        return <><LiteHero art={art} artFit={artFit} embed={embed} stats={stats} lowMotion={s?.hero.motion === 'low'} onPlay={() => setPlaying(true)} onFail={() => setFailed(true)}/>{modal}</>;
    // Static hero (default for reduced motion, tablet/mobile, no WebGL, or when the 3D scene is switched off).
    return (<section aria-labelledby="hero-title" className="relative isolate flex min-h-[640px] flex-col overflow-hidden bg-[#0a0908] lg:min-h-[max(640px,44vw)]">
      <Backdrop />
      <img src={art} alt="" width={1365} height={948} fetchpriority="high" className={`pointer-events-none absolute bottom-0 right-0 -z-10 hidden h-[86%] w-[51.4%] lg:block ${artFit} hero-art-mask`}/>
      <SideDecor />
      <div className={`relative z-10 flex flex-1 items-center ${copyPad}`}><Copy embed={embed} onPlay={() => setPlaying(true)}/></div>
      <img src={art} alt="" width={1365} height={948} loading="lazy" className={`pointer-events-none relative -mt-6 h-64 w-full sm:h-80 lg:hidden ${artFit} hero-art-mask`}/>
      <Stats stats={stats} story={false}/>
      {modal}
    </section>);
}
// Tall wrapper + sticky stage: the scene stays pinned while the page scrolls at normal speed through ~4 screens.
function StoryHero({ art, artFit, embed, stats, lowMotion, onPlay, onFail }) {
    const wrap = useRef(null);
    const stage = useRef(null);
    const state = useRef(createSceneState()).current;
    const [mountScene, setMountScene] = useState(false);
    const [ready, setReady] = useState(false);
    const [active, setActive] = useState(true);
    const [ambient, setAmbient] = useState(true);
    const [explore, setExplore] = useState(false);
    const [angle, setAngle] = useState(2);
    const drag = useRef(null);
    useHeroScrollTimeline(true, wrap, stage, state);
    // Poster shows first; the scene chunk is requested once the browser is idle.
    useEffect(() => {
        const w = window;
        const id = w.requestIdleCallback ? w.requestIdleCallback(() => setMountScene(true), { timeout: 1200 }) : window.setTimeout(() => setMountScene(true), 300);
        return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : window.clearTimeout(id));
    }, []);
    // Render only while the hero is on screen and the tab is visible.
    useEffect(() => {
        const el = stage.current;
        if (!el)
            return;
        let inView = true;
        const sync = () => setActive(inView && !document.hidden);
        const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { rootMargin: '200px' });
        io.observe(el);
        document.addEventListener('visibilitychange', sync);
        return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); };
    }, []);
    useEffect(() => { state.ambient = ambient; state.invalidate?.(); }, [ambient, state]);
    const nudge = (dyaw, dpitch = 0) => {
        state.tYaw = Math.max(-0.9, Math.min(0.9, state.tYaw + dyaw));
        state.tPitch = Math.max(-0.3, Math.min(0.3, state.tPitch + dpitch));
        state.invalidate?.();
    };
    const reset = () => { state.tYaw = 0; state.tPitch = 0; setAngle(2); state.invalidate?.(); };
    const toggleExplore = () => { if (explore)
        reset(); setExplore((v) => !v); };
    const step = (d) => { const n = (angle + d + ANGLES.length) % ANGLES.length; setAngle(n); state.tYaw = ANGLES[n]; state.tPitch = 0; state.invalidate?.(); };
    return (<section ref={wrap} aria-labelledby="hero-title" className="relative h-[420svh] bg-[#0a0908]">
      <div ref={stage} className="sticky top-0 isolate h-[100svh] min-h-[640px] overflow-hidden">
        <Backdrop />
        {/* Depth layer: a thin architectural arc that drifts at a different rate to the object */}
        <svg data-arch aria-hidden="true" viewBox="0 0 800 800" className="pointer-events-none absolute right-[4%] top-[8%] -z-10 h-[84%] w-auto opacity-70">
          <path d="M70 790 V410 A330 330 0 0 1 730 410" fill="none" stroke="#C89A3C" strokeOpacity="0.5" strokeWidth="1.2"/>
          <path d="M120 790 V420 A280 280 0 0 1 680 420" fill="none" stroke="#C89A3C" strokeOpacity="0.2" strokeWidth="1"/>
        </svg>
        {/* Poster: visible immediately, fades out once the 3D scene has rendered */}
        <img src={art} alt="" width={1365} height={948} fetchpriority="high" data-fade-out className={`pointer-events-none absolute bottom-0 right-0 -z-10 h-[86%] w-[51.4%] transition-opacity duration-1000 ${artFit} hero-art-mask ${ready ? 'opacity-0' : 'opacity-100'}`}/>
        {/* Canvas: decorative, never intercepts clicks */}
        <div data-canvas aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
          {mountScene && (<SceneBoundary onError={onFail}>
              <Suspense fallback={null}>
                <Scene state={state} active={active} ambient={ambient} lowMotion={lowMotion} onReady={() => setReady(true)} onFail={onFail}/>
              </Suspense>
            </SceneBoundary>)}
        </div>
        <SideDecor />

        <div data-hero-copy className={`absolute inset-0 z-10 flex items-center ${copyPad}`}><Copy embed={embed} onPlay={onPlay}/></div>
        <Stats stats={stats} story/>

        {/* Story beats: short copy, synced to the scroll-driven scene. Text is also available to screen readers below. */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center px-6 sm:px-10 lg:pl-[11.3%] lg:pr-[5%]">
          {BEATS.map((b, i) => (<div key={b.title} data-beat aria-hidden={i < 4 ? true : undefined} className="invisible absolute max-w-[26rem]">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">{b.eyebrow}</p>
              <p className="mt-4 font-serif text-[length:clamp(2.2rem,4.2vw,4.2rem)] font-medium leading-[1.02] text-cream">{b.title}</p>
              {b.text && <p className="mt-4 text-[clamp(1rem,1.2vw,1.2rem)] text-cream/80">{b.text}</p>}
              {i === 4 && <Link to={enquiryLink()} className="pointer-events-auto mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#E3C07A] to-gold px-7 py-3.5 text-sm font-semibold text-obsidian transition hover:brightness-110">Start your project <ArrowUpRight size={16} aria-hidden="true"/></Link>}
            </div>))}
        </div>
        <ul className="sr-only">{BEATS.slice(0, 4).map((b) => <li key={b.title}>{b.title} {b.text}</li>)}</ul>

        {/* Optional drag / keyboard rotation, constrained, only on the right half so text and CTAs stay clickable */}
        {explore && (<div role="group" tabIndex={0} aria-label="3D monogram. Drag, or use the left and right arrow keys, to rotate it." className="absolute bottom-[14%] right-[3%] top-[12%] z-10 w-[46%] cursor-grab touch-pan-y rounded-2xl outline-offset-4 active:cursor-grabbing" onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (!drag.current)
            return; nudge((e.clientX - drag.current.x) * 0.006, (e.clientY - drag.current.y) * 0.003); drag.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={(e) => { if (e.key === 'ArrowLeft') {
            e.preventDefault();
            nudge(-0.15);
        } if (e.key === 'ArrowRight') {
            e.preventDefault();
            nudge(0.15);
        } if (e.key === 'Escape')
            reset(); }}/>)}

        {/* Controls (never required to use the page) */}
        <div data-fade-out className="absolute bottom-[2.4vw] right-[7%] z-20 flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={ctrl} aria-pressed={!ambient} onClick={() => setAmbient((v) => !v)}>
            {ambient ? <Pause size={12} aria-hidden="true"/> : <Play size={12} aria-hidden="true"/>}{ambient ? 'Pause motion' : 'Play motion'}
          </button>
          <button type="button" className={ctrl} aria-pressed={explore} onClick={toggleExplore}>Explore the form</button>
          {explore && <>
            <button type="button" className={ctrl} onClick={() => step(-1)} aria-label="Previous angle">Previous angle</button>
            <button type="button" className={ctrl} onClick={() => step(1)} aria-label="Next angle">Next angle</button>
            <button type="button" className={ctrl} onClick={reset}>Reset view</button>
          </>}
          <a href="#services" className={ctrl}>Skip to services</a>
        </div>
      </div>
    </section>);
}

// Tablet + phone: same layout as the static hero, but the picture is a light, live 3D scene. No pinning and no scroll
// hijack. The scene turns gently as the hero scrolls through the screen, and one finger can turn it sideways while
// vertical swipes still scroll the page. It is only fetched when idle and near the screen, and stops rendering when off screen.
function LiteHero({ art, artFit, embed, stats, lowMotion, onPlay, onFail }) {
    const box = useRef(null);
    const state = useRef(Object.assign(createSceneState(), { posX: 0, lite: true })).current;
    const [idle, setIdle] = useState(false);
    const [near, setNear] = useState(false);
    const [active, setActive] = useState(false);
    const [ready, setReady] = useState(false);
    const [ambient, setAmbient] = useState(true);
    const drag = useRef(null);
    useEffect(() => {
        const w = window;
        const id = w.requestIdleCallback ? w.requestIdleCallback(() => setIdle(true), { timeout: 1500 }) : window.setTimeout(() => setIdle(true), 500);
        return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : window.clearTimeout(id));
    }, []);
    useEffect(() => {
        const el = box.current;
        if (!el)
            return;
        let inView = false;
        const sync = () => setActive(inView && !document.hidden);
        const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView)
            setNear(true); sync(); }, { rootMargin: '300px' });
        io.observe(el);
        document.addEventListener('visibilitychange', sync);
        return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); };
    }, []);
    // Scroll-linked turn: progress 0..1 of the picture passing through the screen. Reversible, no pinning.
    useEffect(() => {
        const el = box.current;
        if (!el)
            return;
        let raf = 0;
        const update = () => {
            raf = 0;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight || 1;
            const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
            state.rotY = HERO_POSE.rotY + (p - 0.5) * 1.4;
            state.invalidate?.();
        };
        const onScroll = () => { if (!raf)
            raf = requestAnimationFrame(update); };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        update();
        return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf)
            cancelAnimationFrame(raf); };
    }, [state]);
    useEffect(() => { state.ambient = ambient; state.invalidate?.(); }, [ambient, state]);
    const turn = (dx) => { state.tYaw = Math.max(-0.9, Math.min(0.9, state.tYaw + dx * 0.008)); state.invalidate?.(); };
    const release = () => { drag.current = null; state.tYaw = 0; state.tPitch = 0; state.invalidate?.(); }; // eases back to the designed view
    return (<section aria-labelledby="hero-title" className="relative isolate flex min-h-[640px] flex-col overflow-hidden bg-[#0a0908]">
      <Backdrop />
      <div className={`relative z-10 flex flex-1 items-center ${copyPad}`}><Copy embed={embed} onPlay={onPlay}/></div>
      <div ref={box} className="relative -mt-6 h-80 w-full sm:h-[26rem]">
        <img src={art} alt="" width={1365} height={948} loading="lazy" className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000 ${artFit} hero-art-mask ${ready ? 'opacity-0' : 'opacity-100'}`}/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {idle && near && (<SceneBoundary onError={onFail}>
              <Suspense fallback={null}>
                <Scene lite state={state} active={active} ambient={ambient} lowMotion={lowMotion} onReady={() => setReady(true)} onFail={onFail}/>
              </Suspense>
            </SceneBoundary>)}
        </div>
        {/* One-finger sideways turn. touch-action: pan-y keeps vertical swipes scrolling the page. */}
        <div aria-hidden="true" className="absolute inset-0 z-[1] touch-pan-y" onPointerDown={(e) => { drag.current = e.clientX; }} onPointerMove={(e) => { if (drag.current === null)
            return; turn(e.clientX - drag.current); drag.current = e.clientX; }} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}/>
        <div className="absolute bottom-3 right-4 z-10">
          <button type="button" className={ctrl} aria-pressed={!ambient} onClick={() => setAmbient((v) => !v)}>
            {ambient ? <Pause size={12} aria-hidden="true"/> : <Play size={12} aria-hidden="true"/>}{ambient ? 'Pause motion' : 'Play motion'}
          </button>
        </div>
      </div>
      <Stats stats={stats} story={false}/>
    </section>);
}
