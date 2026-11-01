import { useEffect } from 'react';
// Per-page title, description, canonical and Open Graph tags. In a client-rendered SPA these are applied after JS runs;
// see README "SEO" for the prerendering note (crawlers that don't run JS will only see index.html).
function setMeta(attr, key, value) {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.content = value;
}
// Breadcrumb structured data from the same items the page shows ([{ label, to }]); `to` is a path, the last item has none.
export const breadcrumbJsonLd = (items) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, ...(it.to ? { item: new URL(it.to, window.location.origin).toString() } : {}) })),
});
export function usePageMeta(title, description, opts = {}) {
    const jsonLdKey = JSON.stringify(opts.jsonLd ?? null); // a stable value to watch, so the effect re-runs only when the data really changes
    useEffect(() => {
        const full = title.includes('BrandDorrado') ? title : `${title} | BrandDorrado`;
        document.title = full;
        const desc = description ?? 'Strategy, storytelling and digital experiences for ambitious brands.';
        setMeta('name', 'description', desc);
        setMeta('property', 'og:title', full);
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:type', 'website');
        setMeta('property', 'og:url', window.location.href.split('#')[0]);
        if (opts.image)
            setMeta('property', 'og:image', opts.image.startsWith('http') ? opts.image : new URL(opts.image, window.location.origin).toString());
        setMeta('name', 'twitter:card', opts.image ? 'summary_large_image' : 'summary');
        setMeta('name', 'twitter:title', full);
        setMeta('name', 'twitter:description', desc);
        setMeta('name', 'robots', opts.noindex ? 'noindex, nofollow' : 'index, follow');
        // Structured data: only what the page really knows (see the page files for what is passed in).
        document.head.querySelectorAll('script[data-page-jsonld]').forEach((n) => n.remove());
        for (const obj of [JSON.parse(jsonLdKey)].flat().filter(Boolean)) {
            const tag = document.createElement('script');
            tag.type = 'application/ld+json';
            tag.dataset.pageJsonld = '1';
            tag.textContent = JSON.stringify(obj).replace(/</g, '\\u003c');
            document.head.appendChild(tag);
        }
        let link = document.head.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = window.location.origin + window.location.pathname;
            return () => document.head.querySelectorAll('script[data-page-jsonld]').forEach((n) => n.remove());
    }, [title, description, opts.noindex, opts.image, jsonLdKey]);
}
