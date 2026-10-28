# Existing-mailbox SMTP backend — prepared, NOT deployed

Owner chose the existing Spacemail mailbox on 2026-10-27. No FormSubmit, Resend or Formspree account is used. This backend is not served/executed by GitHub Pages. The public form still uses mailto until a real HTTPS endpoint is deployed and tested.

## Deployment requirements

- Node.js 22+ single persistent process with npm; `npm install --ignore-scripts`, then `npm test` and `npm start`. Pin dependency lock before production installation.
- Server secret `SMTP_PASSWORD`: owner enters the existing mailbox password in hosting environment settings, never in GitHub, browser JavaScript, chat, build logs or public web files.
- Outbound TCP 465 to `mail.spacemail.com`, validated TLS certificate; username/from/to are fixed to `info@luxuryhandymansolvix.com`.
- HTTPS reverse proxy routing only `/contact` to this process; 16 KB request limit, request timeout and edge rate limiting. Never expose the repository, dependencies, environment or administrative routes through that proxy.
- Default bind is loopback. Configure PORT/BIND_ADDRESS only for the selected host. Proxy/client IP handling must be validated before production: forwarding headers are intentionally not trusted here, so proxied requests conservatively share one IP bucket.
- Rate limits: 3 email attempts per IP per 15 minutes; 30 globally per hour. Request throttling, field validation, honeypot, fixed recipient, strict CORS, TLS and duplicate suppression are included. Origin checks alone are not bot authentication. Monitor abuse; add host-native bot protection if needed.
- Limits and deduplication are in memory. Do not scale to multiple workers without shared durable state. Restarting resets counters and duplicate history. No exact-once email guarantee is possible; ambiguous SMTP outcomes are shown as unconfirmed, not successful.

## Activation checklist

1. Confirm/approve hosting plan and test outbound SMTP, without changing existing MX/SPF/DKIM/DMARC.
2. Configure server password privately, install pinned dependencies, test SMTP authentication.
3. Set `data-endpoint="https://<verified-host>/contact"` on #project-form to activate the included direct-contact.js AJAX UI; keep input on failures, disable duplicate submissions, never automatically open a mail app. Use a stable per-submission `Idempotency-Key`, exact JSON field names matching the existing form, and an empty `website` honeypot field.
4. Update form/privacy wording to actual processing and selected server. SMTP accepted means handed to the mail server, not guaranteed inbox delivery.
5. Send one owner-authorized test, verify receipt in the work inbox and Reply-To, then enable on the live site.

Email body: only `Hello Luxury Handyman Company,` plus a blank line and the visitor's text. Name and location go in the subject, visitor email/name in Reply-To. No arbitrary recipient, attachment, HTML, remote URL, marketing subscription, or auto-response is accepted.

Observed Spacemail settings confirm protocols enabled, SMTP host mail.spacemail.com and port 465/SSL. Hosting Manager showed no existing hosting. Essential shared hosting advertises Node.js support; final account runtime and proxy setup still require verification.

Sources: https://www.spaceship.com/knowledgebase/connect-spacemail-to-email-client/ and https://nodemailer.com/smtp
