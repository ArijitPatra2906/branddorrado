import { container } from '../components/Section';
import { Markdown } from '../components/Markdown';
import { usePageMeta } from '../components/seo/usePageMeta';
import { useSiteSettings } from '../lib/queries';
// Content is edited in Admin → Settings. The defaults below only describe what this website actually does with data;
// they are not a substitute for a lawyer-reviewed policy.
const PRIVACY_DEFAULT = `## What we collect
When you send a project enquiry we collect the details you enter: your name, email address, and optionally your business name, phone or WhatsApp number, website, budget, timeline and project description.

## How we use it
We use these details only to respond to your enquiry and to follow up about it. We send you one acknowledgement email when you submit the form.

## Where it is stored
Enquiries are stored in a cloud database and notification emails are sent through an email delivery provider. Access is limited to the BrandDorrado team.

## Your choices
You can ask us to correct or delete your enquiry at any time by emailing us at the address on the contact page.`;
const TERMS_DEFAULT = `Our full terms and conditions are being finalised. For questions about working with BrandDorrado before then, please get in touch through the contact page.`;
export function Legal({ kind }) {
    const { data: s } = useSiteSettings();
    const title = kind === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions';
    usePageMeta(title);
    const body = s?.legal?.[kind]?.trim() || (kind === 'privacy' ? PRIVACY_DEFAULT : TERMS_DEFAULT);
    return (<section className={`${container} max-w-3xl py-16 lg:py-24`}>
      <p className="eyebrow">Legal</p><h1 className="mt-4">{title}</h1>
      <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold"/>
      <Markdown source={body} className="mt-8 text-cream/80"/>
    </section>);
}
export const PrivacyPage = () => <Legal kind="privacy"/>;
export const TermsPage = () => <Legal kind="terms"/>;
