import { Router } from 'express';
import { once } from 'node:events';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { media, mediaChunks } from '../db/schema.js';
import { CHUNK } from '../lib/storage.js';
// Public: GET /media/<id>.<ext> streams an uploaded photo or video out of the Turso database.
//  - the file is stored in 1 MB pieces, so a request only reads the pieces it needs (video seeking, Safari, slow phones)
//  - big responses are streamed piece by piece, never held in memory whole
//  - details and small photos are cached in memory, and DB reads are capped so a traffic spike cannot overwhelm Turso
//  - responses are immutable and cacheable for a year, so browsers and any CDN in front keep them
export const mediaRouter = Router();
const NAME = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|gif|webp|avif|mp4|webm|mov|ogv)$/;
const OPEN_ENDED_VIDEO_PART = 4 * 1024 * 1024; // a video request with no end gets 4 MB at a time, like a streaming server
// ---- limits and caches (per server process) ----
let running = 0;
const waiting = [];
const MAX_DB_READS = 24;
async function limited(fn) {
    if (running >= MAX_DB_READS)
        await new Promise((r) => waiting.push(r));
    running++;
    try {
        return await fn();
    }
    finally {
        running--;
        waiting.shift()?.();
    }
}
async function retry(fn, tries = 3) {
    for (let i = 1;; i++) {
        try {
            return await fn();
        }
        catch (e) {
            if (i >= tries)
                throw e;
            await new Promise((r) => setTimeout(r, 80 * i));
        }
    }
}
const metaCache = new Map(); // id -> { row, exp }
const META_TTL = 5 * 60 * 1000;
async function getMeta(id) {
    const hit = metaCache.get(id);
    if (hit && hit.exp > Date.now())
        return hit.row;
    const [row] = await limited(() => retry(() => db.select({ mime: media.mime, ext: media.ext, kind: media.kind, size: media.size, chunkCount: media.chunkCount }).from(media).where(eq(media.id, id))));
    if (!row)
        return null; // not cached, so a file uploaded a moment later is found
    if (metaCache.size >= 2000)
        metaCache.delete(metaCache.keys().next().value);
    metaCache.set(id, { row, exp: Date.now() + META_TTL });
    return row;
}
// Small least-recently-used cache for photo pieces (64 MB total). Video pieces are not cached: they are large and rarely re-read at once.
const pieceCache = new Map();
let pieceBytes = 0;
const PIECE_BUDGET = 64 * 1024 * 1024;
function remember(key, buf) {
    if (buf.length > CHUNK)
        return;
    pieceCache.set(key, buf);
    pieceBytes += buf.length;
    while (pieceBytes > PIECE_BUDGET) {
        const [k, v] = pieceCache.entries().next().value;
        pieceCache.delete(k);
        pieceBytes -= v.length;
    }
}
async function getPiece(id, row, idx) {
    const key = `${id}:${idx}`;
    const hit = pieceCache.get(key);
    if (hit) {
        pieceCache.delete(key);
        pieceCache.set(key, hit); // mark as recently used
        return hit;
    }
    const [r] = await limited(() => retry(() => db.select({ data: mediaChunks.data }).from(mediaChunks).where(and(eq(mediaChunks.mediaId, id), eq(mediaChunks.idx, idx)))));
    if (!r)
        throw new Error('missing piece');
    const buf = Buffer.from(r.data);
    if (row.kind === 'image')
        remember(key, buf);
    return buf;
}
// Files saved by the first (single-row) version of uploads: read only the needed bytes.
async function getLegacy(id, start, length) {
    const [r] = await limited(() => retry(() => db.select({ chunk: sql `substr(${media.data}, ${start + 1}, ${length})`.as('chunk') }).from(media).where(eq(media.id, id))));
    return Buffer.from(r.chunk);
}
mediaRouter.get('/:name', async (req, res, next) => {
    try {
        // Set before any 404, so the site (another origin in development) sees a plain 404 instead of a misleading "blocked" error.
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        const m = NAME.exec(req.params.name);
        if (!m)
            return res.status(404).end();
        const id = m[1];
        const row = await getMeta(id);
        if (!row || row.ext !== m[2])
            return res.status(404).end();
        res.set({
            'Content-Type': row.mime, 'Accept-Ranges': 'bytes', ETag: `"${id}"`, 'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin',
        });
        if (req.headers['if-none-match'] === `"${id}"`)
            return res.status(304).end();
        let start = 0;
        let end = row.size - 1;
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
        if (range && (range[1] || range[2])) {
            if (range[1]) {
                start = Number(range[1]);
                end = range[2] ? Math.min(Number(range[2]), end) : row.kind === 'video' ? Math.min(start + OPEN_ENDED_VIDEO_PART - 1, end) : end;
            }
            else
                start = Math.max(row.size - Number(range[2]), 0);
            if (start > end || start >= row.size) {
                res.set('Content-Range', `bytes */${row.size}`);
                return res.status(416).end();
            }
            res.status(206).set('Content-Range', `bytes ${start}-${end}/${row.size}`);
        }
        res.set('Content-Length', String(end - start + 1));
        if (req.method === 'HEAD')
            return res.end();
        if (row.chunkCount === 0) {
            res.end(await getLegacy(id, start, end - start + 1));
            return;
        }
        const first = Math.floor(start / CHUNK);
        const last = Math.floor(end / CHUNK);
        let aborted = false;
        res.on('close', () => { aborted = true; });
        let next_ = getPiece(id, row, first);
        for (let i = first; i <= last && !aborted; i++) {
            const buf = await next_;
            if (i < last) {
                next_ = getPiece(id, row, i + 1); // fetch the next piece while this one is being sent
                next_.catch(() => { });
            }
            const from = i === first ? start - i * CHUNK : 0;
            const to = i === last ? end - i * CHUNK + 1 : buf.length;
            if (!res.write(buf.subarray(from, to)) && !aborted)
                await once(res, 'drain').catch(() => { });
        }
        if (!aborted)
            res.end();
    }
    catch (e) {
        if (res.headersSent)
            return res.destroy(e); // part of the file is already sent: close the connection so the browser retries
        next(e);
    }
});
