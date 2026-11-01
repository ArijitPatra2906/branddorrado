import { PasswordInput } from '../../components/admin/PasswordInput';
import { passwordProblem, PASSWORD_HINT } from '../../lib/passwordRule';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../../components/Logo';
import { usePageMeta } from '../../components/seo/usePageMeta';
import { api, ApiError } from '../../lib/api';
import { useAdmin } from '../../lib/adminApi';
// First-run only: creates the one and only super admin. Once it exists this page redirects to sign-in and the API refuses further setup.
export default function AdminSetup() {
    usePageMeta('Admin setup', undefined, { noindex: true });
    const a = useAdmin();
    const nav = useNavigate();
    const { data, isLoading, isError } = useQuery({ queryKey: ['admin-setup-status'], queryFn: () => api('/auth/setup-status').then((r) => r.data), retry: false });
    const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
    const [err, setErr] = useState('');
    const [fields, setFields] = useState({});
    const [busy, setBusy] = useState(false);
    if (a.user)
        return <Navigate to="/admin" replace/>;
    if (isLoading)
        return <p role="status" className="p-10 text-center">Loading…</p>;
    if (isError || !data)
        return <p role="alert" className="p-10 text-center">Could not reach the server.</p>;
    if (!data.needsSetup)
        return <Navigate to="/admin/login" replace/>;
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        if (busy)
            return;
        setErr('');
        setFields({});
        const bad = passwordProblem(f.password);
        if (bad) {
            setFields({ password: bad });
            return;
        }
        if (f.password !== f.confirm) {
            setFields({ confirm: 'Passwords do not match' });
            return;
        }
        setBusy(true);
        try {
            await a.setup({ name: f.name.trim(), email: f.email.trim(), password: f.password });
            nav('/admin', { replace: true });
        }
        catch (x) {
            if (x instanceof ApiError && x.fields)
                setFields(Object.fromEntries(x.fields.map((i) => [i.path, i.message])));
            setErr(x instanceof ApiError ? x.message : 'Could not complete setup. Please try again.');
        }
        finally {
            setBusy(false);
        }
    };
    const row = (id, label, type = 'text', auto, help) => (<div className="mt-4"><label className="label" htmlFor={id}>{label}</label>
      {type === 'password' ? <PasswordInput id={id} autoComplete={auto} required className="field" value={f[id]} onChange={set(id)} aria-invalid={!!fields[id] || undefined} aria-describedby={fields[id] ? `${id}-e` : help ? `${id}-h` : undefined}/> : <input type={type} id={id} autoComplete={auto} required className="field" value={f[id]} onChange={set(id)} aria-invalid={!!fields[id] || undefined} aria-describedby={fields[id] ? `${id}-e` : help ? `${id}-h` : undefined}/>}
      {help && !fields[id] && <p id={`${id}-h`} className="mt-1 text-xs text-cream/50">{help}</p>}{fields[id] && <p id={`${id}-e`} role="alert" className="mt-1 text-xs text-red-300">{fields[id]}</p>}</div>);
    return (<main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} noValidate className="w-full max-w-md rounded-card border border-gold/30 p-8">
        <Logo variant="horizontal-dark" className="mx-auto h-12 w-auto"/>
        <h1 className="mt-6 text-center !text-3xl">Create the super admin</h1>
        <p className="mt-3 text-center text-sm text-cream/70">This account is created once. It can manage every part of the website, add other admins, choose what each admin may do, and see everything they do.</p>
        {row('name', 'Your name', 'text', 'name')}{row('email', 'Email', 'email', 'username')}
        {row('password', 'Password', 'password', 'new-password', PASSWORD_HINT)}{row('confirm', 'Confirm password', 'password', 'new-password')}
        
        {err && <p role="alert" className="mt-4 text-sm text-red-300">{err}</p>}
        <button type="submit" disabled={busy} className="btn-gold mt-6 w-full disabled:opacity-60">{busy ? 'Creating…' : 'Create super admin'}</button>
      </form>
    </main>);
}
