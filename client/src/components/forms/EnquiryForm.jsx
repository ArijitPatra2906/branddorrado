import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useEnquiryOptions, useServices } from '../../lib/queries';
import { enquiryFormSchema } from '../../schemas/enquiry';
const input = 'w-full rounded-lg border border-gold/30 bg-obsidian px-4 py-3 text-sm text-cream placeholder:text-cream/40 transition focus:border-gold aria-[invalid=true]:border-red-400';
const empty = {
    fullName: '', businessName: '', email: '', phone: '', websiteUrl: '', service: '', package: '', budgetRange: '', timeline: '',
    contactMethod: '', description: '', referralSource: '', consent: false, companyWebsite: '',
};
function Field({ id, label, optional, error, children }) {
    return (<div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cream/90">{label}{optional && <span className="ml-1 font-normal text-cream/50">(optional)</span>}</label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-300">{/* text + icon-free message; colour is never the only cue */}Error: {error}</p>}
    </div>);
}
export function EnquiryForm() {
    const [params] = useSearchParams();
    const { data: services } = useServices();
    const { data: options } = useEnquiryOptions();
    const [reference, setReference] = useState(null);
    const [formError, setFormError] = useState(null);
    const done = useRef(null);
    const { register, handleSubmit, setError, reset, setValue, formState: { errors } } = useForm({
        resolver: zodResolver(enquiryFormSchema), defaultValues: { ...empty, service: params.get('service') ?? '', package: params.get('package') ?? '' }, mode: 'onBlur',
    });
    // The services list arrives after first render: re-apply the prefilled service once it is known to exist.
    useEffect(() => {
        const wanted = params.get('service');
        if (wanted && services?.some((s) => s.slug === wanted))
            setValue('service', wanted);
    }, [services, params, setValue]);
    useEffect(() => { if (reference)
        done.current?.focus(); }, [reference]);
    const submit = useMutation({
        mutationFn: (v) => {
            const body = Object.fromEntries(Object.entries(v).filter(([, val]) => val !== '' && val !== undefined));
            return api('/enquiries', { method: 'POST', body: JSON.stringify(body) });
        },
        onSuccess: (r) => { setFormError(null); setReference(r.data.reference ?? 'received'); },
        onError: (err) => {
            if (err instanceof ApiError && err.fields?.length) {
                err.fields.forEach((f) => setError(f.path, { message: f.message }));
                setFormError('Please check the highlighted fields.');
            }
            else if (err instanceof ApiError && err.status === 429)
                setFormError(err.message);
            else
                setFormError("We couldn't send your enquiry, and nothing has been saved. Please try again in a moment.");
        },
    });
    if (reference) {
        return (<div role="status" className="rounded-card border border-gold/40 p-8 text-center">
        <CheckCircle2 className="mx-auto text-gold" size={36} aria-hidden="true"/>
        <h2 ref={done} tabIndex={-1} className="mt-4 text-[length:clamp(1.8rem,3vw,2.4rem)] outline-none">Thank you.</h2>
        <p className="mt-3 text-cream/85">Thank you for contacting BrandDorrado. We've received your project enquiry and look forward to learning more about your brand.</p>
        {reference !== 'received' && <p className="mt-5 text-sm text-cream/70">Your reference: <strong className="font-semibold text-gold">{reference}</strong></p>}
        <button type="button" className="btn-outline mt-7" onClick={() => { reset({ ...empty }); setReference(null); }}>Send another enquiry</button>
      </div>);
    }
    const busy = submit.isPending;
    const a = (name) => ({ 'aria-invalid': errors[name] ? true : undefined, 'aria-describedby': errors[name] ? `${name}-error` : undefined });
    return (<form noValidate onSubmit={handleSubmit((v) => { if (!busy)
        submit.mutate(v); })} className="space-y-5" aria-busy={busy}>
      {formError && <p role="alert" className="rounded-lg border border-red-400/60 px-4 py-3 text-sm text-red-200">{formError}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fullName" label="Full name" error={errors.fullName?.message}><input id="fullName" autoComplete="name" required className={input} {...a('fullName')} {...register('fullName')}/></Field>
        <Field id="businessName" label="Business or brand" optional error={errors.businessName?.message}><input id="businessName" autoComplete="organization" className={input} {...a('businessName')} {...register('businessName')}/></Field>
        <Field id="email" label="Email address" error={errors.email?.message}><input id="email" type="email" autoComplete="email" required className={input} {...a('email')} {...register('email')}/></Field>
        <Field id="phone" label="Phone or WhatsApp" optional={!options?.phoneRequired} error={errors.phone?.message}><input id="phone" type="tel" autoComplete="tel" inputMode="tel" className={input} {...a('phone')} {...register('phone')}/></Field>
      </div>
      <Field id="websiteUrl" label="Website or social media link" optional error={errors.websiteUrl?.message}><input id="websiteUrl" inputMode="url" autoComplete="url" placeholder="instagram.com/yourbrand" className={input} {...a('websiteUrl')} {...register('websiteUrl')}/></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="service" label="Service required" error={errors.service?.message}>
          <select id="service" required className={input} {...a('service')} {...register('service')}>
            <option value="">{services ? 'Choose a service' : 'Loading services…'}</option>
            {services?.map((s) => <option key={s.id} value={s.slug}>{s.title}</option>)}
          </select>
        </Field>
        <Field id="budgetRange" label="Estimated budget" optional error={errors.budgetRange?.message}>
          <select id="budgetRange" className={input} {...register('budgetRange')}><option value="">Select a range</option>{options?.budgets.map((b) => <option key={b}>{b}</option>)}</select>
        </Field>
        <Field id="timeline" label="Project timeline" optional error={errors.timeline?.message}>
          <select id="timeline" className={input} {...register('timeline')}><option value="">Select a timeline</option>{options?.timelines.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field id="contactMethod" label="Preferred contact method" optional error={errors.contactMethod?.message}>
          <select id="contactMethod" className={input} {...register('contactMethod')}><option value="">No preference</option>{options?.contactMethods.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
      </div>
      <Field id="description" label="Tell us about your project" optional error={errors.description?.message}>
        <textarea id="description" rows={6} maxLength={3000} className={input} {...a('description')} {...register('description')}/>
      </Field>
      <Field id="referralSource" label="How did you hear about us?" optional error={errors.referralSource?.message}>
        <select id="referralSource" className={input} {...register('referralSource')}><option value="">Select one</option>{options?.referralSources.map((r) => <option key={r}>{r}</option>)}</select>
      </Field>
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Company website<input tabIndex={-1} autoComplete="off" {...register('companyWebsite')}/></label>
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm text-cream/85">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#C89A3C]" {...a('consent')} {...register('consent')}/>
          <span>I have read the <Link to="/privacy-policy" className="text-gold underline underline-offset-2">privacy notice</Link> and agree that BrandDorrado may use these details to respond to my enquiry.</span>
        </label>
        {errors.consent && <p id="consent-error" className="mt-1.5 text-sm text-red-300">Error: {errors.consent.message}</p>}
      </div>
      <button type="submit" disabled={busy} className="btn-gold min-w-[12rem] disabled:cursor-not-allowed disabled:opacity-70">
        {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true"/>Sending…</> : 'Send enquiry'}
      </button>
    </form>);
}
