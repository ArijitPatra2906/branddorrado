import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

// Make sure tests, React Testing Library and the app all share ONE copy of react and react-dom,
// resolved from this package. Two copies cause "A React Element from an older version of React was rendered".
const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));

export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ['react', 'react-dom'],
        alias: { react: pkgDir('react'), 'react-dom': pkgDir('react-dom') },
    },
    test: {
        environment: 'jsdom', globals: true, setupFiles: ['./test/setup.js'], include: ['test/**/*.test.{js,jsx}'], css: false,
        server: { deps: { inline: [/@testing-library/, /react-router/, /@tanstack/] } },
    },
});
