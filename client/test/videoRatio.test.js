import { describe, expect, it } from 'vitest';
import { VIDEO_RATIOS, cardRatio, ratioCss, ratioWidth } from '../src/lib/videoRatio';

describe('video card ratios', () => {
    it('offers the six shapes and turns them into CSS', () => {
        expect(VIDEO_RATIOS.map((r) => r.value)).toEqual(['16:9', '4:3', '1:1', '4:5', '3:4', '9:16']);
        expect(ratioCss('16:9')).toBe('16 / 9');
        expect(ratioCss('9:16')).toBe('9 / 16');
    });
    it('falls back to the default portrait card for unknown values and for cards without a video', () => {
        expect(ratioCss('nonsense')).toBe('4 / 5');
        expect(ratioWidth(undefined)).toBe(ratioWidth('4:5'));
        expect(cardRatio(false, '16:9')).toBe('4:5');
        expect(cardRatio(true, '16:9')).toBe('16:9');
        expect(cardRatio(true, null)).toBe('4:5');
    });
});
