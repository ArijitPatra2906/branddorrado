import { randomUUID } from 'node:crypto';
import { open } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { media, mediaChunks } from '../db/schema.js';
import { env } from '../config/env.js';
// Uploaded photos and videos are stored in the Turso database: a row in `media` (details) plus the file in 1 MB pieces in `media_chunks`.
export const LIMITS = { image: 250 * 1024 * 1024, video: 500 * 1024 * 1024 };
export const CHUNK = 1024 * 1024;
export const MIME = {
    jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogv: 'video/ogg',
};
export const EXTENSIONS = Object.keys(MIME);
// Identify the real file type from its first bytes. The browser-supplied name and MIME type are never trusted.
// `unsupported` marks real formats that browsers cannot show, so the admin gets a helpful message instead of a broken file.
export function sniff(b) {
    if (b.length < 12)
        return null;
    const at = (a, e) => b.toString('latin1', a, e);
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
        return { kind: 'image', ext: 'jpg' };
    if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return { kind: 'image', ext: 'png' };
    if (at(0, 4) === 'GIF8')
        return { kind: 'image', ext: 'gif' };
    if (at(0, 4) === 'RIFF' && at(8, 12) === 'WEBP')
        return { kind: 'image', ext: 'webp' };
    if (at(4, 8) === 'ftyp') {
        const brand = at(8, 12);
        if (brand === 'avif' || brand === 'avis')
            return { kind: 'image', ext: 'avif' };
        if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand))
            return { kind: 'image', ext: 'heic', unsupported: 'HEIC/HEIF photos (common on iPhones) cannot be shown in most browsers. Export or share the photo as JPG or PNG first.' };
        if (brand === 'qt  ')
            return { kind: 'video', ext: 'mov' };
        return { kind: 'video', ext: 'mp4' }; // isom, mp42, avc1, M4V, 3gp and the other MP4-family brands
    }
    if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
        if (b.toString('latin1', 0, 64).includes('webm'))
            return { kind: 'video', ext: 'webm' };
        return { kind: 'video', ext: 'mkv', unsupported: 'MKV videos are not supported by browsers. Export the video as MP4 or WebM first.' };
    }
    if (at(0, 4) === 'OggS')
        return { kind: 'video', ext: 'ogv' };
    if (at(0, 2) === 'BM')
        return { kind: 'image', ext: 'bmp', unsupported: 'BMP photos are not supported. Export the photo as JPG or PNG first.' };
    return null;
}
export const publicUrl = (id, ext) => `${env.publicApiUrl}/media/${id}.${ext}`;
// Writes the file piece by piece, and only records it in `media` once every piece is saved, so a failed upload never leaves a half-file that looks valid.
// The upload is staged on disk (never held whole in memory) and read back one 1 MB piece at a time, so 250 MB photos and 500 MB videos use only a few MB of RAM.
export async function saveMediaFromFile({ kind, ext, path, size, name, uploadedBy }) {
    const id = randomUUID();
    const count = Math.max(1, Math.ceil(size / CHUNK));
    const fh = await open(path, 'r');
    try {
        for (let i = 0; i < count; i += 2) {
            const rows = [];
            for (let j = i; j < Math.min(i + 2, count); j++) {
                const len = Math.min(CHUNK, size - j * CHUNK);
                const buf = Buffer.alloc(len);
                const { bytesRead } = await fh.read(buf, 0, len, j * CHUNK);
                if (bytesRead !== len)
                    throw new Error('short read while saving upload');
                rows.push({ mediaId: id, idx: j, data: buf });
            }
            await db.insert(mediaChunks).values(rows);
        }
        await db.insert(media).values({ id, kind, mime: MIME[ext], ext, size, chunkCount: count, originalName: name, uploadedBy });
    }
    catch (e) {
        await db.delete(mediaChunks).where(eq(mediaChunks.mediaId, id)).catch(() => { });
        throw e;
    }
    finally {
        await fh.close().catch(() => { });
    }
    return { id, url: publicUrl(id, ext) };
}
// Reads the first bytes of a staged file, enough for sniff().
export async function readHeader(path, n = 64) {
    const fh = await open(path, 'r');
    try {
        const buf = Buffer.alloc(n);
        const { bytesRead } = await fh.read(buf, 0, n, 0);
        return buf.subarray(0, bytesRead);
    }
    finally {
        await fh.close().catch(() => { });
    }
}
