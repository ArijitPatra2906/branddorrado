import { describe, expect, it } from 'vitest';
import { settingsSchema, toPublic } from '../src/lib/siteSettings.js';

describe('hero 3D device switches', () => {
    it('are all on by default, including for settings saved before the switches existed', () => {
        const fresh = settingsSchema.parse({});
        expect(fresh.hero.devices).toEqual({ phone: true, tablet: true, laptop: true, desktop: true });
        const old = settingsSchema.parse({ hero: { sceneEnabled: true, motion: 'full' } });
        expect(old.hero.devices).toEqual({ phone: true, tablet: true, laptop: true, desktop: true });
    });
    it('keep what the admin chose and are sent to visitors', () => {
        const s = settingsSchema.parse({ hero: { devices: { phone: false, tablet: false } } });
        expect(s.hero.devices).toEqual({ phone: false, tablet: false, laptop: true, desktop: true });
        expect(toPublic(s).hero.devices.phone).toBe(false);
    });
    it('reject values that are not true or false', () => {
        expect(settingsSchema.safeParse({ hero: { devices: { phone: 'no' } } }).success).toBe(false);
    });
});
