import { Fragment } from 'react';
import { isUploadedMedia } from '../lib/media';
// Minimal, safe Markdown -> React. Nothing is ever injected as HTML, so untrusted content cannot run script.
// Also: ![alt](image-url) and @[video](video-url) on their own line (https links or files uploaded in the admin portal only).
// Supports: #/##/### headings, paragraphs, -/* and 1. lists, > quotes, **bold**, *italic*, [text](https/mailto/relative link).
const safeHref = (h) => (/^(https:\/\/|mailto:|\/(?!\/)|#)/i.test(h.trim()) ? h.trim() : null);
const safeMedia = (u) => /^https:\/\//i.test(u) || isUploadedMedia(u);
const IMG = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const VID = /^@\[video\]\(([^)\s]+)\)\s*$/;
function inline(text) {
    const out = [];
    const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let last = 0;
    let m;
    let i = 0;
    while ((m = re.exec(text))) {
        if (m.index > last)
            out.push(text.slice(last, m.index));
        if (m[1]) {
            const href = safeHref(m[2]);
            out.push(href ? <a key={i++} href={href} className="text-gold underline underline-offset-4 hover:text-cream" {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{m[1]}</a> : m[1]);
        }
        else if (m[3])
            out.push(<strong key={i++}>{m[3]}</strong>);
        else
            out.push(<em key={i++}>{m[4]}</em>);
        last = re.lastIndex;
    }
    if (last < text.length)
        out.push(text.slice(last));
    return out;
}
export function Markdown({ source, className = '' }) {
    const blocks = [];
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    let i = 0;
    let k = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
            i++;
            continue;
        }
        const h = /^(#{1,3})\s+(.*)$/.exec(line);
        if (h) {
            const lvl = h[1].length;
            const cls = lvl === 1 ? 'mt-10 text-3xl' : lvl === 2 ? 'mt-9 text-2xl' : 'mt-7 text-xl';
            blocks.push(<h2 key={k++} className={`!font-serif !leading-tight ${cls}`}>{inline(h[2])}</h2>);
            i++;
            continue;
        }
        const img = IMG.exec(line.trim());
        if (img) {
            if (safeMedia(img[2]))
                blocks.push(<figure key={k++} className="mt-6"><img src={img[2]} alt={img[1]} loading="lazy" className="w-full rounded-card border border-gold/25"/></figure>);
            i++;
            continue;
        }
        const vid = VID.exec(line.trim());
        if (vid) {
            if (safeMedia(vid[1]))
                blocks.push(<figure key={k++} className="mt-6"><video src={vid[1]} controls preload="metadata" playsInline className="w-full rounded-card border border-gold/25 bg-black"/></figure>);
            i++;
            continue;
        }
        if (/^\s*([-*])\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
            const ordered = /^\s*\d+\./.test(line);
            const items = [];
            while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i]))
                items.push(lines[i++].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
            const L = ordered ? 'ol' : 'ul';
            blocks.push(<L key={k++} className={`mt-4 space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-gold`}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</L>);
            continue;
        }
        if (line.startsWith('>')) {
            const q = [];
            while (i < lines.length && lines[i].startsWith('>'))
                q.push(lines[i++].replace(/^>\s?/, ''));
            blocks.push(<blockquote key={k++} className="mt-5 border-l-2 border-gold pl-4 italic opacity-85">{inline(q.join(' '))}</blockquote>);
            continue;
        }
        const p = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|\s*[-*]\s|\s*\d+\.\s|!\[|@\[video\])/.test(lines[i]))
            p.push(lines[i++]);
        blocks.push(<p key={k++} className="mt-4 leading-relaxed">{p.map((t, j) => <Fragment key={j}>{j > 0 && <br />}{inline(t)}</Fragment>)}</p>);
    }
    return <div className={className}>{blocks}</div>;
}
