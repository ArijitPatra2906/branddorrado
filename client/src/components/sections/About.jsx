import { Link } from 'react-router-dom';
import { Logo } from '../Logo';
import { Reveal, SectionHeading, container } from '../Section';
import { useSiteSettings } from '../../lib/queries';
export function About() {
    const { data: s } = useSiteSettings();
    const stats = s?.aboutStats ?? [];
    return (<section id="about" aria-labelledby="about-title" className="scroll-mt-20 bg-obsidian py-20 lg:py-28">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <SectionHeading id="about-title" center={false} eyebrow="About us" title="More Than An Agency." text="BrandDorrado is a creative and digital marketing agency founded by Raj and Adi. We combine creativity, strategy and technology to help businesses build strong and memorable brands."/>
          {stats.length > 0 && (<dl className="mt-8 grid max-w-md grid-cols-2 gap-5 rounded-card border border-gold/25 p-5">
              {stats.map((st) => (<div key={st.label}><dd className="font-serif text-3xl text-gold">{st.value}</dd><dt className="mt-1 text-xs uppercase tracking-widest text-cream/60">{st.label}</dt></div>))}
            </dl>)}
          <Link to="/about" className="btn-outline mt-9">Our Story</Link>
        </div>
        <Reveal>
          <div className="relative aspect-[5/4] overflow-hidden rounded-card border border-gold/25 bg-[linear-gradient(150deg,#2a2112,#111_65%)]">
            {s?.aboutImageUrl
            ? <img src={s.aboutImageUrl} alt="The BrandDorrado creative studio" loading="lazy" className="h-full w-full object-cover"/>
            : <div aria-hidden="true" className="grid h-full w-full place-items-center"><Logo variant="symbol" className="h-2/3 w-auto opacity-30"/></div>}
          </div>
        </Reveal>
      </div>
    </section>);
}
