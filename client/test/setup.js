import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// jsdom has no matchMedia / IntersectionObserver; stub them so components that read them can render.
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
