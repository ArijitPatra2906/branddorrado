import { useEffect, useState } from 'react';
function hasWebGL() {
    try {
        const c = document.createElement('canvas');
        const ok = !!(c.getContext('webgl2') || c.getContext('webgl'));
        c.width = c.height = 0;
        return ok;
    }
    catch {
        return false;
    }
}
// Which kind of device this is, so the admin can switch the 3D hero on or off per device. Based on screen width, plus touch:
// phone < 768px, tablet 768-1023px (or a touch screen under 1400px), laptop < 1600px, desktop 1600px and wider.
export function deviceClass() {
    const mq = (q) => window.matchMedia(q).matches;
    if (!mq('(min-width: 768px)'))
        return 'phone';
    if (!mq('(min-width: 1024px)'))
        return 'tablet';
    if (!mq('(min-width: 1400px)') && mq('(hover: none) and (pointer: coarse)'))
        return 'tablet';
    return mq('(min-width: 1600px)') ? 'desktop' : 'laptop';
}
// The admin's switches arrive from the API a moment after the page starts. Waiting for them would show the short poster hero first
// and then swap to the very tall 3D hero, which pushes the whole page down (a large layout shift). So until the setting is known,
// the last value this browser saw for this kind of device is used, and if there is none the default (on) is assumed.
const cacheKey = (cls) => `bd.hero.scene.${cls}`;
const readCached = (cls) => {
    try {
        const v = window.localStorage.getItem(cacheKey(cls));
        return v === 'true' ? true : v === 'false' ? false : undefined;
    }
    catch {
        return undefined;
    }
};
const writeCached = (cls, v) => {
    try {
        window.localStorage.setItem(cacheKey(cls), String(v));
    }
    catch { /* private mode: ignore */ }
};
// hero = the site's hero settings ({ sceneEnabled, devices }), a plain true/false for the master switch, or undefined while loading.
const normalise = (hero) => (hero === undefined || hero === null ? undefined : typeof hero === 'boolean' ? { sceneEnabled: hero, devices: {} } : hero);
const isOn = (hero, cls) => hero.sceneEnabled !== false && hero.devices?.[cls] !== false;
// The 3D hero is progressive enhancement: 'story' (desktop, pinned scroll story), 'lite' (tablet/phone, light scene), else 'static' (poster image).
export function useHeroMode(heroSetting) {
    const hero = normalise(heroSetting);
    const evaluate = () => {
        const cls = deviceClass();
        const enabled = hero ? isOn(hero, cls) : (readCached(cls) ?? true);
        if (enabled !== true || import.meta.env.VITE_ENABLE_3D === 'false')
            return 'static';
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            return 'static';
        const nav = navigator;
        if (nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2))
            return 'static';
        if (!hasWebGL())
            return 'static';
        if (window.matchMedia('(min-width: 1024px)').matches)
            return 'story'; // desktop: pinned scroll story
        // Tablet + phone: a lighter 3D scene (no pinning). Weak devices keep the poster.
        if (import.meta.env.VITE_ENABLE_3D_MOBILE === 'false' || (nav.hardwareConcurrency ?? 4) < 4)
            return 'static';
        return 'lite';
    };
    const [mode, setMode] = useState(() => (typeof window === 'undefined' ? 'static' : evaluate()));
    // Re-evaluates the moment the admin changes any switch (the page refetches the settings after a save) and when the screen changes size.
    const key = hero ? JSON.stringify([hero.sceneEnabled, hero.devices?.phone, hero.devices?.tablet, hero.devices?.laptop, hero.devices?.desktop]) : 'loading';
    useEffect(() => {
        if (hero)
            writeCached(deviceClass(), isOn(hero, deviceClass()));
        const queries = ['(min-width: 768px)', '(min-width: 1024px)', '(min-width: 1400px)', '(min-width: 1600px)', '(prefers-reduced-motion: reduce)'].map((q) => window.matchMedia(q));
        const update = () => {
            if (hero)
                writeCached(deviceClass(), isOn(hero, deviceClass()));
            setMode(evaluate());
        };
        update();
        queries.forEach((q) => q.addEventListener('change', update));
        return () => queries.forEach((q) => q.removeEventListener('change', update));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return mode;
}
