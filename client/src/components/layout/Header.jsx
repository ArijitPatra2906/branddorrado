import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logo } from '../Logo';
import { container } from '../Section';
import { enquiryLink } from '../../lib/links';
export const NAV = [
    { to: '/', label: 'Home' }, { to: '/services', label: 'Services' }, { to: '/work', label: 'Work' },
    { to: '/about', label: 'About' }, { to: '/pricing', label: 'Pricing' }, { to: '/blog', label: 'Blog' }, { to: '/contact', label: 'Contact' },
];
const link = ({ isActive }) => `relative py-2 text-sm transition-colors hover:text-gold ${isActive ? 'text-gold after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-gold' : 'text-cream/80'}`;
export function Header() {
    const { pathname } = useLocation();
    return pathname === '/' ? <HomeHeader /> : <SiteHeader />;
}
// Home: transparent overlay on the hero, laid out exactly like the design reference
// (HOME SERVICES WORK ABOUT on the left; PRICING BLOG CONTACT and the outlined button on the right). The brand lockup sits centred between them on xl screens;
// on mobile it replaces the menu-side symbol, and on lg screens (no room in the header) the hero copy shows it.
const LEFT = [{ to: '/services', label: 'Services' }, { to: '/work', label: 'Work' }, { to: '/about', label: 'About' }];
const RIGHT = [{ to: '/pricing', label: 'Pricing' }, { to: '/blog', label: 'Blog' }, { to: '/contact', label: 'Contact' }];
const hl = 'text-[clamp(0.68rem,0.9vw,0.82rem)] font-medium uppercase tracking-[0.16em] text-cream transition-colors hover:text-gold';
function HomeHeader() {
    const [open, setOpen] = useState(false);
    const btn = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => { if (e.key === 'Escape') {
            setOpen(false);
            btn.current?.focus();
        } };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);
    return (<header className="absolute inset-x-0 top-0 z-50">
      <div className="flex items-center justify-between px-6 pt-5 sm:px-10 lg:px-[4.6%] lg:pt-[1.5vw]">
        <Link to="/" aria-label="BrandDorrado home" className="lg:hidden"><Logo variant="wordmark-dark" className="h-10 w-auto"/></Link>
        <nav aria-label="Main" className="hidden items-center gap-[clamp(1.4rem,3.3vw,3.4rem)] lg:flex">
          <Link to="/" aria-current="page" className="relative inline-flex flex-col items-center rounded-full border border-gold/25 px-[1.7vw] py-[0.85vw] text-[clamp(0.68rem,0.9vw,0.82rem)] font-medium uppercase tracking-[0.16em] text-gold">
            Home<span aria-hidden="true" className="absolute inset-x-[1.7vw] bottom-[0.55vw] h-px bg-gold"/>
          </Link>
          {LEFT.map((n) => <Link key={n.to} to={n.to} className={hl}>{n.label}</Link>)}
        </nav>
        <Link to="/" aria-label="BrandDorrado home" className="absolute left-1/2 top-[1.1vw] hidden -translate-x-1/2 xl:block"><Logo variant="wordmark-dark" className="h-[clamp(2.4rem,3.4vw,3.6rem)] w-auto"/></Link>
        <nav aria-label="Secondary" className="hidden items-center gap-[clamp(1.4rem,3.3vw,3.4rem)] lg:flex">
          {RIGHT.map((n) => <Link key={n.to} to={n.to} className={hl}>{n.label}</Link>)}
          <Link to={enquiryLink()} className="inline-flex items-center gap-2 rounded-full border border-gold px-[1.8vw] py-[0.8vw] text-[clamp(0.72rem,0.95vw,0.9rem)] font-medium text-[#E3C07A] transition hover:bg-gold hover:text-obsidian">
            Start a Project <ArrowUpRight size={14} aria-hidden="true"/>
          </Link>
        </nav>
        <button ref={btn} type="button" className="grid h-11 w-11 place-items-center rounded-full border border-gold/50 text-cream lg:hidden" aria-expanded={open} aria-controls="home-mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
          {open ? <X size={20} aria-hidden="true"/> : <Menu size={20} aria-hidden="true"/>}
        </button>
      </div>
      <nav id="home-mobile-nav" aria-label="Mobile" hidden={!open} className="mt-3 border-t border-gold/20 bg-obsidian/95 lg:hidden">
        <ul className={`${container} flex flex-col py-4`} onClick={() => setOpen(false)}>
          {NAV.map((n) => <li key={n.to}><Link to={n.to} className="block border-b border-gold/10 py-3.5 text-base text-cream/90">{n.label}</Link></li>)}
          <li className="pt-5"><Link to={enquiryLink()} className="btn-gold w-full justify-center">Start a Project</Link></li>
        </ul>
      </nav>
    </header>);
}
function SiteHeader() {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const btn = useRef(null);
    useEffect(() => setOpen(false), [pathname]);
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => { if (e.key === 'Escape') {
            setOpen(false);
            btn.current?.focus();
        } };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);
    return (<header className="sticky top-0 z-50 border-b border-gold/15 bg-obsidian/90 backdrop-blur">
      <div className={`${container} flex h-20 items-center justify-between gap-6`}>
        <Link to="/" aria-label="BrandDorrado home"><Logo variant="horizontal-dark" className="h-12 w-auto"/></Link>
        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>{n.label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link to={enquiryLink()} className="btn-gold hidden sm:inline-flex">Start a Project</Link>
          <button ref={btn} type="button" className="grid h-11 w-11 place-items-center rounded-full border border-gold/40 text-cream lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} aria-hidden="true"/> : <Menu size={20} aria-hidden="true"/>}
          </button>
        </div>
      </div>
      <nav id="mobile-nav" aria-label="Mobile" hidden={!open} className="border-t border-gold/15 bg-obsidian lg:hidden">
        <ul className={`${container} flex flex-col py-4`}>
          {NAV.map((n) => (<li key={n.to}><NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => `block border-b border-gold/10 py-3.5 text-base ${isActive ? 'text-gold' : 'text-cream/90'}`}>{n.label}</NavLink></li>))}
          <li className="pt-5"><Link to={enquiryLink()} className="btn-gold w-full justify-center">Start a Project</Link></li>
        </ul>
      </nav>
    </header>);
}
