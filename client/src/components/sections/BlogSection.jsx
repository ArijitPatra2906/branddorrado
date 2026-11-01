import { Link } from 'react-router-dom';
import { SectionHeading, container } from '../Section';
import { BlogCategorySections } from '../blog/BlogCategorySections';
// Homepage "Our Blog" section: the same layout as "Our Work" (dark section, centred heading, category sub-sections of five cards, "View All" button).
export function BlogSection() {
    return (<section id="blog" aria-labelledby="blog-title" className="scroll-mt-20 bg-obsidian py-20 lg:py-28">
      <div className={container}>
        <SectionHeading id="blog-title" eyebrow="Our blog" title="Ideas for Growing Brands." text="Practical thinking on branding, content and digital growth from the BrandDorrado team."/>
        <div className="mt-14"><BlogCategorySections perCategory={5} compact HeadingLevel="h3"/></div>
        <div className="mt-12 text-center"><Link to="/blog" className="btn-outline">View All Articles</Link></div>
      </div>
    </section>);
}
