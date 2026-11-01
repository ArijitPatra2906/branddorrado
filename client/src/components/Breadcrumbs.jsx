import { Link } from 'react-router-dom';
export function Breadcrumbs({ items }) {
    return (<nav aria-label="Breadcrumb" className="mb-8 text-xs text-cream/60">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, i) => (<li key={it.label} className="flex items-center gap-2">
            {it.to ? <Link to={it.to} className="hover:text-gold">{it.label}</Link> : <span aria-current="page" className="text-cream/90">{it.label}</span>}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>))}
      </ol>
    </nav>);
}
