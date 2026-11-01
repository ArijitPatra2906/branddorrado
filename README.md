# BrandDorrado

## Phase 6 status (validation)
Added in this phase: backend tests (Vitest + Supertest, `server/test/`), frontend tests (Vitest + React Testing Library, `client/test/`), `docs/DEPLOYMENT.md`, `docs/ADMIN_GUIDE.md`.
**Test results (run by the project owner on their machine): server 45/45 passed, client 21/21 passed.** Run them with `npm test` from the repo root (or `npm run test:server`, `npm run test:client`).
Backend tests use a throw-away local database file (`server/test.db`, created and deleted automatically) and a mocked Resend; they never touch Turso Cloud or send real email.
The root `package.json` pins `react` and `react-dom` to 18.3.1 with npm `overrides`; without it npm installed a second copy of React 19 and the component tests failed.
Added after that (written, **not yet run**): prerendering of public pages for SEO (`client/scripts/prerender.mjs`, verified only against a fake API), a Playwright browser suite for layout at phone/tablet/desktop widths, reduced motion, WebGL off and page-load measurements (`e2e/`), more unit tests (`client/test/pages.test.jsx`), and ESLint (`npm run lint`). See `docs/TESTING.md` for how to run each and where to record results.
Still open from the master prompt, because they need a real browser, network, or your own assets: running the Playwright suite and recording its numbers (`docs/TESTING.md`), tuning the 3D hero by eye and replacing the poster with a render of it (`docs/MOTION.md`), a lighter 3D scene or image sequence for tablet and phone (they use the poster hero today), `npm run audit:prod` results, and real client photos, testimonials and verified statistics from the agency. The project is JavaScript, so there is no type-check step (the prompt allows JavaScript or TypeScript).

Full-stack agency site. React + Vite (client), Express + Drizzle ORM on Turso (server).

## Phase 2 status
Done: monorepo, design tokens, logo assets, env validation, Turso connection, full schema, error handling, health endpoint.
Not yet run: dependencies were not installed in the build sandbox (no network), so nothing here has been compiled or tested.

## Phase 3 status
Built: header (desktop + accessible mobile menu), footer, skip link, hash/scroll handling, and the eight homepage sections in the specified order
(hero, services, work, process, about, testimonials, final CTA; footer in layout). Public read API: `GET /api/site-settings/public`, `/api/services`,
`/api/projects`, `/api/testimonials`. Idempotent `npm run seed` adds the five services, draft demo projects (never published) and the settings row.
Stats, testimonials and projects stay hidden/empty until real, verified data is added. Showreel button only appears when a valid https YouTube, Vimeo or mp4 URL is configured.
Placeholders by design: `/contact` shows real contact channels only (the enquiry form and POST /api/enquiries are Phase 4); /services, /work, /about, /pricing, /blog,
/privacy-policy, /terms render a "Coming soon" page so navigation never breaks. Syntax-checked only; not installed, compiled or run (no network in the build sandbox).

## Phase 4 status (in progress): brand name fix + enquiry system
Fixed: the brand name was missing from the home hero. The home header now shows the BrandDorrado logo (centred between the nav groups on xl screens, left on mobile),
lg screens (1024-1279px) show it above "WE" in the hero copy, and the h1 carries "BrandDorrado:" for screen readers. A trimmed copy of the supplied horizontal logo
(`client/public/logos/wordmark-dark.png`, same artwork, transparent margin removed) is used so it renders at a sensible size.
Built: `POST /api/enquiries` (alias `/api/contact`), `GET /api/enquiry-options`, server-side Zod validation, phone/email/URL normalisation, honeypot, 6 submissions per 15 min per IP,
10-minute duplicate detection, enquiry saved first, then Resend emails (agency notification, then customer acknowledgement only after the agency email succeeds),
`email_attempts` log (codes and provider ids only), a 5-minute retry sweep for unsent emails, and the React Hook Form + Zod enquiry form on `/contact` (prefill via `?service=slug&package=slug`).
Not yet built: pricing/blog/service/work pages and their APIs, admin authentication and dashboard, tests. Nothing here has been installed, compiled or run; only a syntax check was done.
Note: this repo uses Turso/Drizzle (SQLite), not MongoDB as the master prompt specifies; the schema was already built that way in Phase 2.
Resend setup: verify your sending domain in Resend, set `RESEND_API_KEY`, `BRAND_EMAIL_FROM` (e.g. `BrandDorrado <hello@yourdomain.com>`) and `BRAND_LEAD_EMAIL_TO`. Without them enquiries are still saved and marked `failed` for retry.
Run `npm install` again from the root (adds resend, express-rate-limit, react-hook-form, zod, @hookform/resolvers).


