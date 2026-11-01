// Idempotent: safe to re-run. Existing rows (including admin edits) are never overwritten.
import { eq, sql } from 'drizzle-orm';
import { db, libsql } from '../db/client.js';
import { pricingPackages, projects, services, siteSettings } from '../db/schema.js';
const serviceSeed = [
    { title: 'Content Creation', slug: 'content-creation', iconId: 'clapperboard', shortDescription: 'Reels, videos, photography, and brand storytelling.' },
    { title: 'Social Media Management', slug: 'social-media-management', iconId: 'share', shortDescription: 'Strategy, posting, content calendars, and community growth.' },
    { title: 'Graphic & Brand Design', slug: 'graphic-brand-design', iconId: 'palette', shortDescription: 'Posters, creative assets, logos, and visual identity.' },
    { title: 'Website Development', slug: 'website-development', iconId: 'code', shortDescription: 'Modern, responsive websites and digital experiences.' },
    { title: 'Digital Marketing', slug: 'digital-marketing', iconId: 'megaphone', shortDescription: 'Campaigns, advertising creatives, and lead-generation support.' },
];
// Sample categories only. Drafts, flagged as demo, never auto-published, no results or client claims.
const demoSeed = [
    { industry: 'Automotive', projectType: 'Brand Campaign' }, { industry: 'Restaurant', projectType: 'Social Media Growth' },
    { industry: 'Fitness', projectType: 'Content Creation' }, { industry: 'Travel', projectType: 'Storytelling' },
    { industry: 'Product', projectType: 'Promotional Video' },
];
try {
    await db.insert(services).values(serviceSeed.map((s, i) => ({ ...s, displayOrder: i + 1, status: 'published' })))
        .onConflictDoNothing({ target: services.slug });
    await db.insert(projects).values(demoSeed.map((d) => ({
        title: `Demo: ${d.industry} — ${d.projectType}`, slug: `demo-${d.industry.toLowerCase()}`, industry: d.industry,
        projectType: d.projectType, shortDescription: 'Demonstration entry. Replace with a real, approved project before publishing.',
        isDemo: true, status: 'draft',
    }))).onConflictDoNothing({ target: projects.slug });
    // Placeholder packages: unavailable (hidden publicly), no prices. The admin sets real terms, then marks them available.
    await db.insert(pricingPackages).values(['Starter', 'Growth', 'Custom'].map((name, i) => ({
        name, slug: name.toLowerCase(), displayOrder: i + 1, available: false, customQuote: name === 'Custom',
        description: 'Placeholder package. Set real details in the admin before making it available.',
    }))).onConflictDoNothing({ target: pricingPackages.slug });
    await db.insert(siteSettings).values({ id: 1, data: {} }).onConflictDoNothing({ target: siteSettings.id });
    const [{ n }] = await db.select({ n: sql `count(*)` }).from(services);
    console.log(`Seed complete. Services in database: ${n}`);
    // Optional: `npm -w server run seed -- --reference-stats` fills the hero strip with the figures shown in the design reference
    // and marks them verified. Only use it if those numbers are true for BrandDorrado; otherwise leave the strip hidden.
    if (process.argv.includes('--reference-stats')) {
        const heroStats = [['Brands', '50+'], ['Views Generated', '130M+'], ['Engagement', '3M+'], ['Community', '100K+']]
            .map(([label, value]) => ({ label, value, verified: true }));
        const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
        await db.update(siteSettings).set({ data: { ...(row?.data ?? {}), heroStats } }).where(eq(siteSettings.id, 1));
        console.log('Hero statistics set from the design reference.');
    }
}
catch (err) {
    if (String(err.message).includes('no such table') || String(err.cause?.message).includes('no such table')) {
        console.error('\nThe database tables do not exist yet. Run this first, from the repo root:\n\n    npm run db:push\n\nthen run the seed again.');
        process.exitCode = 1;
    }
    else
        throw err;
}
finally {
    libsql.close();
}
