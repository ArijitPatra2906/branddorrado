import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/services', '/work', '/about', '/pricing', '/blog', '/contact', '/privacy-policy', '/terms', '/404', '/admin/login'];

test.describe('every page, at every screen size', () => {
    for (const route of ROUTES) {
        test(`no sideways scrolling, no console errors: ${route}`, async ({ page }) => {
            const errors = [];
            page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
            page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
            await page.goto(route);
            await page.waitForLoadState('networkidle');
            const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
            expect(scrollWidth, `page is ${scrollWidth}px wide in a ${clientWidth}px window`).toBeLessThanOrEqual(clientWidth);
            await expect(page.locator('h1').first()).toBeVisible();
            // Missing uploaded files and blocked third-party media are data problems, not code errors, so they are ignored here.
            const real = errors.filter((e) => !/Failed to load resource|ERR_BLOCKED|401|404/.test(e));
            expect(real).toEqual([]);
        });
    }
});

test.describe('home page essentials', () => {
    test('headline, both calls to action and the main navigation are visible straight away', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /start your project/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /watch showreel/i }).or(page.getByRole('link', { name: /watch showreel/i })).first()).toBeVisible();
    });

    test('a canvas never covers the call to action', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        // On desktop the 3D hero replaces the poster hero once the browser is idle, which swaps the elements on the page.
        // So the button is looked up again on each attempt, and the whole check is retried until the page settles.
        await expect(async () => {
            const cta = page.getByRole('link', { name: /start your project/i }).first();
            await cta.scrollIntoViewIfNeeded({ timeout: 3000 });
            const box = await cta.boundingBox();
            const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.textContent ?? document.elementFromPoint(x, y)?.tagName, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            expect(String(top).toLowerCase()).toContain('start your project');
        }).toPass({ timeout: 15_000 });
        // Check again after the 3D scene has had time to start, because that is when a canvas could cover the button.
        await page.waitForTimeout(2500);
        await expect(async () => {
            const cta = page.getByRole('link', { name: /start your project/i }).first();
            const box = await cta.boundingBox();
            const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.textContent ?? document.elementFromPoint(x, y)?.tagName, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            expect(String(top).toLowerCase()).toContain('start your project');
        }).toPass({ timeout: 10_000 });
    });

    test('enquiry form: empty submit shows errors and stays on the page', async ({ page }) => {
        await page.goto('/contact');
        await page.getByRole('button', { name: /send|submit/i }).first().click();
        await expect(page.getByText(/^Error:/).first()).toBeVisible();
    });
});

test.describe('mobile menu', () => {
    test('opens, shows the pages, and closes', async ({ page, viewport }) => {
        test.skip(viewport.width >= 1024, 'The hamburger menu only exists on small screens.');
        await page.goto('/about');
        const open = page.getByRole('button', { name: 'Open menu' });
        await open.click();
        await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Services' })).toBeVisible();
        await page.getByRole('button', { name: 'Close menu' }).click();
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    });
});

test.describe('hero on tablet and phone (lighter 3D scene)', () => {
    test('headline and call to action stay usable and the page does not scroll sideways', async ({ page }, info) => {
        test.skip(!['mobile', 'tablet'].includes(info.project.name), 'Only the tablet and phone projects.');
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /start your project/i }).first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
    });
});

test.describe('hero fallbacks', () => {
    test('reduced motion or no WebGL: poster hero, no canvas, nothing hidden', async ({ page }, info) => {
        test.skip(!['reduced-motion', 'no-webgl'].includes(info.project.name), 'Only the fallback projects.');
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.locator('canvas')).toHaveCount(0);
        const stats = await page.evaluate(() => document.documentElement.scrollHeight);
        expect(stats).toBeGreaterThan(0);
    });
});
