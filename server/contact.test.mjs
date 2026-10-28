import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { buildMessage, createHandler, MAILBOX } from './contact.mjs';
const input = { name: 'Test client', email: 'client@example.com', location: 'Naples', message: 'Please fix my shelf.' };
const key = '00000000-0000-4000-8000-000000000001';
async function request(handler, body = input, overrides = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(req, { url: '/contact', method: 'POST', headers: { origin: 'https://luxuryhandymansolvix.com', 'content-type': 'application/json', 'idempotency-key': key }, socket: { remoteAddress: '127.0.0.2' } }, overrides);
  let result;
  await handler(req, { setHeader() {}, writeHead(status, headers) { result = { status, headers }; }, end(text) { result.body = JSON.parse(text); } });
  return result;
}
test('body is greeting and client text; fixed recipient, reply address and location retained', () => {
  const result = buildMessage({ ...input, to: 'attacker@example.com' });
  assert.equal(result.text, 'Hello Luxury Handyman Company,\n\nPlease fix my shelf.');
  assert.equal(result.to, MAILBOX);
  assert.equal(result.from.address, MAILBOX);
  assert.equal(result.replyTo.address, input.email);
  assert.match(result.subject, /Naples/);
});
test('custom locations work; missing/custom/header injection fields rejected', () => {
  assert.match(buildMessage({ ...input, location: 'other', other_location: 'Estero' }).subject, /Estero/);
  for (const changes of [{ location: 'other' }, { email: 'one@example.com, two@example.com' }, { name: 'a\r\nBcc:x@example.com' }, { message: ' ' }, { message: 'x'.repeat(1501) }]) {
    assert.throws(() => buildMessage({ ...input, ...changes }));
  }
});
test('SMTP acceptance required and duplicate submission sends only once', async () => {
  let calls = 0;
  const handler = createHandler({ sendMail: async () => { calls++; return { accepted: [MAILBOX] }; } });
  assert.equal((await request(handler)).status, 202);
  assert.equal((await request(handler)).status, 202);
  assert.equal(calls, 1);
  assert.equal((await request(handler, { ...input, message: 'Different' })).status, 409);
});
test('SMTP rejection never reports success and ambiguous retries do not resend', async () => {
  let calls = 0;
  const handler = createHandler({ sendMail: async () => { calls++; throw new Error('secret SMTP detail'); } });
  const first = await request(handler);
  assert.equal(first.status, 503);
  assert.doesNotMatch(JSON.stringify(first), /secret SMTP detail/);
  assert.equal((await request(handler)).status, 409);
  assert.equal(calls, 1);
});
test('invalid origin, honey field and oversized input do not send', async () => {
  const handler = createHandler({ sendMail: async () => { assert.fail('Must not send'); } });
  assert.equal((await request(handler, input, { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await request(handler, { ...input, website: 'bot' })).status, 400);
  assert.equal((await request(handler, { message: 'x'.repeat(17000) })).status, 413);
});
test('per-IP mail attempts are limited', async () => {
  let calls = 0;
  const handler = createHandler({ sendMail: async () => { calls++; return { accepted: [MAILBOX] }; } });
  for (let i = 1; i <= 4; i++) {
    const result = await request(handler, input, { headers: { origin: 'https://luxuryhandymansolvix.com', 'content-type': 'application/json', 'idempotency-key': key.slice(0,-1) + i } });
    assert.equal(result.status, i === 4 ? 429 : 202);
  }
  assert.equal(calls, 3);
});
