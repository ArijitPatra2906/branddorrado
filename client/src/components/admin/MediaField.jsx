import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload, Video, ArrowUp, ArrowDown, X } from 'lucide-react';
import { adminUpload } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { isUploadedMedia } from '../../lib/media';
import { captureThumbnail } from '../../lib/videoThumb';
export const ACCEPT = { image: 'image/jpeg,image/png,image/webp,image/gif,image/avif', video: 'video/mp4,video/webm,video/quicktime,video/ogg,.mov,.mp4,.webm,.ogv' };
const MAX = { image: 250 * 1024 * 1024, video: 500 * 1024 * 1024 };
const LABEL = { image: 'JPG, PNG, WebP, GIF or AVIF, up to 250 MB each', video: 'MP4, WebM, MOV or OGV, up to 500 MB' };
const isVideoFile = (u) => /\.(mp4|webm|mov|ogv)$/i.test((u || '').split('?')[0]);
// Uploads one or more files from the admin's computer. Returns { pick, busy, progress, error } for a hidden <input type="file">.
export function useUpload(kind, onDone) {
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const pick = async (fileList) => {
        const files = Array.from(fileList ?? []);
        if (files.length === 0)
            return;
        setError('');
        const tooBig = files.find((f) => f.size > MAX[kind]);
        if (tooBig)
            return setError(`“${tooBig.name}” is too large. Use ${LABEL[kind]}.`);
        setBusy(true);
        setProgress(0);
        try {
            // The server accepts up to 4 photos per request (they can be huge), so larger selections are sent in groups.
            const size = kind === 'image' ? 4 : 1;
            const saved = [];
            for (let i = 0; i < files.length; i += size) {
                const group = files.slice(i, i + size);
                saved.push(...await adminUpload(kind, group, (p) => setProgress((i + p * group.length) / files.length)));
            }
            await onDone(saved, files);
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Upload failed. Please try again.');
        }
        finally {
            setBusy(false);
        }
    };
    return { pick, busy, progress, error };
}
function Progress({ busy, progress }) {
    return busy ? <div role="status" aria-live="polite" className="mt-2"><div className="h-1.5 overflow-hidden rounded-full bg-gold/20"><div className="h-full bg-gold transition-all" style={{ width: `${Math.round(progress * 100)}%` }}/></div><p className="mt-1 text-xs text-cream/60">Uploading… {Math.round(progress * 100)}%</p></div> : null;
}
// One photo or video: upload from computer, preview, replace/remove. Value is the file's URL.
export function MediaField({ id, kind = 'image', value, onChange, allowLink = false, describedBy, locked = '', thumbnail = null }) {
    const input = useRef(null);
    const [thumbState, setThumbState] = useState({ busy: false, note: '' });
    // After a video is uploaded: if the project has no thumbnail yet, make one from the video automatically.
    const up = useUpload(kind, async (saved, local) => {
        onChange(saved[0].url);
        if (kind !== 'video' || !thumbnail || thumbnail.has)
            return;
        setThumbState({ busy: true, note: '' });
        try {
            const img = await captureThumbnail(local[0]);
            const [t] = await adminUpload('image', [img]);
            thumbnail.set(t.url);
            setThumbState({ busy: false, note: 'A thumbnail was created from the video. Upload your own thumbnail image under "Thumbnail" to replace it.' });
        }
        catch {
            setThumbState({ busy: false, note: 'A thumbnail could not be created automatically from this video. Visitors will see its first frame; you can also upload a thumbnail image.' });
        }
    });
    const has = !!value;
    return (<div>
      <div className="flex flex-wrap items-start gap-4">
        {has && (<div className="h-28 w-44 shrink-0 overflow-hidden rounded-lg border border-gold/30 bg-black">
            {kind === 'image' ? <img src={value} alt="" className="h-full w-full object-cover"/>
            : isVideoFile(value) ? <video src={value} controls preload="metadata" className="h-full w-full object-cover"/>
                : <p className="grid h-full place-items-center p-3 text-center text-xs text-cream/70">Linked video<br />{value.slice(0, 40)}</p>}
          </div>)}
        <div className="flex flex-wrap items-center gap-3">
          <input ref={input} id={id} type="file" accept={ACCEPT[kind]} className="sr-only" aria-describedby={describedBy} onChange={(e) => { up.pick(e.target.files); e.target.value = ''; }}/>
          <button type="button" className="btn-outline !py-2.5" disabled={up.busy || !!locked} onClick={() => input.current?.click()}>{kind === 'image' ? <ImagePlus size={16} aria-hidden="true"/> : <Video size={16} aria-hidden="true"/>}{has ? 'Replace file' : `Upload ${kind} from computer`}</button>
          {has && <button type="button" className="inline-flex items-center gap-1.5 text-sm text-red-300 hover:underline" disabled={up.busy} onClick={() => onChange('')}><Trash2 size={14} aria-hidden="true"/>Remove</button>}
        </div>
      </div>
      <Progress busy={up.busy} progress={up.progress}/>
      {thumbState.busy && <p role="status" className="mt-2 text-xs text-cream/60">Creating a thumbnail from the video…</p>}
      {thumbState.note && <p role="status" className="mt-2 text-xs text-gold">{thumbState.note}</p>}
      {locked && <p role="status" className="mt-2 text-xs text-gold">{locked}</p>}
      {up.error && <p role="alert" className="mt-2 text-xs text-red-300">{up.error}</p>}
      <p className="mt-2 text-xs text-cream/50">{LABEL[kind]}.{isUploadedMedia(value) ? ' Saved in the website database.' : ''}</p>
      {allowLink && (<details className="mt-2 text-xs text-cream/60"><summary className="cursor-pointer">Or use a YouTube / Vimeo link</summary>
          <input aria-label="Video link" className="field mt-2" placeholder="https://" value={isUploadedMedia(value) ? '' : value ?? ''} onChange={(e) => onChange(e.target.value)}/></details>)}
    </div>);
}
// A list of photos with alt text. Value: [{ url, alt }]. Add several at once; reorder or remove.
export function GalleryField({ id, value, onChange, locked = '' }) {
    const input = useRef(null);
    const items = value ?? [];
    const up = useUpload('image', (files) => onChange([...items, ...files.map((f) => ({ url: f.url, alt: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120) }))]));
    const move = (i, d) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length)
        return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
    return (<div>
      {items.length > 0 && (<ul className="mb-4 grid gap-3 sm:grid-cols-2">{items.map((it, i) => (<li key={`${it.url}-${i}`} className="flex gap-3 rounded-lg border border-gold/25 p-2">
            <img src={it.url} alt="" className="h-20 w-24 shrink-0 rounded object-cover"/>
            <div className="min-w-0 flex-1"><label className="sr-only" htmlFor={`${id}-alt-${i}`}>Description of photo {i + 1}</label>
              <input id={`${id}-alt-${i}`} className="field !py-2 text-xs" placeholder="Describe the photo" value={it.alt} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, alt: e.target.value } : x))}/>
              <div className="mt-2 flex items-center gap-1">
                <button type="button" aria-label={`Move photo ${i + 1} earlier`} className="rounded p-1 hover:text-gold disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} aria-hidden="true"/></button>
                <button type="button" aria-label={`Move photo ${i + 1} later`} className="rounded p-1 hover:text-gold disabled:opacity-30" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} aria-hidden="true"/></button>
                <button type="button" aria-label={`Remove photo ${i + 1}`} className="ml-auto rounded p-1 text-red-300 hover:text-red-200" onClick={() => onChange(items.filter((_, j) => j !== i))}><X size={14} aria-hidden="true"/></button>
              </div></div></li>))}</ul>)}
      <input ref={input} id={id} type="file" multiple accept={ACCEPT.image} className="sr-only" onChange={(e) => { up.pick(e.target.files); e.target.value = ''; }}/>
      <button type="button" className="btn-outline !py-2.5" disabled={up.busy || !!locked || items.length >= 24} onClick={() => input.current?.click()}><Upload size={16} aria-hidden="true"/>Add photos from computer</button>
      <Progress busy={up.busy} progress={up.progress}/>
      {locked && <p role="status" className="mt-2 text-xs text-gold">{locked}</p>}
      {up.error && <p role="alert" className="mt-2 text-xs text-red-300">{up.error}</p>}
      <p className="mt-2 text-xs text-cream/50">{LABEL.image}. Up to 24 photos; you can select several at once.</p>
    </div>);
}
// A Markdown text box with buttons that upload a photo or video and insert it at the cursor.
export function MarkdownField({ id, rows, value, onChange, describedBy, invalid, locked = '' }) {
    const ta = useRef(null);
    const photo = useRef(null);
    const video = useRef(null);
    const insert = (snippet) => {
        const el = ta.current;
        const at = el?.selectionStart ?? (value ?? '').length;
        const end = el?.selectionEnd ?? at;
        const v = value ?? '';
        onChange(`${v.slice(0, at)}${at > 0 && v[at - 1] !== '\n' ? '\n\n' : ''}${snippet}\n\n${v.slice(end)}`);
    };
    const upImg = useUpload('image', (files) => insert(files.map((f) => `![${f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/[[\]]/g, '')}](${f.url})`).join('\n\n')));
    const upVid = useUpload('video', (files) => insert(`@[video](${files[0].url})`));
    const busy = upImg.busy || upVid.busy || !!locked;
    return (<div>
      <div className="mb-2 flex flex-wrap gap-3">
        <input ref={photo} type="file" multiple accept={ACCEPT.image} className="sr-only" tabIndex={-1} aria-label="Choose photos to insert" onChange={(e) => { upImg.pick(e.target.files); e.target.value = ''; }}/>
        <input ref={video} type="file" accept={ACCEPT.video} className="sr-only" tabIndex={-1} aria-label="Choose a video to insert" onChange={(e) => { upVid.pick(e.target.files); e.target.value = ''; }}/>
        <button type="button" className="btn-outline !py-2" disabled={busy} onClick={() => photo.current?.click()}><ImagePlus size={16} aria-hidden="true"/>Insert photo</button>
        <button type="button" className="btn-outline !py-2" disabled={busy} onClick={() => video.current?.click()}><Video size={16} aria-hidden="true"/>Insert video</button>
      </div>
      <textarea ref={ta} id={id} rows={rows} className="field" value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid || undefined}/>
      <Progress busy={upImg.busy || upVid.busy} progress={upImg.busy ? upImg.progress : upVid.progress}/>
      {locked && <p role="status" className="mt-2 text-xs text-gold">{locked}</p>}
      {(upImg.error || upVid.error) && <p role="alert" className="mt-2 text-xs text-red-300">{upImg.error || upVid.error}</p>}
    </div>);
}
