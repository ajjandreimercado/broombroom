/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Email goes out through Brevo's HTTP API: Render's free plan blocks SMTP ports (25, 465, 587), so Gmail SMTP
// cannot be used there. Set BREVO_API_KEY and MAIL_FROM (a sender address verified in Brevo).
// Without a key (development, tests) emails are kept in `outbox` and saved to server/data/outbox as HTML files.
export type Mail = { to: string; toName?: string; subject: string; html: string; text: string; replyTo?: string };

export const outbox: Mail[] = [];

export const sendMail = async (mail: Mail): Promise<boolean> => {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    outbox.push(mail);
    if (process.env.NODE_ENV !== 'test') {
      try {
        const dir = path.join(process.cwd(), 'server', 'data', 'outbox');
        mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${mail.to.replace(/[^\w.@-]/g, '_')}.html`);
        writeFileSync(file, mail.html);
        console.log(`[email not sent: no BREVO_API_KEY] "${mail.subject}" to ${mail.to}, saved to ${file}`);
      } catch {}
    }
    return false;
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || 'Broom Broom' },
        to: [{ email: mail.to, name: mail.toName }],
        ...(mail.replyTo ? { replyTo: { email: mail.replyTo } } : {}),
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
      }),
    });
    if (!res.ok) {
      console.error(`email to ${mail.to} failed: ${res.status} ${await res.text().catch(() => '')}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`email to ${mail.to} failed:`, e);
    return false;
  }
};

// After the reservation: fill in the Applicant's Information Sheet, with a link straight to it.
export const infoSheetEmail = (o: { to: string; name: string; referenceNo: string; vehicle: string; link: string }): Mail => ({
  to: o.to,
  toName: o.name,
  subject: `Your ${o.vehicle} is reserved: fill in your information sheet`,
  text: [`Hi ${o.name},`, '', `The ${o.vehicle} is now reserved for you (${o.referenceNo}).`, 'To continue, please fill in the Applicant\'s Information Sheet:', o.link, '', 'Broom Broom'].join('\n'),
  html: `<!doctype html><html><body style="margin:0;background:#F7F8F8;font-family:Arial,Helvetica,sans-serif;color:#141517">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #C9D1D6">
<tr><td style="background:#141517;color:#ffffff;padding:16px 24px;font-size:18px;font-weight:bold">Broom Broom</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px">Hi ${esc(o.name)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">The <strong>${esc(o.vehicle)}</strong> is now reserved for you (${esc(o.referenceNo)}). To continue, please fill in the Applicant's Information Sheet.</p>
<p style="margin:0 0 24px"><a href="${esc(o.link)}" style="display:inline-block;background:#1D5FD1;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px">Fill in the information sheet</a></p>
<p style="margin:0;font-size:12px;color:#4E585E;line-height:1.5">If the button does not work, copy this link into your browser:<br>${esc(o.link)}</p>
</td></tr></table></td></tr></table></body></html>`,
});

// A message from the Help page's form, to the company inbox; replying answers the sender.
export const supportEmail = (o: { to: string; name: string; email: string; topic: string; message: string }): Mail => ({
  to: o.to,
  replyTo: o.email,
  subject: `Help request: ${o.topic} (${o.name})`,
  text: [`From: ${o.name} <${o.email}>`, `Topic: ${o.topic}`, '', o.message].join('\n'),
  html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#141517;font-size:15px;line-height:1.5">
<p style="margin:0 0 4px"><strong>From:</strong> ${esc(o.name)} &lt;${esc(o.email)}&gt;</p>
<p style="margin:0 0 16px"><strong>Topic:</strong> ${esc(o.topic)}</p>
<div style="white-space:pre-wrap;border-left:3px solid #C9D1D6;padding-left:12px">${esc(o.message)}</div>
<p style="margin:16px 0 0;font-size:12px;color:#4E585E">Sent from the Help page on Broom Broom. Reply to this email to answer ${esc(o.name)}.</p>
</body></html>`,
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// "Please re-submit" email for documents the admin rejected, with a link straight to the upload screen.
export const resubmitEmail = (o: { to: string; name: string; referenceNo: string; vehicle: string; docs: { label: string; reason: string }[]; link: string }): Mail => {
  const rows = o.docs.map((d) => `<li style="margin:0 0 10px"><strong>${esc(d.label)}</strong><br><span style="color:#B42318">Reason: ${esc(d.reason)}</span></li>`).join('');
  return {
    to: o.to,
    toName: o.name,
    subject: `Action needed: re-submit a document for ${o.referenceNo}`,
    text: [
      `Hi ${o.name},`,
      '',
      `We could not accept the following document${o.docs.length > 1 ? 's' : ''} for your application ${o.referenceNo} (${o.vehicle}):`,
      ...o.docs.map((d) => `- ${d.label}: ${d.reason}`),
      '',
      `Please upload a new copy here: ${o.link}`,
      '',
      'Broom Broom',
    ].join('\n'),
    html: `<!doctype html><html><body style="margin:0;background:#F7F8F8;font-family:Arial,Helvetica,sans-serif;color:#141517">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #C9D1D6">
<tr><td style="background:#141517;color:#ffffff;padding:16px 24px;font-size:18px;font-weight:bold">Broom Broom</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px">Hi ${esc(o.name)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">We could not accept the following document${o.docs.length > 1 ? 's' : ''} for your application <strong>${esc(o.referenceNo)}</strong> (${esc(o.vehicle)}):</p>
<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.4">${rows}</ul>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5">Please upload a new, clear copy. A sharp photo or a PDF works best.</p>
<p style="margin:0 0 24px"><a href="${esc(o.link)}" style="display:inline-block;background:#1D5FD1;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px">Re-upload documents</a></p>
<p style="margin:0;font-size:12px;color:#4E585E;line-height:1.5">If the button does not work, copy this link into your browser:<br>${esc(o.link)}</p>
</td></tr></table>
<p style="font-size:12px;color:#6B767D;margin:12px 0 0">You received this because you applied for a vehicle on Broom Broom.</p>
</td></tr></table></body></html>`,
  };
};
