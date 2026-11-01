import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Reveal, container } from '../Section';
import { useSiteSettings } from '../../lib/queries';
import { enquiryLink, whatsappLink } from '../../lib/links';
export function FinalCta() {
    const { data: s } = useSiteSettings();
    const wa = whatsappLink(s?.whatsappNumber, "Hi BrandDorrado, I'd like to talk about a project.");
    return (<section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-obsidian py-20 lg:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(50%_90%_at_85%_50%,rgba(200,154,60,0.28),transparent_70%)]"/>
      <div className={`${container} border-y border-gold/30 py-14`}>
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Let's work together</p>
          <h2 id="cta-title" className="mt-4">Ready to Turn Your Business Into a Brand?</h2>
          <p className="mt-5 text-cream/75">Let's create something amazing together.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link to={enquiryLink()} className="btn-gold">Start a Project</Link>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline"><MessageCircle size={16} aria-hidden="true"/>WhatsApp<span className="sr-only"> (opens in a new tab)</span></a>}
          </div>
        </Reveal>
      </div>
    </section>);
}
