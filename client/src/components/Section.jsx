import { useReveal } from '../lib/useReveal';
export function Reveal({ children, className = '' }) {
    const ref = useReveal();
    return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}
export function SectionHeading({ id, eyebrow, title, text, center = true }) {
    return (<Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-4">{title}</h2>
      <span aria-hidden="true" className={`mt-5 block h-px w-14 bg-gold ${center ? 'mx-auto' : ''}`}/>
      {text && <p className="mt-5 text-base opacity-75">{text}</p>}
    </Reveal>);
}
export const container = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
