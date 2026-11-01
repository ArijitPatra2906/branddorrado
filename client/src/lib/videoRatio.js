// Shapes the admin can give a video card. The widths are written out in full so Tailwind can find them.
export const VIDEO_RATIOS = [
    { value: '16:9', label: '16:9 - Landscape (widescreen)', width: 'w-[78vw] sm:w-[26rem]' },
    { value: '4:3', label: '4:3 - Landscape', width: 'w-[70vw] sm:w-[22rem]' },
    { value: '1:1', label: '1:1 - Square', width: 'w-[62vw] sm:w-72' },
    { value: '4:5', label: '4:5 - Portrait (default)', width: 'w-[58vw] sm:w-64' },
    { value: '3:4', label: '3:4 - Portrait', width: 'w-[58vw] sm:w-64' },
    { value: '9:16', label: '9:16 - Vertical (reels, stories)', width: 'w-[50vw] sm:w-56' },
];
export const DEFAULT_RATIO = '4:5';
const find = (v) => VIDEO_RATIOS.find((r) => r.value === v) ?? VIDEO_RATIOS.find((r) => r.value === DEFAULT_RATIO);
// "16:9" -> "16 / 9", for the CSS aspect-ratio property.
export const ratioCss = (v) => find(v).value.replace(':', ' / ');
export const ratioWidth = (v) => find(v).width;
// Only cards that have a video use the chosen shape; the others keep the default portrait card.
export const cardRatio = (hasVideo, v) => (hasVideo ? find(v).value : DEFAULT_RATIO);
