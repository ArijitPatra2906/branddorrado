import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHeroMode } from '../src/components/hero/useHeroMode';

// Pretend to be a capable desktop: wide screen, no reduced-motion preference, WebGL available.
const desktop = ({ reduced = false, width = true } = {}) => {
    window.matchMedia = (q) => ({ matches: q.includes('min-width') ? width : q.includes('reduced-motion') ? reduced : false, media: q, addEventListener() {}, removeEventListener() {} });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
};
beforeEach(() => window.localStorage.clear());

describe('hero mode (3D story, lite 3D or still poster)', () => {
    it('does not wait for the setting: a capable desktop starts in 3D mode straight away', () => {
        desktop();
        expect(renderHook(() => useHeroMode(undefined)).result.current).toBe('story');
    });
    it('uses the switch once it is known', () => {
        desktop();
        expect(renderHook(() => useHeroMode(true)).result.current).toBe('story');
        expect(renderHook(() => useHeroMode(false)).result.current).toBe('static');
    });
    it('the admin can switch the 3D hero off for one kind of device only', () => {
        const hero = (devices) => ({ sceneEnabled: true, devices: { phone: true, tablet: true, laptop: true, desktop: true, ...devices } });
        desktop(); // a wide desktop screen
        expect(renderHook(() => useHeroMode(hero({ desktop: false }))).result.current).toBe('static');
        expect(renderHook(() => useHeroMode(hero({ phone: false, tablet: false }))).result.current).toBe('story');
        desktop({ width: false }); // a phone-sized screen
        expect(renderHook(() => useHeroMode(hero({ phone: false }))).result.current).toBe('static');
        expect(renderHook(() => useHeroMode(hero({ desktop: false, laptop: false }))).result.current).toBe('lite');
    });
    it('the master switch turns it off for every device', () => {
        desktop();
        expect(renderHook(() => useHeroMode({ sceneEnabled: false, devices: {} })).result.current).toBe('static');
    });
    it('reacts straight away when the admin changes a switch', () => {
        desktop();
        const { result, rerender } = renderHook(({ h }) => useHeroMode(h), { initialProps: { h: { sceneEnabled: true, devices: { desktop: true } } } });
        expect(result.current).toBe('story');
        rerender({ h: { sceneEnabled: true, devices: { desktop: false } } });
        expect(result.current).toBe('static');
        rerender({ h: { sceneEnabled: true, devices: { desktop: true } } });
        expect(result.current).toBe('story');
    });
    it('remembers an admin switching it off, so the next visit does not flip from 3D to still while loading', () => {
        desktop();
        renderHook(() => useHeroMode(false));
        expect(renderHook(() => useHeroMode(undefined)).result.current).toBe('static');
    });
    it('phones and tablets get the lighter 3D scene, not the pinned story', () => {
        desktop({ width: false });
        expect(renderHook(() => useHeroMode(true)).result.current).toBe('lite');
        expect(renderHook(() => useHeroMode(false)).result.current).toBe('static');
    });
    it('weak phones and reduced motion get the still hero', () => {
        desktop({ width: false });
        vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(2);
        expect(renderHook(() => useHeroMode(true)).result.current).toBe('static');
        vi.restoreAllMocks();
        desktop({ reduced: true });
        expect(renderHook(() => useHeroMode(true)).result.current).toBe('static');
    });
    it('no WebGL means the still hero', () => {
        desktop();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        expect(renderHook(() => useHeroMode(true)).result.current).toBe('static');
    });
});
