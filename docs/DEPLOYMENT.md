# Deployment guide

Frontend and backend deploy separately. The database (Turso) and email (Resend) are hosted services.

| Part | Suggested host | Notes |
|---|---|---|
| Client (`client/`) | Vercel or Netlify | Static build, `npm run build`, output `client/dist` |
| API (`server/`) | Render, Railway, Fly.io or any Node 20+ host | Long-running process, `npm start` |
| Database | Turso Cloud | libSQL, SQLite compatible |
| Email | Resend | Verified sending domain required |

## 1. Turso database
1. Install the CLI and sign in: `turso auth login`.
2. Create the database: `turso db create branddorrado`.
3. Get the URL: `turso db show branddorrado --url` (looks like `libsql://branddorrado-<org>.turso.io`).
4. Create a token: `turso db tokens create branddorrado`. Treat it as a password.
5. Put both in the API host's environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`). Never in the client.
6. Create the tables once from your machine, with those two values set in `server/.env`: `npm run db:push`, then `npm run seed`.
7. Backups: Turso keeps point-in-time restore on paid plans; on any plan take a dump regularly (`turso db shell branddorrado .dump > backup.sql`) and store it somewhere private. Customer enquiries are personal data.

## 2. Resend
1. Add and verify your sending domain in Resend, then add the SPF, DKIM and DMARC DNS records it shows.
2. Create an API key limited to sending.
3. Set `RESEND_API_KEY`, `BRAND_EMAIL_FROM` (for example `BrandDorrado <hello@yourdomain.com>`) and `BRAND_LEAD_EMAIL_TO` (the inbox that receives new enquiries).
4. Until these are set, enquiries are still saved and marked "failed" for email; the admin Enquiries page has a retry button.

## 3. API host
Build command: `npm install`. Start command: `npm start` (from the repo root; it runs the server workspace). Health check path: `/api/health`.

Required environment variables (see `server/.env.example`):

```
NODE_ENV=production
PORT=                       # most hosts set this for you
CLIENT_URL=https://www.yourdomain.com
CLIENT_URLS=                # extra allowed origins, comma separated (optional)
PUBLIC_SITE_URL=https://www.yourdomain.com
PUBLIC_API_URL=https://api.yourdomain.com
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
RESEND_API_KEY=...
BRAND_EMAIL_FROM=...
BRAND_LEAD_EMAIL_TO=...
SESSION_SECRET=             # 32+ random characters: openssl rand -base64 48
COOKIE_DOMAIN=.yourdomain.com
ADMIN_SETUP_SECRET=         # must be set before the first-admin setup is allowed in production
```

The server refuses to start with a clear message if a required value is missing or `TURSO_DATABASE_URL` is not a `libsql://` URL in production.

Put the API on a subdomain of the same registrable domain as the site (for example `api.yourdomain.com` and `www.yourdomain.com`) and set `COOKIE_DOMAIN`. Sign-in cookies are HTTP-only, `Secure` and `SameSite=None` in production, so both must be served over HTTPS.

If you use a proxy or CDN, allow request bodies up to 500 MB and long request times on `/api/admin/uploads`.

## 4. Client host
Root directory `client`, build command `npm run build`, output `dist`. Environment variable:

```
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

Add a rewrite so every path serves `index.html` (single-page app). Vercel: `vercel.json` with `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`. Netlify: a `_redirects` file containing `/* /index.html 200`.

### SEO and prerendering
The client is a Vite single-page app, so on its own every address would serve the same `index.html`. The build therefore runs `client/scripts/prerender.mjs` after `vite build`. It reads the API's `/sitemap.xml`, and for every public address (including each published service, project and article) writes a copy of the page with its own title, description, canonical link, Open Graph and Twitter tags and structured data (Organization, BreadcrumbList, Service, CreativeWork, BlogPosting), plus a plain-text `<noscript>` summary. It also writes `dist/sitemap.xml` and `dist/robots.txt` with your real domain. The React app still renders the full page in the browser. This is meta-level prerendering, not full server-side rendering: crawlers that do not run JavaScript get correct titles, previews and a text summary, not the full page body.

Set these for the client build on your host (they are read at build time, are not secrets, and are not bundled into the site):
```
VITE_API_BASE_URL=https://api.yourdomain.com/api
SITE_URL=https://www.yourdomain.com
PRERENDER_API_URL=https://api.yourdomain.com/api    # optional, defaults to VITE_API_BASE_URL
PRERENDER_STRICT=true                               # fail the build instead of skipping content if the API is unreachable
```
The API must be running and reachable when the client builds. Published content that is added later is only prerendered at the next build, so trigger a rebuild (a deploy hook on Vercel or Netlify) after publishing new services, projects or articles. Until then those pages still work in the browser, only their link previews fall back to the generic title.
`client/vercel.json` and `client/public/_redirects` provide the single-page-app fallback for Vercel and Netlify; prerendered files are served first.

## 5. First administrator
Open `https://www.yourdomain.com/admin` right after the first deploy. On an empty database you are taken to `/admin/setup` to create the single super admin. Do this immediately: whoever completes it first owns the account. The setup is refused if `ADMIN_SETUP_SECRET` is not set on the server.

## 6. After going live
- Enter the real WhatsApp number, public email, social links and verified statistics in Admin, Settings.
- Replace demonstration projects with real, approved work. Demonstration items are marked and never published automatically.
- Run `npm run audit:prod` and review the result.
- Send a test enquiry and confirm both emails arrive.
- Load test on a staging copy, not production: `npx autocannon -c 100 -d 20 https://staging-api.yourdomain.com/api/projects`. The default limit of 600 requests a minute per address will return 429 for a single-machine test unless `API_RATE_LIMIT` is raised on staging. Remove that override afterwards.

## Troubleshooting
- Sign-in works locally but not in production: check HTTPS on both hosts, `CLIENT_URL` exactly matches the site origin, and `COOKIE_DOMAIN` is set.
- CORS errors: the site origin must be in `CLIENT_URL` or `CLIENT_URLS`, with no trailing slash.
- Uploaded photos do not show: `PUBLIC_API_URL` must be the API's public https address.
- Emails not arriving: check the domain is verified in Resend, then open the enquiry in Admin and look at the email status.

## Trying the site from a phone or another computer (development only)
1. Find the computer's network address (macOS: System Settings, Wi-Fi, Details; it looks like `192.168.1.20`).
2. Start both servers as usual (`npm run dev:server`, `npm run dev:client`). The dev site listens on the network.
3. On the other device open `http://192.168.1.20:5173`. The site finds the API at the same address on port 4000 by itself, and links to uploaded photos and videos are adjusted to match.
4. If it does not load, allow incoming connections for Node in the computer's firewall, and check both devices are on the same Wi-Fi.
This only works outside production. In production only the addresses in `CLIENT_URL` and `CLIENT_URLS` are accepted.
