// Makes a JPEG thumbnail from a video file chosen on the admin's computer (runs in the browser, no server tools needed).
// Resolves to a File, or throws if this browser cannot decode the video.
const wait = (el, ok, ms = 10000) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    el.addEventListener(ok, () => { clearTimeout(t); resolve(); }, { once: true });
    el.addEventListener('error', () => { clearTimeout(t); reject(new Error('decode')); }, { once: true });
});
export async function captureThumbnail(file) {
    const url = URL.createObjectURL(file);
    try {
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.src = url;
        await wait(v, 'loadeddata');
        v.currentTime = Math.min(1, (v.duration || 1) * 0.1);
        await wait(v, 'seeked');
        if (!v.videoWidth)
            throw new Error('no frame');
        const w = Math.min(1280, v.videoWidth);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = Math.round(w * v.videoHeight / v.videoWidth);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
        if (!blob)
            throw new Error('encode');
        return new File([blob], 'video-thumbnail.jpg', { type: 'image/jpeg' });
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
