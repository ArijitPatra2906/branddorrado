import { Hero } from '../components/sections/Hero';
import { Services } from '../components/sections/Services';
import { Work } from '../components/sections/Work';
import { Process } from '../components/sections/Process';
import { About } from '../components/sections/About';
import { Testimonials } from '../components/sections/Testimonials';
import { BlogSection } from '../components/sections/BlogSection';
import { FinalCta } from '../components/sections/FinalCta';
export default function Home() {
    return <><Hero /><Services /><Work /><Process /><About /><Testimonials /><BlogSection /><FinalCta /></>;
}
