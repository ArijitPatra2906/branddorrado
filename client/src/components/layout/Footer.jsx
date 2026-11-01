import { Link } from 'react-router-dom';
import { Instagram, Linkedin, Mail, MessageCircle, Youtube } from 'lucide-react';
import { Logo } from '../Logo';
import { container } from '../Section';
import { NAV } from './Header';
import { useSiteSettings } from '../../lib/queries';
import { whatsappLink } from '../../lib/links';
const ext = { target: '_blank', rel: 'noopener noreferrer' };
const iconLink = 'grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-cream transition hover:border-gold hover:text-gold';
export function Footer() {
    const { data: s } = useSiteSettings();
    const wa = whatsappLink(s?.whatsappNumber);
    return (<footer className="border-t border-gold/20 bg-obsidian">
      <div className={`${container} grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]`}>
        <div>
          <Logo variant="horizontal-dark" className="h-14 w-auto"/>
          <p className="mt-5 max-w-sm text-sm text-cream/70">{s?.footerBlurb ?? 'A creative and digital marketing agency.'}</p>
          <div className="mt-6 flex gap-3">
            {s?.social.instagram && <a href={s.social.instagram} {...ext} aria-label="BrandDorrado on Instagram (opens in a new tab)" className={iconLink}><Instagram size={18} aria-hidden="true"/></a>}
            {s?.social.youtube && <a href={s.social.youtube} {...ext} aria-label="BrandDorrado on YouTube (opens in a new tab)" className={iconLink}><Youtube size={18} aria-hidden="true"/></a>}
            {s?.social.linkedin && <a href={s.social.linkedin} {...ext} aria-label="BrandDorrado on LinkedIn (opens in a new tab)" className={iconLink}><Linkedin size={18} aria-hidden="true"/></a>}
            {wa && <a href={wa} {...ext} aria-label="Chat with BrandDorrado on WhatsApp (opens in a new tab)" className={iconLink}><MessageCircle size={18} aria-hidden="true"/></a>}
          </div>
        </div>
        <nav aria-label="Footer">
          <p className="eyebrow">Explore</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="text-cream/75 hover:text-gold">{n.label}</Link></li>)}
          </ul>
        </nav>
        <div>
          <p className="eyebrow">Get in touch</p>
          <ul className="mt-5 space-y-3 text-sm text-cream/75">
            {s?.publicEmail && <li><a href={`mailto:${s.publicEmail}`} className="inline-flex items-center gap-2 hover:text-gold"><Mail size={16} aria-hidden="true"/>{s.publicEmail}</a></li>}
            {wa && <li><a href={wa} {...ext} className="inline-flex items-center gap-2 hover:text-gold"><MessageCircle size={16} aria-hidden="true"/>WhatsApp<span className="sr-only"> (opens in a new tab)</span></a></li>}
            {!s?.publicEmail && !wa && <li><Link to="/contact" className="hover:text-gold">Contact page</Link></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-gold/15">
        <div className={`${container} flex flex-col gap-3 py-6 text-xs text-cream/55 sm:flex-row sm:items-center sm:justify-between`}>
          <p>&copy; {new Date().getFullYear()} {s?.agencyName ?? 'BrandDorrado'}. All rights reserved.</p>
          <p className="flex gap-5"><Link to="/privacy-policy" className="hover:text-gold">Privacy Policy</Link><Link to="/terms" className="hover:text-gold">Terms and Conditions</Link><Link to="/admin/login" className="hover:text-gold">Admin</Link></p>
        </div>
      </div>
    </footer>);
}
