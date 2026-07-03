# MatinShapeAutomations
we build and deploy AI integrated software for the businesses and help them with thier lead generation and customer service 

## Contact form (Cloudflare Pages Function)

`functions/api/contact.js` handles `POST /api/contact` submissions from `contact.html` and emails them via [Resend](https://resend.com). Set these in Cloudflare Pages → Settings → Environment variables:

- `RESEND_API_KEY` (secret) — from resend.com/api-keys
- `TO_EMAIL` — inbox that should receive leads, e.g. `info@matinshape.com`
- `FROM_EMAIL` — a sender verified on your Resend domain, e.g. `leads@matinshape.com`

Without these set, the function returns a friendly error and the form tells the visitor to email you directly instead of failing silently.
