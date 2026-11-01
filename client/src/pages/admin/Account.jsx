import { PasswordInput } from '../../components/admin/PasswordInput';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { adminSend } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/admin/Toast';
export default function Account() {
    const qc = useQueryClient();
    const nav = useNavigate();
    const toast = useToast();
    const [cur, setCur] = useState('');
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        if (busy)
            return;
        setErr('');
        if (pw !== pw2)
            return setErr('The new passwords do not match.');
        setBusy(true);
        try {
            await adminSend('POST', '/auth/change-password', { currentPassword: cur, newPassword: pw });
            toast('ok', 'Password changed. Please sign in again.');
            qc.setQueryData(['admin-me'], null);
            nav('/admin/login', { replace: true });
        }
        catch (x) {
            setErr(x instanceof ApiError ? (x.fields?.[0]?.message ?? x.message) : 'Could not change the password.');
        }
        finally {
            setBusy(false);
        }
    };
    return (<form onSubmit={submit} noValidate className="max-w-md">
      <h1 className="!text-4xl">My account</h1>
      {[['Current password', cur, setCur, 'current-password'], ['New password (6+: upper, lower, number, special)', pw, setPw, 'new-password'], ['Confirm new password', pw2, setPw2, 'new-password']].map(([l, v, s, a], i) => (<div key={i} className="mt-4"><label className="label" htmlFor={`pw${i}`}>{l}</label><PasswordInput id={`pw${i}`} autoComplete={a} className="field" value={v} onChange={(e) => s(e.target.value)}/></div>))}
      {err && <p role="alert" className="mt-4 text-sm text-red-300">{err}</p>}
      <button type="submit" className="btn-gold mt-6 disabled:opacity-60" disabled={busy || !cur || !pw}>{busy ? 'Saving…' : 'Change password'}</button>
    </form>);
}
