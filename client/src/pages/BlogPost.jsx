import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { container } from '../components/Section';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Markdown } from '../components/Markdown';
import { ErrorState, Skeleton } from '../components/feedback/States';
import { breadcrumbJsonLd, usePageMeta } from '../components/seo/usePageMeta';
import { useBlogPost } from '../lib/queries';
import { ApiError } from '../lib/api';
import { parseShowreel, enquiryLink } from '../lib/links';
import { formatDate } from '../lib/format';
import NotFound from './NotFound';
// Same layout as a project page ("Our Work" detail): breadcrumbs, eyebrow, title, gold rule, details row, wide image, content, video, gallery, calls to action.
export default function BlogPost() {
    const { slug = '' } = useParams();
    const { data: a, isLoading, error, refetch } = useBlogPost(slug);
    usePageMeta(a?.seoTitle || a?.title || 'Article', a?.seoDescription || a?.excerpt || undefined, { image: a?.featuredImageUrl, jsonLd: a ? [
        breadcrumbJsonLd([{ label: 'Home', to: '/' }, { label: 'Blog', to: '/blog' }, { label: a.title }]),
        { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, description: a.seoDescription || a.excerpt || undefined,
            ...(a.featuredImageUrl ? { image: a.featuredImageUrl } : {}), ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
            ...(typeof a.author === 'string' && a.author ? { author: { '@type': 'Person', name: a.author } } : {}),
            publisher: { '@type': 'Organization', name: 'BrandDorrado' } },
    ] : undefined });
    if (error instanceof ApiError && error.status === 404)
        return <NotFound />;
    const video = parseShowreel(a?.videoUrl ?? undefined);
    const ext = a?.externalUrl && /^https:\/\//i.test(a.externalUrl) ? a.externalUrl : null;
    return (<article className={`${container} py-16 lg:py-24`}>
      {isLoading && <Skeleton className="h-96"/>}
      {error && !(error instanceof ApiError && error.status === 404) && <ErrorState onRetry={() => refetch()}/>}
      {a && (<>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Blog', to: '/blog' }, { label: a.title }]}/>
        <p className="eyebrow">{a.category ?? 'General'}</p>
        <h1 className="mt-4 max-w-3xl">{a.title}</h1>
        <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
        {a.isDemo && <p className="mt-4 inline-block rounded-full border border-gold/60 px-3 py-1 text-xs uppercase tracking-widest text-gold">Sample article</p>}
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          {a.authorName && <div><dt className="text-cream/55">Author</dt><dd>{a.authorName}</dd></div>}
          {a.publishedAt && <div><dt className="text-cream/55">Published</dt><dd>{formatDate(a.publishedAt)}</dd></div>}
          {a.services?.length > 0 && <div><dt className="text-cream/55">Related services</dt><dd>{a.services.map((s, i) => <span key={s.slug}>{i > 0 && ', '}<Link to={`/services/${s.slug}`} className="hover:text-gold">{s.title}</Link></span>)}</dd></div>}
        </dl>
        {a.featuredImageUrl && <img src={a.featuredImageUrl} alt="" className="mt-10 aspect-[16/9] w-full rounded-card border border-gold/25 object-cover"/>}
        <div className="mt-10 max-w-3xl">
          {a.excerpt && <p className="text-lg text-cream/85">{a.excerpt}</p>}
          <Markdown source={a.content} className="mt-4 text-cream/80"/>
        </div>
        {video && <div className="mt-12 aspect-video overflow-hidden rounded-card border border-gold/25">{video.kind === 'iframe'
                    ? <iframe src={video.src.replace('autoplay=1', 'autoplay=0')} title={`${a.title} video`} className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy"/>
                    : <video src={video.src} poster={a.featuredImageUrl ?? undefined} controls preload="metadata" className="h-full w-full"/>}</div>}
        {a.gallery?.length > 0 && <ul className="mt-12 grid gap-4 sm:grid-cols-2">{a.gallery.map((g) => <li key={g.url}><img src={g.url} alt={g.alt} loading="lazy" className="w-full rounded-card border border-gold/20 object-cover"/></li>)}</ul>}
        <div className="mt-12 flex flex-wrap gap-4">
          <Link to={enquiryLink()} className="btn-gold">Start a Project</Link>
          {ext && <a href={ext} target="_blank" rel="noopener noreferrer" className="btn-outline">Read more <ExternalLink size={14} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>}
          <Link to="/blog" className="btn-outline">More articles</Link>
        </div>
      </>)}
    </article>);
}
