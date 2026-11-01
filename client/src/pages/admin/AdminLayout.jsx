import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { ToastProvider } from '../../components/admin/Toast';
import { usePageMeta } from '../../components/seo/usePageMeta';
import { useAdmin } from '../../lib/adminApi';
const NAV = [['/admin', 'Overview', null], ['/admin/enquiries', 'Enquiries', 'enquiries'], ['/admin/projects', 'Projects', 'projects'],
    ['/admin/services', 'Services', 'services'], ['/admin/testimonials', 'Testimonials', 'testimonials'], ['/admin/pricing', 'Pricing', 'pricing'],
    ['/admin/blog', 'Blog', 'blog'], ['/admin/settings', 'Settings', 'settings']];
// UX guard only. Every /api/admin request is independently authorised on the server.
export default function AdminLayout() {
    usePageMeta('Admin', undefined, { noindex: true });
    const a = useAdmin();
    const loc = useLocation();
    const [open, setOpen] = useState(false);
    if (a.isLoading)
        return <p className="p-10 text-center text-cream/70" role="status">Checking your session…</p>;
    if (a.isError)
        return <p role="alert" className="p-10 text-center">Could not reach the server. Please refresh to try again.</p>;
    if (!a.user)
        return <Navigate to="/admin/login" replace state={{ from: loc.pathname }}/>;
    const link = ({ isActive }) => `block rounded-lg px-4 py-2.5 text-sm ${isActive ? 'bg-gold/15 text-gold' : 'text-cream/80 hover:text-gold'}`;
    return (<ToastProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
        <header className="flex items-center justify-between border-b border-gold/20 p-4 lg:hidden">
          <Link to="/admin" aria-label="Admin home"><Logo variant="horizontal-dark" className="h-9 w-auto"/></Link>
          <button type="button" aria-expanded={open} aria-controls="admin-nav" aria-label={open ? 'Close menu' : 'Open menu'} className="grid h-11 w-11 place-items-center rounded-full border border-gold/40" onClick={() => setOpen((v) => !v)}>{open ? <X size={20} aria-hidden="true"/> : <Menu size={20} aria-hidden="true"/>}</button>
        </header>
        <aside id="admin-nav" hidden={!open} className="border-b border-gold/20 p-4 lg:!block lg:border-b-0 lg:border-r">
          <Link to="/admin" className="mb-6 hidden lg:block" aria-label="Admin home"><Logo variant="horizontal-dark" className="h-10 w-auto"/></Link>
          <nav aria-label="Admin" onClick={() => setOpen(false)}>{[...NAV.filter(([, , area]) => !area || a.user.permissions.includes(area)).map(([to, label]) => [to, label]),
            ...(a.user.role === 'super_admin' ? [['/admin/team', 'Team'], ['/admin/activity', 'Activity']] : []), ['/admin/account', 'My account']].map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'} className={link}>{label}</NavLink>)}</nav>
          <div className="mt-6 border-t border-gold/20 pt-4 text-xs text-cream/60">
            <p className="truncate">{a.user.name} · {a.user.role === 'super_admin' ? 'super admin' : 'admin'}</p>
            <button type="button" onClick={() => a.logout()} className="mt-3 inline-flex items-center gap-2 text-sm text-cream hover:text-gold"><LogOut size={14} aria-hidden="true"/>Sign out</button>
            <Link to="/" className="mt-3 block hover:text-gold">View website</Link>
          </div>
        </aside>
        <main id="main" className="min-w-0 p-5 sm:p-8"><Outlet context={a.user}/></main>
      </div>
    </ToastProvider>);
}
