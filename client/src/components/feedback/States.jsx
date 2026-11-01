export const Skeleton = ({ className = '' }) => <div aria-hidden="true" className={`animate-pulse rounded-card bg-gold/15 ${className}`}/>;
export function EmptyState({ title, children }) {
    return (<div className="mx-auto max-w-xl rounded-card border border-gold/40 px-6 py-10 text-center">
      <p className="font-serif text-2xl">{title}</p>
      {children && <p className="mt-2 text-sm opacity-70">{children}</p>}
    </div>);
}
export function ErrorState({ onRetry }) {
    return (<div role="alert" className="mx-auto max-w-xl rounded-card border border-gold/40 px-6 py-10 text-center">
      <p className="font-serif text-2xl">We couldn't load this right now.</p>
      <p className="mt-2 text-sm opacity-70">Please check your connection and try again.</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-gold mt-5">Try again</button>}
    </div>);
}
