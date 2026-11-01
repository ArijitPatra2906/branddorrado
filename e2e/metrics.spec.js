import { mkdirSync, writeFileSync } from 'node:fs';
import { test } from '@playwright/test';

// Records real numbers (not pass/fail targets) for the home page and the work page, so results can be documented.
// Output: e2e/results/metrics-<project>.json. Run against a production build for meaningful figures.
test('record page-load measurements', async ({ page }, info) => {
    const out = {};
    for (const route of ['/', '/work']) {
        await page.addInitScript(() => {
            window.__m = { lcp: 0, cls: 0 };
            new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
            new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        });
        let bytes = 0;
        page.on('response', async (r) => { try { bytes += Number(r.headers()['content-length'] || 0); } catch { /* ignore */ } });
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.mouse.wheel(0, 800); // a scroll, so layout shifts while scrolling are counted too
        await page.waitForTimeout(1500);
        const m = await page.evaluate(() => ({ ...window.__m, domNodes: document.getElementsByTagName('*').length, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }));
        out[route] = { ...m, lcpMs: Math.round(m.lcp), cls: Number(m.cls.toFixed(3)), transferKB: Math.round(bytes / 1024), note: 'transfer counts responses that sent a content-length header' };
        delete out[route].lcp;
    }
    mkdirSync('e2e/results', { recursive: true });
    writeFileSync(`e2e/results/metrics-${info.project.name}.json`, JSON.stringify({ project: info.project.name, viewport: info.project.use.viewport, measuredAt: new Date().toISOString(), ...out }, null, 2));
});