## Phase 5 status: public pages, content APIs, admin (written, NOT yet run)
Built: all public routes (`/services`, `/services/:slug`, `/work` with industry filter, search and pagination, `/work/:slug`, `/about`, `/pricing`, `/blog` with categories and pagination, `/blog/:slug`, `/privacy-policy`, `/terms`);
safe Markdown rendering (no HTML injection); per-page title/description/canonical/Open Graph; `GET /sitemap.xml`; `robots.txt` (blocks `/admin`).
Admin at `/admin`: login (bcrypt, HTTP-only session cookie, session stored hashed, CSRF header + Origin check, login rate limit), overview with real counts, enquiry management
(search/filter/status/follow-up/notes/CSV/retry emails/delete), CRUD for services, projects, testimonials, pricing and blog, and site settings (including verified statistics and the legal pages).
API reference: `docs/API.md`.

### Admin accounts (super admin + admins)
There is no CLI and no seeded account. On a fresh database, open `/admin`: you are sent to `/admin/setup` to create the **super admin** inside the app. This can happen once only: afterwards the page redirects to sign-in and the API returns 409, and a database unique index makes a second super admin impossible.
`ADMIN_SETUP_SECRET` is stored by the developer in `server/.env`; nobody types it into the app (the setup form and the Team page never ask for it). In production, setup is refused until it is set. Run the setup right after deploying, because whoever opens `/admin/setup` first on a fresh deployment creates the super admin.
- **Password rule (super admin and every admin):** at least 6 characters, including an uppercase letter, a lowercase letter, a number and a special character.
- The super admin can do everything, sees the **Team** page (add admins, choose their access, deactivate, reset passwords) and the **Activity** page (every change by every admin, filterable by person and area).
- Admins you create can do all administrative tasks by default. To have an admin handle only certain work, choose "Only specific areas" (enquiries, projects, services, testimonials, pricing, blog, settings). Changes apply immediately.
- **Forgotten password:** every admin (including the super admin) can use *Forgot your password?* on the sign-in page. A single-use link (valid 30 minutes) is emailed through Resend, so `RESEND_API_KEY` and `BRAND_EMAIL_FROM` must be configured. After upgrading, run `npm run db:push` in `server` to create the `password_resets` table. If email is not configured, the super admin can still set a new password for any admin on the Team page.
- Admins can change their own password under **My account**. Admins are deactivated rather than deleted so the activity history stays intact.
- The activity log stores who did what and when, with field names and content titles only (no passwords, no customer details).
If you ran an earlier build, delete any admin rows made with the old `owner`/`editor` roles, then `npm run db:push` (adds `permissions`, `created_by`, the `activity_log` table and the unique index).
Run `npm install` from the root (adds bcryptjs); re-run `npm run seed` to add the hidden placeholder pricing packages.

