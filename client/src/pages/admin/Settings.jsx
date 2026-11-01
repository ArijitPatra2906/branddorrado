import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminGet, adminSend } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/admin/Toast';
import { ErrorState, Skeleton } from '../../components/feedback/States';
export default function Settings() {
    const qc = useQueryClient();
    const toast = useToast();
    const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin-settings'], queryFn: () => adminGet('/admin/settings') });
    const [s, setS] = useState(null);
    const [errs, setErrs] = useState({});
    useEffect(() => { if (data)
        setS(data); }, [data]);
    const save = useMutation({
        mutationFn: () => adminSend('PATCH', '/admin/settings', s),
        onSuccess: () => { toast('ok', 'Settings saved.'); setErrs({}); qc.invalidateQueries({ queryKey: ['admin-settings'] }); qc.invalidateQueries({ queryKey: ['settings'] }); },
        onError: (x) => { if (x instanceof ApiError && x.fields)
            setErrs(Object.fromEntries(x.fields.map((f) => [f.path, f.message]))); toast('err', x instanceof ApiError ? x.message : 'Could not save.'); },
    });
    if (isLoading || !s)
        return isError ? <ErrorState onRetry={() => refetch()}/> : <Skeleton className="h-96"/>;
    const ro = false;
    const up = (fn) => setS((p) => { const d = structuredClone(p); fn(d); return d; });
    const text = (label, path, get, setv, help, area = false) => (<div><label className="label" htmlFor={path}>{label}</label>
      {area ? <textarea id={path} rows={6} className="field" disabled={ro} value={get()} onChange={(e) => up((d) => setv(d, e.target.value))}/> : <input id={path} className="field" disabled={ro} value={get()} onChange={(e) => up((d) => setv(d, e.target.value))}/>}
      {help && <p className="mt-1 text-xs text-cream/50">{help}</p>}{errs[path] && <p role="alert" className="mt-1 text-xs text-red-300">{errs[path]}</p>}</div>);
    const stats = (title, k) => (<fieldset className="rounded-card border border-gold/25 p-5"><legend className="px-2 text-sm text-gold">{title}</legend>
      <p className="mb-3 text-xs text-cream/55">A figure is public only when it has a value and “Verified” is ticked. Never publish numbers you cannot back up.</p>
      {s[k].map((st, i) => (<div key={i} className="mb-3 grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
          <div><label className="label" htmlFor={`${k}-l-${i}`}>Label</label><input id={`${k}-l-${i}`} className="field" disabled={ro} value={st.label} onChange={(e) => up((d) => { d[k][i].label = e.target.value; })}/></div>
          <div><label className="label" htmlFor={`${k}-v-${i}`}>Value</label><input id={`${k}-v-${i}`} className="field" disabled={ro} value={st.value} onChange={(e) => up((d) => { d[k][i].value = e.target.value; })} placeholder="e.g. 50+"/></div>
          <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" className="accent-[#C89A3C]" disabled={ro} checked={st.verified} onChange={(e) => up((d) => { d[k][i].verified = e.target.checked; })}/>Verified</label>
        </div>))}
    </fieldset>);
    return (<form onSubmit={(e) => { e.preventDefault(); if (!save.isPending && !ro)
        save.mutate(); }} className="max-w-3xl space-y-8">
      <h1 className="!text-4xl">Website settings</h1>
      <div className="grid gap-5 sm:grid-cols-2">
        {text('Agency name', 'agencyName', () => s.agencyName, (d, v) => { d.agencyName = v; })}{text('Tagline', 'tagline', () => s.tagline, (d, v) => { d.tagline = v; })}
        {text('Public email', 'publicEmail', () => s.publicEmail, (d, v) => { d.publicEmail = v; })}
        {text('WhatsApp number', 'whatsappNumber', () => s.whatsappNumber, (d, v) => { d.whatsappNumber = v; }, 'Digits only with country code, e.g. 919876543210.')}
        {text('Instagram URL', 'social.instagram', () => s.social.instagram, (d, v) => { d.social.instagram = v; })}{text('YouTube URL', 'social.youtube', () => s.social.youtube, (d, v) => { d.social.youtube = v; })}
        {text('LinkedIn URL', 'social.linkedin', () => s.social.linkedin, (d, v) => { d.social.linkedin = v; })}
        {text('Hero showreel URL', 'hero.videoUrl', () => s.hero.videoUrl, (d, v) => { d.hero.videoUrl = v; }, 'YouTube, Vimeo or .mp4 over https.')}
        {text('Hero image URL', 'hero.imageUrl', () => s.hero.imageUrl, (d, v) => { d.hero.imageUrl = v; })}{text('About image URL', 'aboutImageUrl', () => s.aboutImageUrl, (d, v) => { d.aboutImageUrl = v; })}
      </div>
      <div className="flex flex-wrap gap-8">
        <fieldset className="max-w-xl" aria-describedby="scene-help">
          <legend className="mb-2 text-sm font-medium">3D hero scene</legend>
          {[['scene-all', 'All devices (master switch)', 'sceneEnabled'], ['scene-phone', 'Phones', 'phone'], ['scene-tablet', 'Tablets', 'tablet'], ['scene-laptop', 'Laptops', 'laptop'], ['scene-desktop', 'Desktops', 'desktop']].map(([id, label, k]) => {
            const master = k === 'sceneEnabled';
            const on = master ? !!s.hero.sceneEnabled : !!s.hero.devices?.[k];
            const dim = !master && !s.hero.sceneEnabled;
            return (<div key={id} className={`flex items-center gap-3 py-1 ${master ? '' : 'ml-6'} ${dim ? 'opacity-50' : ''}`}>
              <button type="button" role="switch" id={id} aria-checked={on} disabled={ro}
                onClick={() => up((d) => { if (master) d.hero.sceneEnabled = !d.hero.sceneEnabled; else { d.hero.devices = { phone: true, tablet: true, laptop: true, desktop: true, ...d.hero.devices }; d.hero.devices[k] = !d.hero.devices[k]; } })}
                className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${on ? 'border-gold bg-gold' : 'border-cream/40 bg-transparent'}`}>
                <span aria-hidden="true" className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${on ? 'left-6 bg-obsidian' : 'left-0.5 bg-cream/70'}`}/>
              </button>
              <label htmlFor={id} className="text-sm">{label}: <strong>{on ? 'On' : 'Off'}</strong></label>
            </div>);
          })}
          <p id="scene-help" className="mt-2 text-xs text-cream/55">Turn the 3D scene off for one kind of device and those visitors see the still hero image instead. The master switch turns it off everywhere. Phones are screens under 768px, tablets 768–1023px (and touch screens under 1400px), laptops up to 1599px, desktops 1600px and wider. Visitors who prefer reduced motion, browsers without WebGL and very weak devices always see the still image. Click “Save settings”; open pages update within a few seconds, without a reload.</p>
        </fieldset>
        <label className="flex items-center gap-3 text-sm">Motion<select className="field !w-auto" disabled={ro} value={s.hero.motion} onChange={(e) => up((d) => { d.hero.motion = e.target.value; })}><option value="full">Full</option><option value="low">Low</option></select></label>
      </div>
      {text('Footer blurb', 'footerBlurb', () => s.footerBlurb, (d, v) => { d.footerBlurb = v; })}
      {text('Contact response-time text', 'responseTimeText', () => s.responseTimeText, (d, v) => { d.responseTimeText = v; }, 'Only promise a timeframe you will keep. Leave empty to show nothing.')}
      {stats('Homepage hero statistics', 'heroStats')}{stats('About statistics', 'aboutStats')}
      {text('Privacy policy (Markdown)', 'legal.privacy', () => s.legal.privacy, (d, v) => { d.legal.privacy = v; }, 'Empty shows a short factual data-handling notice. Have a lawyer review your final text.', true)}
      {text('Terms and conditions (Markdown)', 'legal.terms', () => s.legal.terms, (d, v) => { d.legal.terms = v; }, undefined, true)}
      <button type="submit" className="btn-gold disabled:opacity-60" disabled={save.isPending || ro}>{save.isPending ? 'Saving…' : 'Save settings'}</button>
    </form>);
}
