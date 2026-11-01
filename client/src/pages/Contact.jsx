import { Mail, MessageCircle, Instagram, Youtube, Linkedin } from 'lucide-react';
import { container } from '../components/Section';
import { EnquiryForm } from '../components/forms/EnquiryForm';
import { useSiteSettings } from '../lib/queries';
import { whatsappLink } from '../lib/links';
export default function Contact() {
    const { data: s } = useSiteSettings();
    const wa = whatsappLink(s?.whatsappNumber);
    const social = [['Instagram', s?.social.instagram, Instagram], ['YouTube', s?.social.youtube, Youtube], ['LinkedIn', s?.social.linkedin, Linkedin]];
    const links = social.filter(([, url]) => !!url);
    const row = 'inline-flex items-center gap-2 hover:text-gold';
    return (<section className={`${container} grid gap-12 py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:py-24`}>
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4">Let's talk about your project.</h1>
        <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
        <p className="mt-6 max-w-md text-cream/80">Tell us about your brand and what you want to achieve. We'll review your enquiry and get back to you.</p>
        {s?.responseTimeText && <p className="mt-4 max-w-md text-sm text-cream/70">{s.responseTimeText}</p>}
        <ul className="mt-8 space-y-3 text-sm">
          {s?.publicEmail && <li><a className={row} href={`mailto:${s.publicEmail}`}><Mail size={16} aria-hidden="true"/>{s.publicEmail}</a></li>}
          {wa && <li><a className={row} href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true"/>WhatsApp<span className="sr-only"> (opens in a new tab)</span></a></li>}
          {links.map(([name, url, Icon]) => <li key={name}><a className={row} href={url} target="_blank" rel="noopener noreferrer"><Icon size={16} aria-hidden="true"/>{name}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
        </ul>
        <p className="mt-8 max-w-md text-xs text-cream/55">Advertising budgets and third-party costs are not included in our fees unless a package or proposal says so explicitly. We only use your details to respond to your enquiry.</p>
      </div>
      <div id="enquiry" className="scroll-mt-28 rounded-card border border-gold/30 p-6 sm:p-8">
        <h2 className="mb-6 text-[length:clamp(1.6rem,2.4vw,2rem)]">Project enquiry</h2>
        <EnquiryForm />
      </div>
    </section>);
}
