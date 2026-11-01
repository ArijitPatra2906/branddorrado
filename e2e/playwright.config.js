import { defineConfig, devices } from '@playwright/test';

// Browser tests for what unit tests cannot check: real layout at phone / tablet / desktop widths, reduced motion,
// WebGL switched off, and page-load measurements. They need the app running first:
//   terminal 1:  npm run dev:server      terminal 2:  npm run dev:client      terminal 3:  npm run e2e
// For a production-like check build and serve first:  npm -w client run build && npm -w client run preview -- --port 4173
// then run with E2E_BASE_URL=http://localhost:4173. Install the browsers once with: npx playwright install chromium
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
export default defineConfig({
    testDir: '.',
    testMatch: '*.spec.js',
    timeout: 60_000,
    retries: 0,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
    use: { baseURL, trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true } },
        { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
        { name: 'reduced-motion', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } },
        { name: 'no-webgl', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] } } },
    ],
});
