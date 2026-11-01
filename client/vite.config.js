import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // host: true lets phones and other computers on the network open the dev site
    server: { port: 5173, host: true },
});
