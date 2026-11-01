import { Link } from 'react-router-dom';
import { container } from '../components/Section';
import { usePageMeta } from '../components/seo/usePageMeta';
import { useSiteSettings } from '../lib/queries';
import { enquiryLink } from '../lib/links';
const approach = [
    ['Discover', 'We learn your business, goals and audience before we make anything.'],
    ['Strategy', 'We build a custom plan for your brand.'],
    ['Create', 'We produce high-quality content and creative assets.'],
    ['Grow', 'We manage, optimise and scale your brand.'],
];
export default function About() {
    usePageMeta('About', 'BrandDorrado is a creative and digital marketing agency founded by Raj and Adi.');
    const { data: s } = useSiteSettings();
    return (<>
      <section className={`${container} py-16 lg:py-24`}>
        <p className="eyebrow">About us</p>
        <h1 className="mt-4">More Than An Agency.</h1>
        <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
        <p className="mt-6 max-w-2xl text-lg text-cream/80">BrandDorrado is a creative and digital marketing agency founded by Raj and Adi. We combine creativity, strategy and technology to help businesses build strong and memorable brands.</p>
        {s?.aboutImageUrl && <img src={s.aboutImageUrl} alt="The BrandDorrado studio" className="mt-10 aspect-[16/9] w-full rounded-card border border-gold/25 object-cover"/>}
      </section>
      <section className="bg-cream py-16 text-obsidian lg:py-20" aria-labelledby="approach">
        <div className={container}>
          <h2 id="approach">How we work.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {approach.map(([t, d], i) => <li key={t} className="border-t border-gold pt-4"><span className="font-serif text-2xl text-gold-deep">0{i + 1}</span><h3 className="mt-2 !text-2xl">{t}</h3><p className="mt-2 text-sm opacity-75">{d}</p></li>)}
          </ol>
        </div>
      </section>
      <section className={`${container} py-16 lg:py-20`}>
        {s && s.aboutStats.length > 0 && <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">{s.aboutStats.map((x) => <div key={x.label}><dd className="font-serif text-4xl text-gold">{x.value}</dd><dt className="text-sm text-cream/65">{x.label}</dt></div>)}</dl>}
        <Link to={enquiryLink()} className="btn-gold mt-12">Start a Project</Link>
      </section>
    </>);
}
