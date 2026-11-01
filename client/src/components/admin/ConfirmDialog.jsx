import { useEffect, useRef } from 'react';
// Native <dialog>: focus is trapped and Escape closes it. Used before every destructive action.
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
    const ref = useRef(null);
    useEffect(() => { const d = ref.current; if (!d)
        return; if (open && !d.open)
        d.showModal(); if (!open && d.open)
        d.close(); }, [open]);
    return (<dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }} aria-labelledby="confirm-title" className="rounded-card border border-gold/40 bg-obsidian p-0 text-cream backdrop:bg-black/70">
      <div className="max-w-sm p-6">
        <h2 id="confirm-title" className="!text-2xl">{title}</h2>
        <p className="mt-3 text-sm text-cream/75">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-outline !py-2" onClick={onCancel} autoFocus>Cancel</button>
          <button type="button" className="rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>);
}