### Not done yet (be aware)
- **Nothing in this phase has been installed, compiled, run or tested.** The build sandbox has no network. Only a JavaScript syntax check was run.
- **No automated tests** (the master prompt requires Vitest + Supertest/RTL). None were written or run.
- **No media upload.** Images and videos are entered as URLs (host them on Cloudinary/S3). Upload endpoints with type/size validation are not built.
- Admin can't manage team members, budget/timeline options (still in `server/src/lib/enquiryOptions.js`), or blog categories as separate records (category is a text field).
- SEO: this is a client-rendered Vite SPA, so crawlers that don't run JavaScript see only `index.html`. Prerender the public routes (e.g. a prerender step or SSR) before relying on search traffic.
- Cookie auth across two domains in production needs HTTPS and `SameSite=None` (already set when `NODE_ENV=production`); safest is to serve API and site from subdomains of one domain and set `COOKIE_DOMAIN`.
- Footer links and enquiry form from earlier phases were not modified.

## Install (important)
This is an npm workspace: run `npm install` ONCE from the repository root, never inside `client/` or `server/`.
If you already did, run `npm run clean` first, then `npm install`.
npm may warn that esbuild's install script was blocked; if Vite, or drizzle-kit then complain about esbuild, run
`npm install-scripts approve esbuild && npm rebuild esbuild`. `fsevents` can stay blocked.
Do not use `npm audit fix --force`; check production exposure with `npm run audit:prod`.

## Hero (matches the design reference)
Home uses a transparent header laid out like the reference (HOME / SERVICES / WORK / ABOUT on the left, PRICING / BLOG / CONTACT and an outlined "Start a Project" button on the right).
Every other page keeps the full header with the logo. The hero artwork is `client/public/hero/hero-art.jpg`, cut from the supplied layout image (sculpture, arch, pedestal, light).
It is only ~1365px wide, so swap in a higher-resolution or licensed original when you have one: replace the file, or set `hero.imageUrl` in site settings.
The "Watch Showreel" button opens the video modal once a valid https YouTube, Vimeo or mp4 URL is configured; until then it links to /work.
The stats strip only renders when verified figures exist. To show the figures from the reference (only if they are true), run `npm -w server run seed -- --reference-stats`.

## Hero motion / 3D
The home hero is a scroll-driven 3D BrandDorrado monogram on desktop (WebGL), with the static layout-matched hero as fallback. Details, switches and the open verification list are in `docs/MOTION.md`.
After pulling this version run `npm install` from the repo root (adds three, @react-three/fiber, @react-three/drei, gsap). Disable with `VITE_ENABLE_3D=false` in `client/.env`.

## Run locally
    npm install
    cp server/.env.example server/.env   # set SESSION_SECRET to 32+ random characters
    cp client/.env.example client/.env
    npm run db:push                      # REQUIRED before seeding: creates the tables
    npm run seed                         # services + settings row (safe to re-run)
    npm run dev:server                   # http://localhost:4000/api/health
    npm run dev:client                   # http://localhost:5173


## Photos and videos (uploads from the admin portal)

Photos and videos are chosen from the admin's own computer in **Admin → Projects** (cover image, gallery photos, project video, and photos/videos inside the case study) and **Admin → Blog** (featured image, and photos/videos inside the article with the *Insert photo* / *Insert video* buttons). Nothing needs to be uploaded elsewhere first.

- Allowed: JPG, PNG, WebP, GIF, AVIF photos up to 250 MB each; MP4, WebM, MOV or OGV videos up to 500 MB. Uploads are staged in the server's temp folder (free several GB there) and streamed into Turso in 1 MB pieces, so memory use stays small. Behind a proxy or CDN, raise its request-body limit to at least 500 MB for `/api/admin/uploads` and allow long request times; the Node server allows 15 minutes per request. The real file type is checked on the server, not just the file name.
- **Everything is stored in the Turso database** (table `media`, one row per file). Pages store only a link, `<PUBLIC_API_URL>/media/<id>.<ext>`, which the API streams back out of Turso (with range support so videos can seek). Nothing is written to the server's disk, so uploads survive redeploys.
- Run `npm run db:push` in `server` after upgrading, to create the `media` table.
- **Blog posts now work like Projects.** In `server`, run `npm run db:push` once: it adds the video, external link, featured and sample columns to `blog_posts` and creates `blog_gallery` and `blog_services`. Existing articles keep working; articles with no category appear under "General". Category and short description are now required when saving an article.
- **Production:** set `PUBLIC_API_URL` to the API's public https address.
- Cost and size: files count against your Turso storage and read limits. Keep videos short and compressed; if the library grows large, `server/src/lib/storage.js` and `server/src/routes/media.js` are the only places to change to move files to object storage.
- Removing or replacing a photo in the editor does not delete the old row from the database.
- YouTube or Vimeo links are still accepted for a project video (*Or use a YouTube / Vimeo link*).

