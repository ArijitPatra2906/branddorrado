# BrandDorrado API

Base: `/api`. Success: `{ data, meta? }`. Error: `{ error: { code, message, fields? } }`. Lists accept `page` (default 1) and `limit`.

## Public (no auth, cached 60s)
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness + DB ping |
| GET | `/site-settings/public` | public projection only |
| GET | `/services`, `/services/:slug` | published only |
| GET | `/projects?industry=&q=&featured=&page=&limit=` | published only; returns `meta.total` |
| GET | `/projects/industries`, `/projects/:slug` | detail includes gallery + services |
| GET | `/testimonials` | published AND approved only |
| GET | `/pricing` | `available` packages only |
| GET | `/blog?category=&q=&page=`, `/blog/by-category?perCategory=`, `/blog/categories`, `/blog/:slug` | published, publish date not in the future |
| GET | `/enquiry-options` | budgets, timelines, etc. |
| POST | `/enquiries` (alias `/contact`) | 6 per 15 min per IP, honeypot, dedupe |
| GET | `/sitemap.xml` (at server root, not under /api) | |

## Auth
`GET /auth/setup-status` → `{needsSetup}`.
`POST /auth/setup` {name,email,password} → creates the **one** super admin (409 once it exists; DB partial unique index enforces it). Requires `ADMIN_SETUP_SECRET`; refused in production if that is not configured.
`POST /auth/login` {email,password} → sets HTTP-only `bd_session` cookie, returns `{user, csrfToken}` (10 failed attempts / 15 min / IP).
`GET /auth/me` → current user (role + effective permissions) + CSRF token. `POST /auth/logout` (revokes the session). `POST /auth/change-password` (own password; ends all own sessions).

## Roles and permissions
- `super_admin`: exactly one. Full access, plus Team and Activity. Cannot be restricted, deactivated or deleted.
- `admin`: created by the super admin. Full access to every content area by default, or limited to chosen areas: `enquiries, projects, services, testimonials, pricing, blog, settings`. Permissions are re-read from the database on every request, so changes apply immediately. Deactivating an admin or resetting their password signs them out at once.

## Admin (`/admin/*`)
Every request needs the session cookie. Non-GET requests also need an allow-listed `Origin` and the `X-CSRF-Token` header. Every state-changing request (and every permission denial) is written to the activity log.

| Method | Path | Needs |
|---|---|---|
| GET | `/admin/dashboard` | any admin (enquiry figures only with `enquiries`) |
| GET | `/admin/enquiries?q=&status=&service=&budget=&from=&to=&page=`, `/export.csv`, `/:id` | `enquiries` |
| PATCH / DELETE | `/admin/enquiries/:id` | `enquiries` |
| POST | `/admin/enquiries/:id/notes`, `/:id/retry-email` | `enquiries` |
| GET/POST, GET/PATCH/DELETE | `/admin/{services,projects,testimonials,pricing,blog}` and `/:id`. PATCH merges onto the stored record. | the matching area |
| GET | `/admin/service-options` | `projects` |
| GET/PATCH | `/admin/settings` | `settings` |
| GET/POST, PATCH | `/admin/team`, `/admin/team/:id` (name, active, permissions, password) | super admin |
| GET | `/admin/activity?userId=&entity=&page=` | super admin |

### Password reset (public, rate limited)
- `POST /api/auth/forgot-password` `{ email }`: always returns `{ data: { ok: true } }` whether or not the email exists. If it belongs to an active admin, a single-use link (30 min, max one email per minute) is sent to `<CLIENT_URL>/admin/reset-password#token=...`. 5 requests per 15 minutes per IP.
- `POST /api/auth/reset-password` `{ token, newPassword }` (6+ chars with upper, lower, number and special character): sets the password, marks the token used and signs out all of that admin's sessions. `400 invalid_token` if the link is invalid, used or expired.

### Uploads (admin, needs the Projects or Blog permission, CSRF token required)
- `POST /api/admin/uploads/image`: multipart field `files` (up to 4 JPG/PNG/WebP/GIF/AVIF per request, 250 MB each) -> `201 { data: { files: [{ url, name, kind }] } }`.
- `POST /api/admin/uploads/video`: multipart field `files` (one MP4/WebM/MOV/OGV, 500 MB) -> same shape.
- `GET /media/<name>`: public, cacheable, streams an uploaded file from the Turso `media` table (not under `/api`; supports `Range`).

### Work by category (public)
- `GET /api/projects/by-category?perCategory=5` -> `{ data: [{ category, total, items: [project cards incl. videoUrl] }] }`, categories in alphabetical order. Project cards in `GET /api/projects` also include `videoUrl`. A project's `industry` field is its category and is required.
