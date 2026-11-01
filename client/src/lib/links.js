// Only digits are accepted, with country code, e.g. 919876543210. Returns null when not configured or invalid.
export function whatsappLink(number, text) {
    if (!number || !/^\d{8,15}$/.test(number))
        return null;
    return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export const enquiryLink = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `/contact${qs ? `?${qs}` : ''}#enquiry`;
};
import { isUploadedMedia } from './media';
export function parseShowreel(raw) {
    if (!raw)
        return null;
    let u;
    try {
        u = new URL(raw);
    }
    catch {
        return null;
    }
    if (isUploadedMedia(raw) && /\.(mp4|webm|mov|ogv)$/i.test(u.pathname))
        return { kind: 'video', src: u.toString() };
    if (u.protocol !== 'https:')
        return null;
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be')
        return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?autoplay=1&rel=0` };
    if (host === 'youtube.com' || host === 'm.youtube.com') {
        const id = u.searchParams.get('v') ?? (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
        return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0` } : null;
    }
    if (host === 'vimeo.com') {
        const id = u.pathname.split('/').filter(Boolean)[0];
        return id && /^\d+$/.test(id) ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}?autoplay=1` } : null;
    }
    if (/\.(mp4|webm)$/i.test(u.pathname))
        return { kind: 'video', src: u.toString() };
    return null;
}

// Silent, looping, control-free version of an embed address, used to preview a video when a visitor hovers its card.
export function hoverEmbed(src) {
    try {
        const u = new URL(src);
        if (u.hostname.includes('youtube')) {
            const id = u.pathname.split('/').pop();
            u.search = `?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&loop=1&playlist=${encodeURIComponent(id)}`;
        }
        else if (u.hostname.includes('vimeo'))
            u.search = '?autoplay=1&muted=1&background=1';
        return u.toString();
    }
    catch {
        return null;
    }
}
