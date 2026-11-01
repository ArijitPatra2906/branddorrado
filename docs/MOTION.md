# Hero motion and 3D experience

Implements the "Motion & 3D Experience Addendum" as progressive enhancement. **Status: written but not yet run.** The build sandbox had no network, so
dependencies were not installed and nothing was compiled, rendered or measured. Treat every item in "Still to verify" as open.

## What was added
| File | Purpose |
|---|---|
| `client/src/components/hero/BrandDorrado3DScene.jsx` | React Three Fiber scene: extruded BrandDorrado monogram, gold PBR material, lightformer studio, plinth, contact shadow, sparse dust, adaptive quality tier. |
| `client/src/components/hero/logoShapes.json` | The supplied logo symbol traced from the identity board into 4 polygons (main arch + stem, left column, right column, circle). Proportions are preserved; colours are sampled from the logo. |
| `client/src/components/hero/useHeroScrollTimeline.js` | One scrubbed GSAP ScrollTrigger timeline (progress 0..1) driving camera, rotation, light, explode state and copy cross-fades. Reversible and resize-safe (`invalidateOnRefresh`). |
| `client/src/components/hero/useHeroMode.js` | Chooses `story` (3D) or `static` (poster) from viewport, reduced motion, WebGL support, save-data / low memory, site setting and env flag. |
| `client/src/components/hero/sceneState.js`, `SceneBoundary.jsx` | Shared mutable scene state (no React re-renders on scroll); error boundary that falls back to the static hero. |
| `client/src/components/sections/Hero.jsx` | Static hero (unchanged layout) plus the pinned story hero. |

## Story sequence (scroll progress)
0.00 hero composition, 0.06 silhouette (light drops, rim stays), 0.18 surface close-up, 0.34 controlled rotation, 0.56 parts ease apart along set axes then reassemble (0.72), 0.80 return to hero composition, 0.95 scene fades while the stage un-pins and Services enters.
The stage is pinned with CSS `position: sticky` inside a 420svh wrapper. No wheel hijacking: the page scrolls at normal speed and scrolling up reverses the timeline.

## Dependencies (client workspace) and why
- `three`, `@react-three/fiber` (v8, React 18), `@react-three/drei` (v9): WebGL renderer, React bindings, Lightformer/ContactShadows/Sparkles/PerformanceMonitor helpers.
- `gsap` (includes ScrollTrigger): deterministic scrubbed timelines. Framer Motion cannot drive this 3D sequence on its own.
- `@types/three` (dev).
All of these are dynamically imported, so the main bundle does not grow; the 3D chunk loads only on desktop-class devices once the browser is idle.
Install from the **repo root**: `npm install`.

## Fallbacks and switches
Static hero (the layout-matched poster hero) is used when: viewport < 1024px, `prefers-reduced-motion`, no WebGL, Save-Data or <= 2 GB device memory, `VITE_ENABLE_3D=false`, site setting `hero.sceneEnabled=false`, scene chunk fails to load, or the WebGL context is lost.
`hero.motion = "low"` lowers the quality tier and removes particles. Controls: Pause/Play motion, Explore the form (drag or arrow keys, constrained; Previous/Next angle; Reset), Skip to services.
The poster image is visible immediately and fades out once the first frames render; headline, CTAs and stats are real DOM text.

## Assets and licences
No external models, HDRIs or textures are downloaded. Geometry comes from the supplied BrandDorrado logo; reflections come from procedural lightformers. `hero-art.jpg` (poster) is cut from the supplied layout image. No Apple assets or code are used.

## Still to verify (not done)
1. `npm install`, ``npm run build`, then view `/` at desktop width. Expect to tune camera distances, light levels and the timing windows in `useHeroScrollTimeline.js` by eye.
2. The live Apple reference page was **not** inspected in a browser (no browser or network in the sandbox); the sequence follows the written addendum, not recorded scroll triggers.
3. The poster is the existing liquid-gold image, not a render of the 3D monogram. Once the scene runs, capture a still of the composed frame and replace `hero-art.jpg` so the poster-to-scene fade is seamless.
4. Tablet and mobile now get a lighter 3D scene (`mode = 'lite'`, `LiteHero` in `Hero.jsx`): no pinning, lower pixel ratio, no particles, a static contact shadow, a gentle scroll-linked turn and one-finger sideways drag (vertical swipes still scroll). It loads only when idle and near the screen, and phones with fewer than 4 CPU cores, reduced motion, data-saver or no WebGL keep the poster. Set `VITE_ENABLE_3D_MOBILE=false` to switch it off. **Not yet tried on a real tablet or phone** - check frame rate, battery and heat by hand.
5. No bloom / post-processing (kept out to avoid another dependency); no GLB asset pipeline (geometry is generated at runtime).
6. No automated tests were added for the hero (no test runner is set up in this repo yet). No LCP/INP/CLS/page-weight numbers have been measured; do not claim targets until they are.
7. Check reduced-motion, keyboard-only, 200% zoom, WebGL-disabled and asset-failure states by hand.


## Per-device switches (admin > Settings)
The master switch and one switch each for phones, tablets, laptops and desktops are stored in `hero.sceneEnabled` and `hero.devices`. Device kind is decided in `deviceClass()` (`useHeroMode.js`): phone < 768px, tablet 768-1023px or a touch screen under 1400px, laptop < 1600px, desktop 1600px and wider. After a save the admin's own tab refetches at once; other open pages pick the change up through the 10-second revision check (`liveContent.js`) without a reload.

## Project and blog videos on phones and tablets
Every card that has a video, in the project and blog rows (`CategorySections.jsx`, `BlogCategorySections.jsx`), passes `autoPlayOnTouch` to `ProjectCard` / `BlogCard`. `useTouchAutoplay` (`lib/useTouchAutoplay.js`) plays the video (muted, looping) while at least 60% of the card is on screen, including as the row scrolls sideways, and stops it when the card leaves the screen or the tab is hidden. Phones and tablets only; laptops and desktops keep hover-to-play. Skipped for reduced motion and data-saver. Cards in the search/filter results grid are not autoplayed.
