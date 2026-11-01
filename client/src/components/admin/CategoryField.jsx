import { useMemo, useState } from 'react';
export const BLOG_CATEGORIES = ['General', 'Branding', 'Social Media', 'Content Creation', 'Video & Reels', 'Web Design', 'Digital Marketing', 'Case Studies', 'Agency News'];
export const PRESET_CATEGORIES = ['Automotive', 'Restaurants', 'Fashion', 'Fitness', 'Travel', 'Products', 'Websites', 'Salons & Beauty', 'Hotels', 'Retail'];
// Picks a category from one list (so spellings stay consistent), or lets the admin add a new one.
// The list is the built-in suggestions plus every category saved earlier (`saved`, loaded from the database). A category added here is
// saved to the database when the project or article is saved, and is in the list for every later one.
export function CategoryField({ id, value, onChange, describedBy, invalid, presets = PRESET_CATEGORIES, saved = [] }) {
    const [adding, setAdding] = useState(false);
    const options = useMemo(() => {
        const seen = new Map();
        for (const c of [...presets, ...saved]) {
            const n = String(c ?? '').trim();
            if (n && !seen.has(n.toLowerCase()))
                seen.set(n.toLowerCase(), n);
        }
        return [...seen.values()].sort((a, b) => a.localeCompare(b));
    }, [presets, saved]);
    const custom = value && !options.some((c) => c.toLowerCase() === value.toLowerCase()) && !adding;
    // If the typed name is the same as an existing category apart from capitals, use the existing spelling.
    const settle = () => {
        const hit = options.find((c) => c.toLowerCase() === String(value ?? '').trim().toLowerCase());
        onChange(hit ?? String(value ?? '').trim());
        if (hit)
            setAdding(false);
    };
    return (<div>
      <select id={id} className="field" value={adding ? '__new' : value || ''} aria-describedby={describedBy} aria-invalid={invalid || undefined}
        onChange={(e) => { if (e.target.value === '__new') {
            setAdding(true);
            onChange('');
        }
        else {
            setAdding(false);
            onChange(e.target.value);
        } }}>
        <option value="">Choose a category…</option>
        {options.map((c) => <option key={c} value={c}>{c}</option>)}
        {custom && <option value={value}>{value}</option>}
        <option value="__new">Add a new category…</option>
      </select>
      {adding && <input aria-label="New category name" className="field mt-2" maxLength={60} placeholder="e.g. Real Estate" value={value ?? ''} onChange={(e) => onChange(e.target.value)} onBlur={settle} autoFocus/>}
    </div>);
}
