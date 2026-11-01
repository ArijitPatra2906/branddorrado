import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { LIMITS, saveMediaFromFile, readHeader, sniff } from '../lib/storage.js';
// Photos and videos chosen from the admin's own computer, saved in the Turso database.
// Mounted at /api/admin/uploads (sign-in, CSRF and Projects/Blog permission are enforced by the admin router).
export const uploadsRouter = Router();
// Photos and videos are staged in the OS temp folder while they upload (never held whole in memory) and deleted as soon as they are saved or refused.
const MAX_FILES = { image: 4, video: 1 };
// The browser's idea of the type is only a first filter (it is often empty or generic for .mov/.mkv); the file's real type is checked from its bytes below.
const plausible = (kind, mime) => mime === '' || mime === 'application/octet-stream' || mime.startsWith(`${kind}/`) || (kind === 'video' && mime.startsWith('application/'));
const LABEL = { image: 'JPG, PNG, WebP, GIF or AVIF photos up to 250 MB each', video: 'MP4, WebM, MOV or OGV videos up to 500 MB' };
function receive(kind) {
    return multer({
        storage: multer.diskStorage({ destination: tmpdir(), filename: (_q, _f, cb) => cb(null, `bd-upload-${randomUUID()}`) }),
        limits: { fileSize: LIMITS[kind], files: MAX_FILES[kind] },
        fileFilter: (_q, file, cb) => cb(plausible(kind, file.mimetype) ? null : new HttpError(400, `Unsupported file type. Use ${LABEL[kind]}.`, 'bad_file_type'), plausible(kind, file.mimetype)),
    }).array('files', MAX_FILES[kind]);
}
for (const kind of ['image', 'video']) {
    uploadsRouter.post(`/${kind}`, (req, res, next) => {
        if (env.isProd && !process.env.PUBLIC_API_URL)
            return next(new HttpError(503, 'Uploads are not configured on the server (PUBLIC_API_URL is missing).', 'uploads_unavailable'));
        receive(kind)(req, res, (err) => {
            if (!err)
                return next();
            if (err instanceof HttpError)
                return next(err);
            if (err instanceof multer.MulterError)
                return next(new HttpError(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.code === 'LIMIT_FILE_SIZE' ? `That file is too large. Use ${LABEL[kind]}.` : `Upload failed (${err.code}).`, 'upload_failed'));
            next(err);
        });
    }, async (req, res, next) => {
        const files = req.files ?? [];
        try {
            if (files.length === 0)
                throw new HttpError(400, 'Choose a file to upload.', 'no_file');
            const saved = [];
            let rejected = 0;
            let why = '';
            for (const f of files) {
                const t = sniff(await readHeader(f.path));
                if (t?.unsupported) {
                    why = why || t.unsupported;
                    rejected++;
                    continue;
                }
                if (!t || t.kind !== kind) {
                    rejected++;
                    continue;
                }
                const { url } = await saveMediaFromFile({ kind, ext: t.ext, path: f.path, size: f.size, name: f.originalname.slice(0, 120), uploadedBy: req.admin.userId });
                saved.push({ url, name: f.originalname.slice(0, 120), kind });
            }
            if (saved.length === 0)
                throw new HttpError(400, why || `That file is not a supported ${kind === 'image' ? 'photo' : 'video'}. Use ${LABEL[kind]}.`, 'bad_file_content');
            res.status(201).json({ data: { files: saved, rejected } });
        }
        catch (e) {
            next(e);
        }
        finally {
            await Promise.all(files.map((f) => rm(f.path, { force: true }).catch(() => { })));
        }
    });
}
