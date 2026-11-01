import { defineConfig } from 'vitest/config';

// Tests always run against a throw-away local SQLite file, never against Turso Cloud.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.js'],
        globalSetup: ['test/globalSetup.js'],
        fileParallelism: false, // all files share one test database
        testTimeout: 20000,
        hookTimeout: 60000,
        env: {
            NODE_ENV: 'test',
            PORT: '4010',
            CLIENT_URL: 'http://localhost:5173',
            CLIENT_URLS: 'http://localhost:5173',
            PUBLIC_SITE_URL: 'http://localhost:5173',
            TURSO_DATABASE_URL: 'file:./test.db',
            TURSO_AUTH_TOKEN: '',
            SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
            RESEND_API_KEY: 're_test_key_not_real',
            BRAND_EMAIL_FROM: 'BrandDorrado <hello@example.com>',
            BRAND_LEAD_EMAIL_TO: 'leads@example.com',
            API_RATE_LIMIT: '100000',
            LOG_REQUESTS: 'false',
        },
    },
});
