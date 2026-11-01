import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export function ShowreelModal({ embed, onClose }) {
    const closeRef = useRef(null);
    const dialogRef = useRef(null);
    useEffect(() => {
        const opener = document.activeElement;
        closeRef.current?.focus();
        document.body.style.overflow = 'hidden';
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
            if (e.key === 'Tab') { // keep focus inside the dialog
                const f = dialogRef.current?.querySelectorAll('button, iframe, video, a[href]');
                if (f && f.length) {
                    e.preventDefault();
                    (document.activeElement === f[0] ? f[f.length - 1] : f[0]).focus();
                }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; opener?.focus(); };
    }, [onClose]);
    return (<div className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="BrandDorrado showreel" className="relative w-full max-w-4xl">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close showreel" className="absolute -top-12 right-0 inline-flex items-center gap-2 text-sm text-cream hover:text-gold"><X size={18} aria-hidden="true"/> Close</button>
        <div className="aspect-video overflow-hidden rounded-card border border-gold/40 bg-black">
          {embed.kind === 'iframe'
            ? <iframe src={embed.src} title="BrandDorrado showreel" className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
            : <video src={embed.src} className="h-full w-full" controls autoPlay playsInline/>}
        </div>
      </div>
    </div>);
}
