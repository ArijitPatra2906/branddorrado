import { VIDEO_RATIOS, ratioCss, DEFAULT_RATIO } from '../../lib/videoRatio';
// Chooses the shape of the video card on the website, with a small preview of that shape.
export function RatioField({ id, value, onChange, describedBy }) {
    const v = value || DEFAULT_RATIO;
    return (<div className="flex flex-wrap items-center gap-5">
      <select id={id} className="field !w-auto min-w-[16rem]" value={v} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)}>
        {VIDEO_RATIOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <div aria-hidden="true" className="grid h-28 w-28 place-items-center rounded-card border border-gold/25 bg-[#161616]">
        <div style={{ aspectRatio: ratioCss(v) }} className="max-h-24 max-w-24 rounded-sm border border-gold bg-gold/15 [height:5.5rem] [width:auto]"/>
      </div>
      <span className="text-xs text-cream/60">Preview of the card shape: {v}</span>
    </div>);
}
