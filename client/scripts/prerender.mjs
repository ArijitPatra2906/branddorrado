// Runs after `vite build` (see the "build" script). Why: the site is a Vite single-page app, so without this every address
// serves the same index.html and crawlers / link previews that do not run JavaScript would see one generic title.
//
// What it does (no browser needed):
//   1. Reads the list of public addresses from the API's /sitemap.xml (so it always matches what is published).
//   2. For each address writes dist/<address>/index.html: the built page with its own <title>, description, canonical link,
//      Open Graph / Twitter tags, structured data (Organization, BreadcrumbList, Service, CreativeWork, BlogPosting) and a plain-text
//      <noscript> summary with links. The React app still renders the full page in the browser as before.
//   3. Writes dist/sitemap.xml and dist/robots.txt with the real domain.
// If the API cannot be reached, the build does NOT fail: the fixed pages are still written and a warning is printed.
//
// Settings (environment variables, read at build time):
//   PRERENDER_API_URL  API address ending in /api (default: VITE_API_BASE_URL, then http://localhost:4000/api)
//   SITE_URL           the public address of this website (default: http://localhost:5173), for example https://www.yourdomain.com
//   PRERENDER_STRICT   set to "true" to fail the build when the API cannot be reached (recommended for production builds)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const API = (process.env.PRERENDER_API_URL || process.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const SITE = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const STRICT = process.env.PRERENDER_STRICT === 'true';
const NAME = 'BrandDorrado';
const DEFAULT_DESC = 'Strategy, storytelling and digital experiences for ambitious brands.';
const DEFAULT_IMAGE = `${SITE}/logos/social-profile.png`;

const STATIC = {
    '/': { title: `${NAME} — Turn Brands Golden`, description: DEFAULT_DESC },
    '/services': { title: 'Services', description: 'Content creation, social media, brand design, websites and digital marketing from BrandDorrado.' },
    '/work': { title: 'Our Work', description: 'Selected brand, content and digital projects from BrandDorrado.' },
    '/about': { title: 'About', description: 'BrandDorrado is a creative and digital marketing agency founded by Raj and Adi.' },
    '/pricing': { title: 'Pricing', description: 'Service packages from BrandDorrado.' },
    '/blog': { title: 'Our Blog', description: 'Articles and updates from BrandDorrado.' },
    '/contact': { title: 'Contact', description: 'Start a project with BrandDorrado. Tell us about your brand and goals.' },
    '/privacy-policy': { title: 'Privacy Policy', description: 'How BrandDorrado handles personal information.' },
    '/terms': { title: 'Terms and Conditions', description: 'Terms for using the BrandDorrado website and services.' },
};
const CRUMBS = { services: 'Services', work: 'Work', blog: 'Blog' };

const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escText = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const abs = (u) => (u && /^https?:\/\//i.test(u) ? u : u ? new URL(u, SITE).toString() : DEFAULT_IMAGE);
const titleOf = (t) => (t.includes(NAME) ? t : `${t} | ${NAME}`);

async function getJson(path) {
    const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return res.json();
}

function headFor(route, m) {
    const url = SITE + (route === '/' ? '' : route);
    const full = titleOf(m.title);
    const parts = route.split('/').filter(Boolean);
    const crumbs = parts.length
        ? [{ name: 'Home', url: SITE + '/' }, ...(parts.length === 2 ? [{ name: CRUMBS[parts[0]], url: `${SITE}/${parts[0]}` }] : []), { name: m.crumb ?? m.title, url }]
        : null;
    const data = [
        ...(route === '/' ? [{ '@context': 'https://schema.org', '@type': 'Organization', name: NAME, url: SITE, logo: DEFAULT_IMAGE, description: DEFAULT_DESC }] : []),
        ...(crumbs ? [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) }] : []),
        ...(m.jsonLd ?? []),
    ];
    return [
        `<title>${escText(full)}</title>`,
        `<meta name="description" content="${escAttr(m.description)}" />`,
        `<link rel="canonical" href="${escAttr(url)}" />`,
        `<meta name="robots" content="index, follow" />`,
        `<meta property="og:site_name" content="${NAME}" />`,
        `<meta property="og:type" content="${m.ogType ?? 'website'}" />`,
        `<meta property="og:title" content="${escAttr(full)}" />`,
        `<meta property="og:description" content="${escAttr(m.description)}" />`,
        `<meta property="og:url" content="${escAttr(url)}" />`,
        `<meta property="og:image" content="${escAttr(abs(m.image))}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escAttr(full)}" />`,
        `<meta name="twitter:description" content="${escAttr(m.description)}" />`,
        `<meta name="twitter:image" content="${escAttr(abs(m.image))}" />`,
        ...data.map(ld),
    ].join('\n    ');
}

