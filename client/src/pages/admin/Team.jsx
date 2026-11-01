import { PasswordInput } from '../../components/admin/PasswordInput';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AREA_LABELS, adminGet, adminSend } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/admin/Toast';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { ErrorState, Skeleton } from '../../components/feedback/States';
import { formatDate } from '../../lib/format';
const AREAS = Object.keys(AREA_LABELS);
function Access({ mode, areas, onMode, onAreas }) {
    return (<fieldset className="mt-4"><legend className="label">What can this admin do?</legend>
      <label className="mt-1 flex items-center gap-3 text-sm"><input type="radio" className="accent-[#C89A3C]" checked={mode === 'all'} onChange={() => onMode('all')}/>Everything an admin can do (all areas)</label>
      <label className="mt-2 flex items-center gap-3 text-sm"><input type="radio" className="accent-[#C89A3C]" checked={mode === 'custom'} onChange={() => onMode('custom')}/>Only specific areas</label>
      {mode === 'custom' && <div className="ml-7 mt-3 grid gap-2 sm:grid-cols-2">{AREAS.map((a) => (<label key={a} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C89A3C]" checked={areas.includes(a)} onChange={(e) => onAreas(e.target.checked ? [...areas, a] : areas.filter((x) => x !== a))}/>{AREA_LABELS[a]}</label>))}</div>}
    </fieldset>);
}
export default function Team() {
    const qc = useQueryClient();
    const toast = useToast();
    const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin-team'], queryFn: () => adminGet('/admin/team') });
    const [draft, setDraft] = useState(null);
    const [fieldErr, setFieldErr] = useState({});
    const [edit, setEdit] = useState(null);
    const [toggle, setToggle] = useState(null);
    const done = () => qc.invalidateQueries({ queryKey: ['admin-team'] });
    const fail = (x) => { if (x instanceof ApiError && x.fields)
        setFieldErr(Object.fromEntries(x.fields.map((f) => [f.path, f.message]))); toast('err', x instanceof ApiError ? x.message : 'Something went wrong.'); };
    const perms = (mode, areas) => (mode === 'all' ? 'all' : areas);
    const create = useMutation({ mutationFn: (d) => adminSend('POST', '/admin/team', { name: d.name.trim(), email: d.email.trim(), password: d.password, permissions: perms(d.mode, d.areas) }),
        onSuccess: () => { toast('ok', 'Admin created. Share the password with them securely.'); setDraft(null); setFieldErr({}); done(); }, onError: fail });
    const update = useMutation({ mutationFn: (v) => adminSend('PATCH', `/admin/team/${v.id}`, v.body), onSuccess: () => { toast('ok', 'Saved.'); setEdit(null); setToggle(null); done(); }, onError: fail });
    const submit = (e) => { e.preventDefault(); if (draft && !create.isPending) {
        setFieldErr({});
        create.mutate(draft);
    } };
    const err = (k) => fieldErr[k] && <p role="alert" className="mt-1 text-xs text-red-300">{fieldErr[k]}</p>;
    if (draft)
        return (<form onSubmit={submit} noValidate className="max-w-xl">
      <h1 className="!text-4xl">Add an admin</h1>
      <p className="mt-2 text-sm text-cream/65">Admins can carry out all administrative tasks by default. Limit them to specific areas if you want them to handle only certain work.</p>
      {['name', 'email', 'password'].map((k) => (<div key={k} className="mt-4"><label className="label" htmlFor={`t-${k}`}>{k === 'password' ? 'Temporary password (6+: upper, lower, number, special)' : k}</label>
          {k === 'password' ? <PasswordInput id="t-password" autoComplete="new-password" className="field" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}/> : <input id={`t-${k}`} type={k === 'email' ? 'email' : 'text'} autoComplete="off" className="field" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}/>}{err(k)}</div>))}
      <Access mode={draft.mode} areas={draft.areas} onMode={(mode) => setDraft({ ...draft, mode })} onAreas={(areas) => setDraft({ ...draft, areas })}/>{err('permissions')}
      <div className="mt-8 flex gap-3"><button type="submit" className="btn-gold disabled:opacity-60" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create admin'}</button><button type="button" className="btn-outline" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>);
    return (<div>
      <div className="flex items-center justify-between gap-3"><h1 className="!text-4xl">Team</h1><button type="button" className="btn-gold !py-2.5" onClick={() => { setFieldErr({}); setDraft({ name: '', email: '', password: '', mode: 'all', areas: [] }); }}>Add admin</button></div>
      <div className="mt-6">
        {isLoading && <Skeleton className="h-48"/>}{isError && <ErrorState onRetry={() => refetch()}/>}
        {data && <ul className="space-y-4">{data.map((m) => (<li key={m.id} className="rounded-card border border-gold/25 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-medium">{m.name} <span className="ml-2 rounded-full border border-gold/50 px-2 py-0.5 text-[0.65rem] uppercase tracking-widest text-gold">{m.role === 'super_admin' ? 'Super admin' : 'Admin'}</span>{!m.active && <span className="ml-2 text-xs text-red-300">Deactivated</span>}</p>
                <p className="text-sm text-cream/60">{m.email} · last sign-in {m.lastLoginAt ? formatDate(m.lastLoginAt) : 'never'}</p>
                <p className="mt-2 text-sm">Access: {m.access === 'all' ? 'All areas' : m.effective.map((a) => AREA_LABELS[a]).join(', ')}</p></div>
              {m.role === 'admin' && <div className="flex gap-4 text-sm">
                <button type="button" className="text-gold hover:underline" onClick={() => setEdit({ m, mode: m.access === 'all' ? 'all' : 'custom', areas: m.access === 'all' ? [] : m.access, password: '' })}>Edit access<span className="sr-only"> for {m.name}</span></button>
                <button type="button" className={m.active ? 'text-red-300 hover:underline' : 'text-gold hover:underline'} onClick={() => m.active ? setToggle(m) : update.mutate({ id: m.id, body: { active: true } })}>{m.active ? 'Deactivate' : 'Reactivate'}<span className="sr-only"> {m.name}</span></button></div>}
            </div>
          </li>))}</ul>}
      </div>
      {edit && (<div className="mt-8 max-w-xl rounded-card border border-gold/40 p-6">
          <h2 className="!text-2xl">Edit {edit.m.name}</h2>
          <Access mode={edit.mode} areas={edit.areas} onMode={(mode) => setEdit({ ...edit, mode })} onAreas={(areas) => setEdit({ ...edit, areas })}/>
          <div className="mt-5"><label className="label" htmlFor="rp">Reset password (optional; 6+: upper, lower, number, special)</label><PasswordInput id="rp" autoComplete="new-password" className="field" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })}/><p className="mt-1 text-xs text-cream/50">Resetting signs them out everywhere.</p>{err('password')}</div>
          <div className="mt-6 flex gap-3"><button type="button" className="btn-gold disabled:opacity-60" disabled={update.isPending} onClick={() => { setFieldErr({}); update.mutate({ id: edit.m.id, body: { permissions: perms(edit.mode, edit.areas), ...(edit.password ? { password: edit.password } : {}) } }); }}>Save</button><button type="button" className="btn-outline" onClick={() => setEdit(null)}>Cancel</button></div>
        </div>)}
      <ConfirmDialog open={!!toggle} title="Deactivate this admin?" confirmLabel="Deactivate" message={`${toggle?.name ?? ''} will be signed out immediately and will not be able to sign in. Their activity history is kept. You can reactivate them later.`} onCancel={() => setToggle(null)} onConfirm={() => toggle && update.mutate({ id: toggle.id, body: { active: false } })}/>
    </div>);
}
