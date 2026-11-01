import { createContext, useCallback, useContext, useState } from 'react';
const Ctx = createContext(() => { });
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const push = useCallback((kind, text) => {
        const id = Date.now() + Math.random();
        setItems((v) => [...v, { id, kind, text }]);
        setTimeout(() => setItems((v) => v.filter((x) => x.id !== id)), 5000);
    }, []);
    return (<Ctx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2">
        {items.map((t) => <p key={t.id} className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${t.kind === 'ok' ? 'border-gold bg-obsidian text-cream' : 'border-red-500 bg-obsidian text-red-200'}`}>{t.kind === 'err' ? 'Error: ' : ''}{t.text}</p>)}
      </div>
    </Ctx.Provider>);
}
