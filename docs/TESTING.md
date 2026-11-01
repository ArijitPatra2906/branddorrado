# Testing and measurement

## Automated tests (already run once by the project owner: server 45/45, client 21/21 before the later additions)
```
npm test              # server (Vitest + Supertest, local throw-away database, Resend mocked) and client (Vitest + Testing Library)
npm run test:server
npm run test:client
npm run lint          # ESLint over server, client, e2e (first run may report warnings to tidy up)
```
Added since that run and **not yet run**: server tests for private-network origins and instant public updates; client tests for the API address on another device, the Services and Work pages and the admin routes.

## Browser tests (Playwright) — not yet run
They check what unit tests cannot: real layout at phone (390px), tablet (820px) and desktop (1440px) widths, no sideways scrolling and no console errors on every page, the mobile menu, a canvas never covering the call to action, and the hero fallbacks (reduced motion, WebGL switched off).
```
npm install
npm run e2e:install          # downloads the Chromium browser once
npm run dev:server           # terminal 1
npm run dev:client           # terminal 2
npm run e2e                  # terminal 3; opens nothing, writes e2e/report (open with: npx playwright show-report e2e/report)
```
For production-like numbers use a build: `npm -w client run build`, then `npm -w client run preview -- --port 4173`, then `E2E_BASE_URL=http://localhost:4173 npm run e2e`.
Each run also writes `e2e/results/metrics-<project>.json` (largest-contentful-paint time, layout shift, transfer size, DOM size) for `/` and `/work`.

## Results to fill in (the master prompt requires recorded measurements, not assumptions)
| Check | Desktop | Tablet | Phone | Reduced motion | WebGL off |
|---|---|---|---|---|---|
| Pages without sideways scroll or console errors | | | | | |
| Home LCP (ms) | | | | | |
| Home layout shift (CLS) | | | | | |
| Home transfer (KB) | | | | | |
Also check by hand and note the result: scroll the 3D hero forward and back (no jumps), resize the window mid-scroll, keyboard-only use (Tab through the header, hero buttons, Explore the form), 200% zoom, and lose the WebGL context (the poster hero should take over).

## Dependency audit (`npm run audit:prod`), run 28 October 2026
Four advisories in packages the live site uses. Decisions and reasons:
| Package | Advisory | Decision |
|---|---|---|
| drizzle-orm (<0.45.2) | SQL injection through improperly escaped SQL *identifiers* | **Upgrade** to 0.45.4 (with drizzle-kit 0.31). This code never builds table or column names from user input, so it was not exploitable here, but it is rated high and the fix is cheap. |
| resend, via html-to-text, deepmerge | Prototype pollution in deepmerge | **Upgrade** resend to 6.x. The site sends ready-made HTML and never calls the text-conversion path, so it was not reachable, but the upgrade removes the warning. |
| zod (<4.6.6) | Memory exhaustion on oversized constrained collections | **Defer.** Request bodies are capped at 50 KB and every array in the API schemas has a small maximum, so inputs cannot get large enough. Zod 4 is a major rewrite; plan it as its own task. |
| react-router (6.x to 7.17) | Open redirect through a backslash in Link/navigate; unsafe deserialisation in server-side rendering | **Defer.** The site passes only internal paths and database slugs to links and has no server-side rendering. The fix is a major upgrade to v7; plan it as its own task. |

## First browser run, 28 October 2026 (project owner's machine, dev servers)
80 passed, 1 failed, 4 skipped (the mobile-menu test and the fallback test skip themselves on desktop-width projects, by design).
- Passed in all five projects (desktop 1440px, tablet 820px, phone 390px, reduced motion, WebGL off): all 11 pages (`/`, `/services`, `/work`, `/about`, `/pricing`, `/blog`, `/contact`, `/privacy-policy`, `/terms`, `/404`, `/admin/login`) have no sideways scrolling and no console errors; headline and both hero buttons visible at once; empty enquiry form shows errors; mobile menu opens and closes; reduced motion, WebGL off, tablet and phone show the poster hero with no canvas.
- The one failure ("a canvas never covers the call to action", desktop only) was caused by the 3D hero replacing the poster hero after the site setting loaded. After the test was made to retry, a second run passed: 81 passed, 4 skipped, 0 failed.
- Page-load numbers were recorded to `e2e/results/metrics-*.json`. They come from the development server, so treat them as a rough baseline, not production figures.

## Layout shift found by the measurements, and the fix
Desktop home page measured a layout shift (CLS) of 0.301 (poor is above 0.25); phone 0. Cause: the hero chose between the short poster hero and the very tall 3D hero only after the site settings arrived from the API, so the page jumped when they did. Fix: `useHeroMode` no longer waits for the setting (it uses the last value this browser saw, otherwise the default, on). Re-run `npm run e2e` and read `e2e/results/metrics-desktop.json`; the home `cls` should now be well under 0.1. Not yet measured after the fix.
Page weight (desktop home 11.8 MB, phone 4.8 MB) was measured on the development server, which serves unminified code and the full 3D library, so it says little about production. Measure a production build as described above before judging it.