## "Our Work": categories, thumbnails and hover-play

- **Categories:** every project must have a category (admin → Projects → *Category*, a required drop-down with an "Add a new category…" option). The "Our Work" section on the homepage and on `/work` is split into one sub-section per category, with jump links at the top and a "View all" link per category. The category must be chosen before photos or videos can be uploaded to that project.
- **Video thumbnails:** if you upload your own *Thumbnail / cover image*, that image is shown. If you upload a video and leave the thumbnail empty, the admin page creates one from the video (in your browser, no extra software) and saves it to the database. If the browser cannot read the video, visitors see the video's first frame instead.
- **Hover to play:** on the website, hovering over (or keyboard-focusing) a project card that has a video plays it silently inside the card, and it stops when the pointer leaves. It does not run on touch screens or for visitors who prefer reduced motion. Uploaded MP4/WebM files and YouTube/Vimeo links are both supported.

## Reliability and heavy traffic

- **Photos and videos:** accepted types are JPG, PNG, WebP, GIF, AVIF photos and MP4, WebM, MOV, OGV videos (the file's real type is checked, so a wrong extension or browser type does not matter). HEIC (iPhone), BMP and MKV files are refused with a message asking for an export to JPG/PNG or MP4/WebM, because browsers cannot show them. Run `npm run db:push` in `server` after upgrading: files are now stored in 1 MB pieces (`media_chunks`), and files uploaded with the earlier version still work.
- **Streaming:** the server reads only the pieces a visitor needs, streams them without loading whole files into memory, retries brief database hiccups, and caps simultaneous database reads, so many people watching videos at once does not overload Turso.
- **Caching:** uploaded files are cacheable for a year (browsers and any CDN keep them). Small photos and file details are also kept in server memory. Public pages' data (services, projects, blog, pricing, settings) is cached on the server for a few seconds, and cleared whenever an admin saves a change.
- **Protection:** each address is limited to 600 API requests a minute (`API_RATE_LIMIT` in `server/.env` changes it), with stricter limits on sign-in, password reset and enquiries. Connection timeouts suit load balancers, shutdowns finish in-flight requests, and a stray error no longer crashes the server.
- **Scaling further:** run two or more copies of the server behind your host's load balancer, and put a CDN (for example Cloudflare) in front of the API address so `/media/` files are served from its edge. The in-memory caches and rate limits are per copy. Turso handles the shared data. Heavy traffic on the website itself is served by the frontend host's CDN.
- **Not load-tested:** none of this has been run under load here. Before launch, try a load test (for example `npx autocannon -c 100 -d 20 http://localhost:4000/api/projects`) on your own machine or staging server.


### Upgrading to the categories and video-ratio build
Run `npm run db:push` once (it adds the `categories` table and the `video_ratio` column on projects and blog posts; existing rows get the default 4:5 card). Then:
- **Categories:** when you type a new category for a project or an article and save, it is stored in the database and appears in the category list of every later project or article (projects and blog have separate lists).
- **Video card size ratio:** every project and article form has a *Video card size ratio* (16:9, 4:3, 1:1, 4:5, 3:4, 9:16). It sets the shape of the card on the website when the item has a video.
- **Horizontal rows:** on the website, each category under *Our Work* and *Our Blog* is one row that scrolls sideways on every screen size.
