import { PasswordInput } from '../../components/admin/PasswordInput';
import { passwordProblem, PASSWORD_HINT } from '../../lib/passwordRule';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { usePageMeta } from '../../components/seo/usePageMeta';
import { api, ApiError } from '../../lib/api';
export default function ResetPassword() {
    usePageMeta('Choose a new password', undefined, { noindex: true });
    // Read the token once, while rendering. (Reading it inside an effect broke in development: React runs effects twice,
    // and the second run found the address already cleaned and replaced the token with an empty value.)
    const [token] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') ?? '');
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    useEffect(() => {
        // Remove the token from the address bar, history and screenshots once it is safely held in state.
        if (window.location.hash)
            history.replaceState(null, '', window.location.pathname);
    }, []);
    const submit = async (e) => {
        e.preventDefault();
        if (busy)
            return;
        setErr('');
        const bad = passwordProblem(pw);
        if (bad)
            return setErr(bad);
        if (pw !== pw2)
            return setErr('The two passwords do not match.');
        setBusy(true);
        try {
            await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword: pw }) });
            setDone(true);
        }
        catch (x) {
            setErr(x instanceof ApiError ? x.message : 'Could not reset the password. Please try again.');
        }
        finally {
            setBusy(false);
        }
    };
    return (<main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-card border border-gold/30 p-8" noValidate>
        <Logo variant="horizontal-dark" className="mx-auto h-12 w-auto"/>
        <h1 className="mt-6 text-center !text-3xl">New password</h1>
        {done ? (<><p role="status" className="mt-6 text-sm text-cream/80">Your password has been changed and any other sessions were signed out.</p>
            <Link to="/admin/login" className="btn-gold mt-6 w-full text-center">Sign in</Link></>) : !token ? (<><p role="alert" className="mt-6 text-sm text-red-300">This reset link is missing or incomplete.</p>
            <p className="mt-6 text-center text-sm"><Link to="/admin/forgot-password" className="text-gold underline">Request a new link</Link></p></>) : (<>
            <div className="mt-6"><label className="label" htmlFor="np">New password</label><PasswordInput id="np" autoComplete="new-password" required className="field" value={pw} onChange={(e) => setPw(e.target.value)}/></div>
            <div className="mt-4"><label className="label" htmlFor="np2">Confirm new password</label><PasswordInput id="np2" autoComplete="new-password" required className="field" value={pw2} onChange={(e) => setPw2(e.target.value)}/></div>
            <p className="mt-2 text-xs text-cream/50">{PASSWORD_HINT}</p>
            {err && <p role="alert" className="mt-4 text-sm text-red-300">{err}{err.includes('expired') && <> <Link to="/admin/forgot-password" className="underline">Request a new link</Link></>}</p>}
            <button type="submit" disabled={busy || !pw || !pw2} className="btn-gold mt-6 w-full disabled:opacity-60">{busy ? 'Saving…' : 'Set new password'}</button>
          </>)}
      </form>
    </main>);
}
