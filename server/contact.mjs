import { createHash } from 'node:crypto';

export const MAILBOX = 'info@luxuryhandymansolvix.com';
const ORIGIN = 'https://luxuryhandymansolvix.com';
const WINDOW = 15 * 60 * 1000;

export function buildMessage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request');
  function field(key, max, multiline = false) {
    const value = input[key];
    if (typeof value !== 'string' || !value.trim() || value.length > max ||
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value) || (!multiline && /[\r\n]/.test(value))) {
      throw new Error('Invalid field');
    }
    return value.trim();
  }
  const name = field('name', 100);
  const email = field('email', 150);
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(email)) throw new Error('Invalid email');
  const city = field('location', 150);
  const location = city === 'other' ? field('other_location', 150) : city;
  if (!['Naples', 'Bonita Springs', 'Marco Island', 'other'].includes(city)) throw new Error('Invalid location');
  const message = field('message', 1500, true);
  return {
    from: { name: 'Luxury Handyman website', address: MAILBOX },
    to: MAILBOX,
    replyTo: { name, address: email },
    subject: `Project inquiry — ${name} — ${location}`,
    text: `Hello Luxury Handyman Company,\n\n${message}`,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

// Single-process service. Counters and deduplication expire in RAM; no message archive.
// Before scaling/restarts during traffic, replace these with shared durable counters.
export function createHandler({ sendMail, now = Date.now }) {
  const limits = new Map();
  const requests = new Map();
  function limited(key, max, duration) {
    const t = now();
    let bucket = limits.get(key);
    if (!bucket || bucket.until <= t) {
      bucket = { count: 0, until: t + duration };
      limits.set(key, bucket);
    }
    return ++bucket.count > max;
  }
  return async (req, res) => {
    const reply = (code, value) => {
      res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Vary': 'Origin',
        ...(req.headers.origin === ORIGIN ? { 'Access-Control-Allow-Origin': ORIGIN } : {}),
      });
      res.end(JSON.stringify(value));
    };
    if (req.url !== '/contact') return reply(404, { error: 'Not found' });
    if (req.headers.origin !== ORIGIN) return reply(403, { error: 'Origin not allowed' });
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
      return reply(204, null);
    }
    if (req.method !== 'POST') return reply(405, { error: 'Use POST' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'Use JSON' });
    const t = now();
    for (const [key, v] of limits) if (v.until <= t) limits.delete(key);
    for (const [key, v] of requests) if (v.until <= t) requests.delete(key);
    // Do not trust client-supplied forwarding headers. A proxy requires a verified adapter.
    const ip = req.socket.remoteAddress || 'unknown';
    if (limited(`requests:${ip}`, 20, WINDOW) || limited('requests:global', 300, WINDOW)) return reply(429, { error: 'Please try later' });
    let raw = '';
    const chunks = [];
    try {
      let size = 0;
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > 16384) return reply(413, { error: 'Request too large' });
        chunks.push(Buffer.from(chunk));
      }
      raw = Buffer.concat(chunks).toString('utf8');
    } catch { return reply(400, { error: 'Incomplete request' }); }
    let input, message;
    try {
      input = JSON.parse(raw);
      if (input.website) return reply(400, { error: 'Invalid request' });
      message = buildMessage(input);
    } catch { return reply(400, { error: 'Please check the form details' }); }
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(key)) return reply(400, { error: 'Missing request ID' });
    const digest = createHash('sha256').update(JSON.stringify(message)).digest('hex');
    const existing = requests.get(key);
    if (existing) {
      if (existing.digest !== digest) return reply(409, { error: 'Request ID reused' });
      if (existing.state === 'accepted') return reply(202, { accepted: true });
      return reply(409, { error: 'Request is pending or delivery could not be confirmed. Please contact us before resending.' });
    }
    if (limited(`mail:${ip}`, 3, WINDOW) || limited('mail:global', 30, 3600000)) return reply(429, { error: 'Please try later or call us' });
    const state = { digest, state: 'pending', until: t + 30 * 60000 };
    requests.set(key, state);
    try {
      const result = await sendMail(message);
      if (!result.accepted?.some(address => String(address).toLowerCase() === MAILBOX)) throw new Error('SMTP did not accept recipient');
      state.state = 'accepted';
      return reply(202, { accepted: true });
    } catch {
      // SMTP failure can be ambiguous: retain the key to avoid automatic duplicates.
      state.state = 'unknown';
      return reply(503, { error: 'We could not confirm delivery. Please call or message us directly.' });
    }
  };
}
