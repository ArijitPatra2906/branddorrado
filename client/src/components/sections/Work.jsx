import { Link } from 'react-router-dom';
import { SectionHeading, container } from '../Section';
import { CategorySections } from '../portfolio/CategorySections';
export function Work() {
    return (<section id="work" aria-labelledby="work-title" className="scroll-mt-20 bg-obsidian py-20 lg:py-28">
      <div className={container}>
        <SectionHeading id="work-title" eyebrow="Our work" title="Real Brands. Real Results." text="From local businesses to growing brands, we create content and strategies that bring real impact."/>
        <div className="mt-14"><CategorySections perCategory={5} compact HeadingLevel="h3"/></div>
        <div className="mt-12 text-center"><Link to="/work" className="btn-outline">View All Work</Link></div>
      </div>
    </section>);
}
