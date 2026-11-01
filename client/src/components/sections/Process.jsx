import { Compass, Lightbulb, PenTool, TrendingUp } from 'lucide-react';
import { Reveal, SectionHeading, container } from '../Section';
const steps = [
    { n: '01', title: 'Discover', text: 'We understand your business, goals and audience.', Icon: Compass },
    { n: '02', title: 'Strategy', text: 'We create a custom plan for your brand.', Icon: Lightbulb },
    { n: '03', title: 'Create', text: 'We produce high-quality content and creative assets.', Icon: PenTool },
    { n: '04', title: 'Grow', text: 'We manage, optimise and scale your brand.', Icon: TrendingUp },
];
export function Process() {
    return (<section id="process" aria-labelledby="process-title" className="scroll-mt-20 bg-cream py-20 text-obsidian lg:py-28">
      <div className={container}>
        <SectionHeading id="process-title" eyebrow="Our process" title="A Simple Process to Big Results."/>
        <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
          <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gold/60 md:block"/>
          {steps.map(({ n, title, text, Icon }) => (<li key={n}>
              <Reveal className="relative flex gap-5 md:flex-col md:items-center md:text-center">
                <span className="relative z-10 grid h-16 w-16 shrink-0 place-items-center rounded-full border border-gold bg-cream text-gold-deep"><Icon size={26} strokeWidth={1.4} aria-hidden="true"/></span>
                <div>
                  <p className="font-serif text-lg text-gold-deep">{n}</p>
                  <h3 className="text-2xl md:mt-1">{title}</h3>
                  <p className="mt-2 max-w-[16rem] text-sm text-obsidian/70">{text}</p>
                </div>
              </Reveal>
            </li>))}
        </ol>
      </div>
    </section>);
}
