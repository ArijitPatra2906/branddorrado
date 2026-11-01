import { PasswordInput } from '../../components/admin/PasswordInput';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../../components/Logo';
import { usePageMeta } from '../../components/seo/usePageMeta';
import { api, ApiError } from '../../lib/api';
import { useAdmin } from '../../lib/adminApi';
export default function AdminLogin() {
    usePageMeta('Admin sign in', undefined, { noindex: true });
    const a = useAdmin();
    const nav = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const { data: st } = useQuery({ queryKey: ['admin-setup-status'], queryFn: () => api('/auth/setup-status').then((r) => r.data), retry: false });
    if (a.user)
        return <Navigate to="/admin" replace/>;
    if (st?.needsSetup)
        return <Navigate to="/admin/setup" replace/>;
    const submit = async (e) => {
        e.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setErr('');
        try {
            await a.login(email.trim(), password);
            nav('/admin', { replace: true });
        }
        catch (x) {
            setErr(x instanceof ApiError ? x.message : 'Could not sign in. Please try again.');
        }
        finally {
            setBusy(false);
        }
    };
    return (<main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-card border border-gold/30 p-8" noValidate>
        <Logo variant="horizontal-dark" className="mx-auto h-12 w-auto"/>
        <h1 className="mt-6 text-center !text-3xl">Admin sign in</h1>
        <div className="mt-6"><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required className="field" value={email} onChange={(e) => setEmail(e.target.value)}/></div>
        <div className="mt-4"><label className="label" htmlFor="pw">Password</label><PasswordInput id="pw" autoComplete="current-password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)}/></div>
        {err && <p role="alert" className="mt-4 text-sm text-red-300">{err}</p>}
        <button type="submit" disabled={busy || !email || !password} className="btn-gold mt-6 w-full disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="mt-4 text-center text-sm"><Link to="/admin/forgot-password" className="text-gold underline">Forgot your password?</Link></p>
      </form>
    </main>);
}