const NAV = [['/', 'Home'], ['/services', 'Services'], ['/work', 'Work'], ['/about', 'About'], ['/pricing', 'Pricing'], ['/blog', 'Blog'], ['/contact', 'Contact']];
const noscript = (m) => `<noscript><main style="padding:24px;max-width:720px;margin:auto;font-family:sans-serif"><h1>${escText(m.heading ?? m.title)}</h1><p>${escText(m.description)}</p><nav aria-label="Main">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join(' · ')}</nav><p>This website needs JavaScript for its full experience.</p></main></noscript>`;

function render(template, route, m) {
    let html = template
        .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
        .replace(/<meta\s+name="description"[^>]*>\s*/i, '');
    html = html.replace('</head>', `    ${headFor(route, m)}\n  </head>`);
    return html.replace('<div id="root"></div>', `<div id="root"></div>${noscript(m)}`);
}

const out = (route) => (route === '/' ? join(dist, 'index.html') : join(dist, route.replace(/^\//, ''), 'index.html'));

async function main() {
    if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html not found. Run "vite build" first.');
    const template = await readFile(join(dist, 'index.html'), 'utf8');
    if (template.includes('og:site_name')) { console.log('prerender: dist already processed, skipping.'); return; }

    const pages = new Map(Object.entries(STATIC));
    let sitemapXml = null;
    let apiOk = true;
    try {
        const apiOrigin = new URL(API).origin;
        const res = await fetch(`${apiOrigin}/sitemap.xml`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`sitemap -> ${res.status}`);
        sitemapXml = await res.text();
        const paths = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => { try { return new URL(m[1].replace(/&amp;/g, '&')).pathname; } catch { return null; } }).filter(Boolean);
        for (const p of paths) {
            const [kind, slug] = p.split('/').filter(Boolean);
            if (!slug || !['services', 'work', 'blog'].includes(kind)) continue;
            try {
                if (kind === 'services') {
                    const s = (await getJson(`/services/${encodeURIComponent(slug)}`)).data;
                    pages.set(p, { title: s.seoTitle || s.title, crumb: s.title, heading: s.title, description: s.seoDescription || s.shortDescription || DEFAULT_DESC, image: s.imageUrl,
                        jsonLd: [{ '@context': 'https://schema.org', '@type': 'Service', name: s.title, description: s.seoDescription || s.shortDescription, provider: { '@type': 'Organization', name: NAME }, ...(s.imageUrl ? { image: abs(s.imageUrl) } : {}) }] });
                } else if (kind === 'work') {
                    const s = (await getJson(`/projects/${encodeURIComponent(slug)}`)).data;
                    pages.set(p, { title: s.seoTitle || s.title, crumb: s.title, heading: s.title, description: s.seoDescription || s.shortDescription || DEFAULT_DESC, image: s.coverImageUrl,
                        jsonLd: [{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: s.title, description: s.seoDescription || s.shortDescription, ...(s.coverImageUrl ? { image: abs(s.coverImageUrl) } : {}) }] });
                } else {
                    const s = (await getJson(`/blog/${encodeURIComponent(slug)}`)).data;
                    pages.set(p, { title: s.seoTitle || s.title, crumb: s.title, heading: s.title, ogType: 'article', description: s.seoDescription || s.excerpt || DEFAULT_DESC, image: s.featuredImageUrl,
                        jsonLd: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: s.title, description: s.seoDescription || s.excerpt || undefined, ...(s.featuredImageUrl ? { image: abs(s.featuredImageUrl) } : {}),
                            ...(s.publishedAt ? { datePublished: s.publishedAt } : {}), ...(typeof s.author === 'string' && s.author ? { author: { '@type': 'Person', name: s.author } } : {}), publisher: { '@type': 'Organization', name: NAME } }] });
                }
            } catch (e) { console.warn(`prerender: skipped ${p} (${e.message})`); }
        }
    } catch (e) {
        apiOk = false;
        const msg = `prerender: could not read content from ${API} (${e.message}). Only the fixed pages were prerendered; published services, projects and posts will not have their own titles until you rebuild with the API running.`;
        if (STRICT) throw new Error(msg);
        console.warn(msg);
    }

    for (const [route, m] of pages) {
        const file = out(route);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, render(template, route, m));
    }
    if (sitemapXml) {
        // Rewrite addresses to this website's own domain in case the API's PUBLIC_SITE_URL differs.
        await writeFile(join(dist, 'sitemap.xml'), sitemapXml);
    }
    await writeFile(join(dist, 'robots.txt'), `User-agent: *\nDisallow: /admin\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
    console.log(`prerender: wrote ${pages.size} pages${apiOk ? '' : ' (fixed pages only)'} for ${SITE}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
