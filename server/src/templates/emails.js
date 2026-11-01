// Table-based, inline-styled HTML for broad email-client support. All dynamic values pass through esc().
const GOLD = '#C89A3C', DARK = '#111111', CREAM = '#F9F6EF';
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? esc(u) : '#');
function shell(opts) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${DARK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eadfc7;">
<tr><td style="background:${DARK};padding:24px 28px;border-bottom:3px solid ${GOLD};"><img src="${safeUrl(opts.siteUrl)}/logos/wordmark-dark.png" alt="BrandDorrado" height="44" style="display:block;height:44px;width:auto;border:0;"></td></tr>
<tr><td style="padding:32px 28px;font-size:15px;line-height:1.6;">${opts.body}</td></tr>
<tr><td style="background:${DARK};padding:20px 28px;color:#cfc7b4;font-size:12px;line-height:1.6;">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}
const row = (k, v) => v
    ? `<tr><td style="padding:8px 12px 8px 0;color:#7a6a45;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #f0e8d6;">${esc(v)}</td></tr>` : '';
export function agencyEmail(e, o) {
    const rows = [row('Reference', e.reference), row('Name', e.fullName), row('Business', e.businessName), row('Email', e.email), row('Phone', e.phone),
        row('Website / social', e.websiteUrl), row('Service', e.serviceLabel), row('Package', e.packageName), row('Budget', e.budgetRange), row('Timeline', e.timeline),
        row('Preferred contact', e.contactMethod), row('Heard about us', e.referralSource), row('Submitted', new Date(e.createdAt).toUTCString())].join('');
    const html = shell({
        siteUrl: o.siteUrl, preheader: `New enquiry ${e.reference} from ${e.fullName}`,
        body: `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;font-weight:normal;">New project enquiry</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<p style="margin:24px 0 6px;color:#7a6a45;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Project description</p>
<p style="margin:0;white-space:pre-wrap;">${e.description ? esc(e.description) : '<em>No description provided.</em>'}</p>
<p style="margin:28px 0 0;"><a href="${safeUrl(o.adminUrl)}" style="display:inline-block;background:${GOLD};color:${DARK};text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;">View in dashboard</a></p>`,
        footer: 'Internal notification. Reply to this email to answer the customer directly.',
    });
    const text = [`New project enquiry ${e.reference}`, '', `Name: ${e.fullName}`, e.businessName && `Business: ${e.businessName}`, `Email: ${e.email}`, e.phone && `Phone: ${e.phone}`,
        e.websiteUrl && `Website: ${e.websiteUrl}`, e.serviceLabel && `Service: ${e.serviceLabel}`, e.packageName && `Package: ${e.packageName}`, e.budgetRange && `Budget: ${e.budgetRange}`,
        e.timeline && `Timeline: ${e.timeline}`, e.contactMethod && `Preferred contact: ${e.contactMethod}`, e.referralSource && `Heard about us: ${e.referralSource}`,
        '', e.description || '(No project description provided.)', '', `Dashboard: ${o.adminUrl}`].filter((l) => l !== undefined && l !== false && l !== null).join('\n');
    return { subject: `New enquiry ${e.reference}: ${e.fullName}${e.serviceLabel ? ` (${e.serviceLabel})` : ''}`, html, text };
}
export function customerEmail(e, o) {
    const first = e.fullName.split(/\s+/)[0] || e.fullName;
    const links = Object.entries(o.social).filter(([, u]) => /^https?:\/\//i.test(u))
        .map(([k, u]) => `<a href="${safeUrl(u)}" style="color:${GOLD};text-decoration:none;margin-right:14px;text-transform:capitalize;">${esc(k)}</a>`).join('');
    const summary = [row('Reference', e.reference), row('Service', e.serviceLabel), row('Package', e.packageName), row('Budget', e.budgetRange), row('Timeline', e.timeline)].join('');
    const html = shell({
        siteUrl: o.siteUrl, preheader: 'We have received your project enquiry.',
        body: `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;font-weight:normal;">Hello ${esc(first)},</h1>
<p style="margin:0 0 16px;">Thank you for contacting BrandDorrado. We've received your project enquiry and look forward to learning more about your brand.</p>
${o.responseTimeText ? `<p style="margin:0 0 16px;">${esc(o.responseTimeText)}</p>` : ''}
<p style="margin:24px 0 6px;color:#7a6a45;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Your enquiry</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>
${e.description ? `<p style="margin:16px 0 0;white-space:pre-wrap;color:#444;">${esc(e.description.length > 600 ? `${e.description.slice(0, 600)}…` : e.description)}</p>` : ''}
<p style="margin:24px 0 0;">Please quote reference <strong>${esc(e.reference)}</strong> if you get in touch.</p>`,
        footer: `${o.publicEmail ? `Contact: <a href="mailto:${esc(o.publicEmail)}" style="color:${GOLD};">${esc(o.publicEmail)}</a><br>` : ''}${links}<br>BrandDorrado: Turn Brands Golden.<br>You received this because you submitted an enquiry on our website. It is not a newsletter.`,
    });
    const text = [`Hello ${first},`, '', "Thank you for contacting BrandDorrado. We've received your project enquiry and look forward to learning more about your brand.",
        o.responseTimeText, '', `Reference: ${e.reference}`, e.serviceLabel && `Service: ${e.serviceLabel}`, e.budgetRange && `Budget: ${e.budgetRange}`, e.timeline && `Timeline: ${e.timeline}`,
        '', o.publicEmail && `Contact: ${o.publicEmail}`, 'BrandDorrado: Turn Brands Golden.'].filter((l) => l !== undefined && l !== false && l !== null).join('\n');
    return { subject: `We've received your enquiry (${e.reference})`, html, text };
}
export function passwordResetEmail(o) {
    const first = o.name.split(/\s+/)[0] || o.name;
    const html = shell({
        siteUrl: o.siteUrl, preheader: 'Reset your BrandDorrado admin password.',
        body: `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;font-weight:normal;">Hello ${esc(first)},</h1>
<p style="margin:0 0 16px;">We received a request to reset the password for your BrandDorrado admin account. This link works once and expires in ${o.minutes} minutes.</p>
<p style="margin:24px 0;"><a href="${safeUrl(o.resetUrl)}" style="display:inline-block;background:${GOLD};color:${DARK};text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;">Choose a new password</a></p>
<p style="margin:0 0 8px;color:#444;font-size:13px;">If the button does not work, copy this address into your browser:</p>
<p style="margin:0;word-break:break-all;font-size:13px;color:#7a6a45;">${esc(o.resetUrl)}</p>`,
        footer: 'If you did not ask for this, ignore this email: your password has not changed. Never share this link.',
    });
    const text = [`Hello ${first},`, '', `Reset your BrandDorrado admin password (link works once, expires in ${o.minutes} minutes):`, o.resetUrl, '', 'If you did not ask for this, ignore this email. Your password has not changed.'].join('\n');
    return { subject: 'Reset your BrandDorrado admin password', html, text };
}
