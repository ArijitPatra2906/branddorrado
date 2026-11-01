import { afterEach, describe, expect, it, vi } from 'vitest';

// Loads apiBase.js as if the page had been opened from the given host.
async function loadFrom(hostname) {
    vi.resetModules();
    vi.stubGlobal('location', { hostname });
    Object.defineProperty(window, 'location', { value: { hostname }, configurable: true });
    return import('../src/lib/apiBase');
}
afterEach(() => vi.unstubAllGlobals());

describe('API address on another device', () => {
    it('keeps localhost when the page is opened on localhost', async () => {
        const m = await loadFrom('localhost');
        expect(m.API_BASE).toBe('http://localhost:4000/api');
        expect(m.localizeMedia('http://localhost:4000/media/a.jpg')).toBe('http://localhost:4000/media/a.jpg');
    });
    it('uses the page host when opened by a network address', async () => {
        const m = await loadFrom('192.168.1.20');
        expect(m.API_BASE).toBe('http://192.168.1.20:4000/api');
    });
    it('points uploaded-file links at that address, deeply, and turns them back when sending', async () => {
        const m = await loadFrom('192.168.1.20');
        const id = '0586cbe0-f5c9-4de6-9955-07eec2caf6dc';
        const out = m.localizeMedia({ cover: `http://localhost:4000/media/${id}.jpg`, gallery: [{ url: `http://127.0.0.1:4000/media/${id}.png` }], site: 'https://example.com/media/x.jpg', n: 3 });
        expect(out.cover).toBe(`http://192.168.1.20:4000/media/${id}.jpg`);
        expect(out.gallery[0].url).toBe(`http://192.168.1.20:4000/media/${id}.png`);
        expect(out.site).toBe('https://example.com/media/x.jpg');
        expect(out.n).toBe(3);
        const sent = m.canonicalizeMediaText(JSON.stringify({ cover: out.cover }));
        expect(JSON.parse(sent).cover).toBe(`http://localhost:4000/media/${id}.jpg`);
    });
});
