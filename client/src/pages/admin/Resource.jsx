import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminGet, adminSend } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { CategoryField, BLOG_CATEGORIES } from '../../components/admin/CategoryField';
import { RatioField } from '../../components/admin/RatioField';
import { GalleryField, MarkdownField, MediaField } from '../../components/admin/MediaField';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/Toast';
import { ErrorState, Skeleton } from '../../components/feedback/States';
const toForm = (cfg, item) => {
    const f = { ...cfg.defaults };
    if (!item)
        return f;
    for (const fld of cfg.fields) {
        const v = item[fld.key];
        if (fld.type === 'lines')
            f[fld.key] = (v ?? []).join('\n');
        else if (fld.type === 'pairs')
            f[fld.key] = (v ?? []).map((p) => `${p[fld.a]} | ${p[fld.b]}`).join('\n');
        else if (fld.type === 'money')
            f[fld.key] = v == null ? '' : String(v / 100);
        else if (fld.type === 'date')
            f[fld.key] = v ? String(v).slice(0, 10) : '';
        else if (fld.type === 'services' || fld.type === 'gallery')
            f[fld.key] = v ?? [];
        else
            f[fld.key] = v ?? (fld.type === 'checkbox' ? false : '');
    }
    return f;
};
const fromForm = (cfg, f) => {
    const out = {};
    for (const fld of cfg.fields) {
        const v = f[fld.key];
        if (fld.type === 'lines')
            out[fld.key] = String(v ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
        else if (fld.type === 'pairs')
            out[fld.key] = String(v ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [x, ...rest] = l.split('|'); return { [fld.a]: x.trim(), [fld.b]: rest.join('|').trim() }; });
        else if (fld.type === 'number')
            out[fld.key] = v === '' || v == null ? (fld.nullable ? null : 0) : Number(v);
        else if (fld.type === 'money')
            out[fld.key] = v === '' || v == null ? null : Math.round(Number(v) * 100);
        else if (fld.type === 'date')
            out[fld.key] = v || null;
        else if (fld.type === 'gallery')
            out[fld.key] = (v ?? []).filter((g) => g.url).map((g) => ({ url: g.url, alt: (g.alt ?? '').trim() }));
        else if (fld.type === 'ratio')
            out[fld.key] = v || '4:5';
        else if (fld.type === 'image' || fld.type === 'video')
            out[fld.key] = v || null;
        else
            out[fld.key] = v;
    }
    return out;
};
export default function Resource({ cfg }) {
    const qc = useQueryClient();
    const toast = useToast();
    const key = ['admin-res', cfg.path];
    const { data, isLoading, isError, refetch } = useQuery({ queryKey: key, queryFn: () => adminGet(`/admin/${cfg.path}`) });
    // Categories saved earlier (database) for the category list of this form.
    const hasCategory = cfg.fields.some((f) => f.type === 'category');
    const { data: savedCategories } = useQuery({ queryKey: ['admin-categories', cfg.path], queryFn: () => adminGet(`/admin/categories/${cfg.path}`), enabled: hasCategory });
    const needsServices = cfg.fields.some((f) => f.type === 'services');
    const { data: svc } = useQuery({ queryKey: ['admin-service-options'], queryFn: () => adminGet('/admin/service-options'), enabled: needsServices });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [toDelete, setToDelete] = useState(null);
    const open = (it) => { setEditing(it); setForm(toForm(cfg, it === 'new' ? undefined : it)); setFieldErrors({}); };
    const done = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); };
    const onErr = (x) => {
        if (x instanceof ApiError && x.fields?.length) {
            setFieldErrors(Object.fromEntries(x.fields.map((f) => [f.path, f.message])));
            toast('err', 'Please fix the highlighted fields.');
        }
        else
            toast('err', x instanceof ApiError ? x.message : 'Something went wrong.');
    };
    const save = useMutation({
        mutationFn: () => editing === 'new' ? adminSend('POST', `/admin/${cfg.path}`, fromForm(cfg, form)) : adminSend('PATCH', `/admin/${cfg.path}/${editing.id}`, fromForm(cfg, form)),
        onSuccess: () => { toast('ok', `${cfg.singular} saved.`); setEditing(null); done(); }, onError: onErr,
    });
    const del = useMutation({ mutationFn: (id) => adminSend('DELETE', `/admin/${cfg.path}/${id}`), onSuccess: () => { toast('ok', `${cfg.singular} deleted.`); done(); }, onError: onErr });
    const submit = (e) => { e.preventDefault(); if (!save.isPending) {
        setFieldErrors({});
        save.mutate();
    } };
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const cell = (it, k) => { const v = it[k]; return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v == null ? '' : String(v).slice(0, 60); };
    const serviceOptions = useMemo(() => svc ?? [], [svc]);
    if (editing)
        return (<form onSubmit={submit} noValidate className="max-w-3xl">
      <h1 className="!text-4xl">{editing === 'new' ? `New ${cfg.singular.toLowerCase()}` : `Edit ${cfg.singular.toLowerCase()}`}</h1>
      <div className="mt-6 space-y-5">
        {cfg.fields.map((f) => {
                const id = `f-${f.key}`;
                const err = fieldErrors[f.key];
                const locked = f.requires && !form[f.requires] ? f.lockMsg : '';
                const common = { id, 'aria-invalid': !!err || undefined, 'aria-describedby': err ? `${id}-err` : undefined };
                return (<div key={f.key}>
              {f.type === 'checkbox'
                        ? <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-[#C89A3C]" {...common}/>{f.label}</label>
                        : <label className="label" htmlFor={id}>{f.label}{'required' in f && f.required && ' *'}</label>}
              {(f.type === 'text' || f.type === 'url' || f.type === 'date') && <input {...common} type={f.type === 'date' ? 'date' : 'text'} className="field" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.type === 'url' ? 'https://… or /path' : undefined}/>}
              {f.type === 'category' && <CategoryField id={id} presets={f.presets} saved={savedCategories ?? []} value={form[f.key]} onChange={(v) => set(f.key, v)} describedBy={common['aria-describedby']} invalid={!!err}/>}
              {f.type === 'ratio' && <RatioField id={id} value={form[f.key]} onChange={(v) => set(f.key, v)} describedBy={common['aria-describedby']}/>}
              {f.type === 'image' && <MediaField id={id} kind="image" locked={locked} value={form[f.key]} onChange={(v) => set(f.key, v)} describedBy={common['aria-describedby']}/>}
              {f.type === 'video' && <MediaField id={id} kind="video" allowLink locked={locked} thumbnail={f.thumbnailKey ? { has: !!form[f.thumbnailKey], set: (u) => set(f.thumbnailKey, u) } : null} value={form[f.key]} onChange={(v) => set(f.key, v)} describedBy={common['aria-describedby']}/>}
              {f.type === 'gallery' && <GalleryField id={id} locked={locked} value={form[f.key]} onChange={(v) => set(f.key, v)}/>}
              {f.type === 'markdown' && <MarkdownField id={id} locked={locked} rows={f.rows ?? 10} value={form[f.key]} onChange={(v) => set(f.key, v)} describedBy={common['aria-describedby']} invalid={!!err}/>}
              {f.type === 'textarea' && <textarea {...common} rows={f.rows ?? 5} className="field" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}/>}
              {(f.type === 'number' || f.type === 'money') && <input {...common} type="number" min={0} step={f.type === 'money' ? '0.01' : '1'} className="field" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}/>}
              {f.type === 'select' && <select {...common} className="field" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>}
              {f.type === 'lines' && <textarea {...common} rows={4} className="field" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}/>}
              {f.type === 'pairs' && <textarea {...common} rows={4} className="field" placeholder={`${f.a} | ${f.b}`} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}/>}
              {f.type === 'services' && <div className="flex flex-wrap gap-3">{serviceOptions.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C89A3C]" checked={(form[f.key] ?? []).includes(s.id)} onChange={(e) => set(f.key, e.target.checked ? [...(form[f.key] ?? []), s.id] : (form[f.key] ?? []).filter((x) => x !== s.id))}/>{s.title}</label>)}</div>}
              {f.help && <p className="mt-1 text-xs text-cream/50">{f.help}</p>}
              {err && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-red-300">{err}</p>}
            </div>);
            })}
      </div>
      <div className="mt-8 flex gap-3"><button type="submit" className="btn-gold disabled:opacity-60" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button><button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button></div>
    </form>);
    return (<div>
      <div className="flex items-center justify-between gap-3"><h1 className="!text-4xl">{cfg.title}</h1><button type="button" className="btn-gold !py-2.5" onClick={() => open('new')}>New {cfg.singular.toLowerCase()}</button></div>
      <div className="mt-6">
        {isLoading && <Skeleton className="h-48"/>}{isError && <ErrorState onRetry={() => refetch()}/>}
        {data && data.length === 0 && <p className="rounded-card border border-gold/30 p-8 text-center text-cream/70">Nothing here yet.</p>}
        {data && data.length > 0 && (<div className="overflow-x-auto rounded-card border border-gold/25"><table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-gold/10 text-xs uppercase tracking-wider text-cream/70"><tr>{cfg.columns.map((c) => <th key={c.key} className="p-3">{c.label}</th>)}<th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{data.map((it) => (<tr key={it.id} className="border-t border-gold/15">{cfg.columns.map((c) => <td key={c.key} className="p-3">{cell(it, c.key)}</td>)}
                <td className="whitespace-nowrap p-3 text-right"><button type="button" className="mr-4 text-gold hover:underline" onClick={() => open(it)}>Edit<span className="sr-only"> {it.title ?? it.name ?? it.clientName}</span></button>
                  <button type="button" className="text-red-300 hover:underline" onClick={() => setToDelete(it)}>Delete<span className="sr-only"> {it.title ?? it.name ?? it.clientName}</span></button></td></tr>))}</tbody></table></div>)}
      </div>
      <ConfirmDialog open={!!toDelete} title={`Delete ${cfg.singular.toLowerCase()}?`} message={`“${toDelete?.title ?? toDelete?.name ?? toDelete?.clientName ?? ''}” will be permanently removed. To hide it instead, set it to draft or unpublished.`} onCancel={() => setToDelete(null)} onConfirm={() => { const x = toDelete; setToDelete(null); if (x)
        del.mutate(x.id); }}/>
    </div>);
}
const status = ['draft', 'published', 'archived'];
export const CONFIGS = {
    services: { title: 'Services', singular: 'Service', path: 'services', columns: [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'displayOrder', label: 'Order' }],
        defaults: { status: 'draft', displayOrder: 0 }, fields: [
            { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'slug', label: 'URL slug', type: 'text', help: 'Leave empty to generate from the title.' },
            { key: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2, required: true }, { key: 'detailedDescription', label: 'Detailed description (Markdown)', type: 'textarea', rows: 8 },
            { key: 'imageUrl', label: 'Image URL', type: 'url' }, { key: 'iconId', label: 'Icon identifier', type: 'text', help: 'e.g. clapperboard, share, palette, code, megaphone' }, { key: 'ctaLabel', label: 'Button label', type: 'text' },
            { key: 'benefits', label: 'Benefits', type: 'lines', help: 'One per line.' }, { key: 'deliverables', label: 'Deliverables', type: 'lines', help: 'One per line.' },
            { key: 'displayOrder', label: 'Display order', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: status },
            { key: 'seoTitle', label: 'SEO title', type: 'text' }, { key: 'seoDescription', label: 'SEO description', type: 'textarea', rows: 2 }
        ] },
    projects: { title: 'Projects', singular: 'Project', path: 'projects', columns: [{ key: 'title', label: 'Title' }, { key: 'industry', label: 'Category' }, { key: 'status', label: 'Status' }, { key: 'featured', label: 'Featured' }, { key: 'isDemo', label: 'Demo' }],
        defaults: { status: 'draft', featured: false, isDemo: false, serviceIds: [], videoRatio: '4:5' }, fields: [
            { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'slug', label: 'URL slug', type: 'text' }, { key: 'clientName', label: 'Client / brand (only if authorised)', type: 'text' },
            { key: 'industry', label: 'Category', type: 'category', required: true, help: 'Required. Every project belongs to one category; the “Our Work” section is split into a sub-section for each category. Choose it before uploading photos or videos.' }, { key: 'projectType', label: 'Project type', type: 'text' },
            { key: 'serviceIds', label: 'Services delivered', type: 'services' }, { key: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2, required: true },
            { key: 'caseStudy', label: 'Case study (Markdown)', type: 'markdown', rows: 10, requires: 'industry', lockMsg: 'Choose a category above before uploading photos or videos.', help: 'Use “Insert photo” or “Insert video” to add media from your computer inside the text.' }, { key: 'coverImageUrl', label: 'Thumbnail / cover image', type: 'image', requires: 'industry', lockMsg: 'Choose a category above before uploading photos or videos.', help: 'Shown on the project card. For a video project, upload a thumbnail here; if you leave it empty, one is created from the video automatically.' },
            { key: 'gallery', label: 'Gallery photos', type: 'gallery', requires: 'industry', lockMsg: 'Choose a category above before uploading photos or videos.' }, { key: 'videoUrl', label: 'Project video', type: 'video', thumbnailKey: 'coverImageUrl', requires: 'industry', lockMsg: 'Choose a category above before uploading photos or videos.', help: 'On the website, the video plays inside its card when a visitor hovers over it.' }, { key: 'videoRatio', label: 'Video card size ratio', type: 'ratio', help: 'The shape of this project’s card on the website (width : height). Pick the one that matches your video so it is not cropped badly. Only used when the project has a video.' },
            { key: 'externalUrl', label: 'External project link', type: 'url' }, { key: 'results', label: 'Verified results', type: 'pairs', a: 'label', b: 'value', help: 'One per line: label | value. Only add figures you can verify.' },
            { key: 'completedOn', label: 'Completion date', type: 'date' }, { key: 'featured', label: 'Featured on homepage', type: 'checkbox' }, { key: 'isDemo', label: 'Demonstration content (shows a “Sample” badge)', type: 'checkbox' },
            { key: 'status', label: 'Status', type: 'select', options: status }, { key: 'seoTitle', label: 'SEO title', type: 'text' }, { key: 'seoDescription', label: 'SEO description', type: 'textarea', rows: 2 }
        ] },
    testimonials: { title: 'Testimonials', singular: 'Testimonial', path: 'testimonials', columns: [{ key: 'clientName', label: 'Client' }, { key: 'businessName', label: 'Business' }, { key: 'approved', label: 'Approved' }, { key: 'status', label: 'Status' }],
        defaults: { status: 'draft', approved: false, displayOrder: 0 }, fields: [
            { key: 'clientName', label: 'Client name', type: 'text', required: true }, { key: 'businessName', label: 'Business', type: 'text' }, { key: 'industry', label: 'Industry', type: 'text' },
            { key: 'avatarUrl', label: 'Approved avatar / logo URL', type: 'url' }, { key: 'body', label: 'Testimonial', type: 'textarea', required: true }, { key: 'rating', label: 'Rating (1–5, only if genuinely given)', type: 'number', nullable: true },
            { key: 'approved', label: 'Client has approved publication', type: 'checkbox', help: 'A testimonial is only shown publicly when it is both approved and published.' },
            { key: 'status', label: 'Status', type: 'select', options: status }, { key: 'displayOrder', label: 'Display order', type: 'number' }
        ] },
    pricing: { title: 'Pricing packages', singular: 'Package', path: 'pricing', columns: [{ key: 'name', label: 'Name' }, { key: 'priceMinor', label: 'Price (minor units)' }, { key: 'customQuote', label: 'Custom quote' }, { key: 'available', label: 'Available' }],
        defaults: { currency: 'INR', billingPeriod: 'monthly', customQuote: false, available: false, featured: false, displayOrder: 0 }, fields: [
            { key: 'name', label: 'Name', type: 'text', required: true }, { key: 'slug', label: 'URL slug', type: 'text' }, { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
            { key: 'customQuote', label: 'Custom quote (no public price)', type: 'checkbox' }, { key: 'priceMinor', label: 'Price', type: 'money', help: 'In the package currency, e.g. 25000 for ₹25,000.' },
            { key: 'currency', label: 'Currency (ISO code)', type: 'text' }, { key: 'billingPeriod', label: 'Billing period', type: 'select', options: ['one_time', 'monthly', 'quarterly', 'yearly'] },
            { key: 'deliverables', label: 'Included deliverables', type: 'lines', help: 'One per line.' }, { key: 'revisionTerms', label: 'Revision policy', type: 'text' }, { key: 'deliveryTimeline', label: 'Delivery schedule', type: 'text' },
            { key: 'featured', label: 'Featured', type: 'checkbox' }, { key: 'available', label: 'Available (visible on the pricing page)', type: 'checkbox' }, { key: 'displayOrder', label: 'Display order', type: 'number' }
        ] },
    blog: { title: 'Blog posts', singular: 'Post', path: 'blog', columns: [{ key: 'title', label: 'Title' }, { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' }, { key: 'featured', label: 'Featured' }, { key: 'isDemo', label: 'Demo' }, { key: 'publishedAt', label: 'Publish date' }],
        defaults: { status: 'draft', featured: false, isDemo: false, serviceIds: [], videoRatio: '4:5' }, fields: [
            { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'slug', label: 'URL slug', type: 'text' }, { key: 'authorName', label: 'Author', type: 'text' },
            { key: 'category', label: 'Category', type: 'category', presets: BLOG_CATEGORIES, required: true, help: 'Required. Every article belongs to one category; the “Our Blog” section is split into a sub-section for each category. Choose it before uploading photos or videos.' },
            { key: 'serviceIds', label: 'Related services', type: 'services' }, { key: 'excerpt', label: 'Short description (excerpt)', type: 'textarea', rows: 2, required: true },
            { key: 'content', label: 'Article (Markdown)', type: 'markdown', rows: 14, required: true, requires: 'category', lockMsg: 'Choose a category above before uploading photos or videos.', help: 'Supports headings (#), lists, quotes, **bold**, *italic*, links, and photos or videos added with “Insert photo” or “Insert video”. HTML is never rendered.' },
            { key: 'featuredImageUrl', label: 'Thumbnail / featured image', type: 'image', requires: 'category', lockMsg: 'Choose a category above before uploading photos or videos.', help: 'Shown on the article card. For a video article, upload a thumbnail here; if you leave it empty, one is created from the video automatically.' },
            { key: 'gallery', label: 'Gallery photos', type: 'gallery', requires: 'category', lockMsg: 'Choose a category above before uploading photos or videos.' }, { key: 'videoUrl', label: 'Article video', type: 'video', thumbnailKey: 'featuredImageUrl', requires: 'category', lockMsg: 'Choose a category above before uploading photos or videos.', help: 'On the website, the video plays inside its card when a visitor hovers over it.' }, { key: 'videoRatio', label: 'Video card size ratio', type: 'ratio', help: 'The shape of this article’s card on the website (width : height). Pick the one that matches your video so it is not cropped badly. Only used when the article has a video.' },
            { key: 'externalUrl', label: 'External link', type: 'url' },
            { key: 'publishedAt', label: 'Publish date', type: 'date', help: 'Leave empty to publish immediately; a future date schedules it.' }, { key: 'featured', label: 'Featured (shown first)', type: 'checkbox' }, { key: 'isDemo', label: 'Demonstration content (shows a “Sample” badge)', type: 'checkbox' },
            { key: 'status', label: 'Status', type: 'select', options: status }, { key: 'seoTitle', label: 'SEO title', type: 'text' }, { key: 'seoDescription', label: 'SEO description', type: 'textarea', rows: 2 }
        ] },
};
