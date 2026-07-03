/* MATIN SHAPE — contact form handler (Cloudflare Pages Function)
   POST /api/contact  →  validates the submission, then emails it via Resend.
   Required secrets/vars (set in Cloudflare Pages → Settings → Environment variables):
     RESEND_API_KEY   secret, from https://resend.com/api-keys
     TO_EMAIL         e.g. info@matinshape.com
     FROM_EMAIL       a verified sender on your Resend domain, e.g. leads@matinshape.com
*/

const MAX_LEN = { name: 80, email: 120, company: 80, website: 120, tools: 160, message: 2000 };
const ALLOWED_SYSTEM = [
  '', 'AI phone agent', 'Workflow automation', 'CRM automation',
  'Appointment booking system', 'Dashboard & reporting', 'Website + funnel system',
  'Not sure yet — need guidance'
];
const ALLOWED_BUDGET = ['', 'Under $1,500', '$1,500 – $4,000', '$4,000 – $7,500', '$7,500+', 'Not sure yet'];
const ALLOWED_TIMELINE = ['', 'As soon as possible', 'Within 1–2 months', 'This quarter', 'Just exploring'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function clean(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  // Honeypot: real visitors never fill this hidden field.
  if (body._hp) return json({ ok: true });

  const name = clean(body.name, MAX_LEN.name);
  const email = clean(body.email, MAX_LEN.email);
  const company = clean(body.company, MAX_LEN.company);
  const website = clean(body.website, MAX_LEN.website);
  const system = ALLOWED_SYSTEM.includes(body.system) ? body.system : '';
  const tools = clean(body.tools, MAX_LEN.tools);
  const budget = ALLOWED_BUDGET.includes(body.budget) ? body.budget : '';
  const timeline = ALLOWED_TIMELINE.includes(body.timeline) ? body.timeline : '';
  const message = clean(body.message, MAX_LEN.message);

  if (!name || !email || !message) {
    return json({ ok: false, error: 'Name, email, and message are required.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) {
    return json({ ok: false, error: 'Contact form is not configured yet. Please email us directly.' }, 500);
  }

  const rows = [
    ['Name', name], ['Email', email], ['Company', company], ['Website', website],
    ['System', system], ['Tools', tools], ['Budget', budget], ['Timeline', timeline]
  ].filter(([, v]) => v);

  const html =
    '<h2>New strategy call request</h2>' +
    '<table cellpadding="6">' +
    rows.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('') +
    '</table>' +
    `<p><strong>What feels manual or messy:</strong><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`;

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: env.TO_EMAIL,
      reply_to: email,
      subject: `New lead — ${name}${company ? ' (' + company + ')' : ''}`,
      html
    })
  });

  if (!resendResp.ok) {
    return json({ ok: false, error: 'Could not send your request right now. Please try again or email us directly.' }, 502);
  }

  return json({ ok: true });
}
