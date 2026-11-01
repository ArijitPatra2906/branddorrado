import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { usePageMeta } from '../../components/seo/usePageMeta';
import { api, ApiError } from '../../lib/api';
export default function ForgotPassword() {
    usePageMeta('Reset admin password', undefined, { noindex: true });
    const [email, setEmail] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setErr('');
        try {
            await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
            setSent(true);
        }
        catch (x) {
            setErr(x instanceof ApiError ? x.message : 'Could not send the request. Please try again.');
        }
        finally {
            setBusy(false);
        }
    };
    return (<main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-card border border-gold/30 p-8" noValidate>
        <Logo variant="horizontal-dark" className="mx-auto h-12 w-auto"/>
        <h1 className="mt-6 text-center !text-3xl">Reset password</h1>
        {sent ? (<p role="status" className="mt-6 text-sm text-cream/80">If that email belongs to an admin account, a reset link is on its way. It works once and expires in 30 minutes.</p>) : (<>
            <p className="mt-4 text-center text-sm text-cream/70">Enter your admin email and we'll send you a link to choose a new password.</p>
            <div className="mt-6"><label className="label" htmlFor="fe">Email</label><input id="fe" type="email" autoComplete="username" required className="field" value={email} onChange={(e) => setEmail(e.target.value)}/></div>
            {err && <p role="alert" className="mt-4 text-sm text-red-300">{err}</p>}
            <button type="submit" disabled={busy || !email} className="btn-gold mt-6 w-full disabled:opacity-60">{busy ? 'Sending…' : 'Send reset link'}</button>
          </>)}
        <p className="mt-6 text-center text-sm"><Link to="/admin/login" className="text-gold underline">Back to sign in</Link></p>
      </form>
    </main>);
}
