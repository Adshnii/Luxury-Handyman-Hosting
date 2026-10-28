const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../direct-contact.js'), 'utf8');
function setup(fetch, endpoint = 'https://forms.luxuryhandymansolvix.com/contact') {
  const status = {}, button = {}, intro = {}, note = {}, fallback = {};
  const listeners = {};
  let resets = 0, navigations = 0;
  const form = {
    dataset: { endpoint },
    querySelector(s) { return s === '.form-intro' ? intro : s === '.form-note' ? note : button; },
    append() {}, setAttribute() {}, removeAttribute() {}, reportValidity() { return true; },
    addEventListener(type, callback) { listeners[type] = callback; },
    reset() { resets++; }, dispatchEvent() {},
  };
  const location = { href: 'https://luxuryhandymansolvix.com/' };
  Object.defineProperty(location, 'assign', { value() { navigations++; } });
  vm.runInNewContext(source, {
    document: { querySelector: s => s === '#project-form' ? form : s === '#form-status' ? status : fallback, createElement: () => ({}) },
    window: { location }, URL, crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    FormData: class { *[Symbol.iterator]() { yield ['message', 'My shelf']; } },
    Event: class {}, AbortController, setTimeout, clearTimeout, fetch,
  });
  return { status, button, form, listeners, resets: () => resets, navigations: () => navigations, submit: () => listeners.submit({ preventDefault() {} }) };
}
test('unconfigured endpoint leaves current working form alone', () => {
  const ui = setup(() => assert.fail('No network call'), '');
  assert.equal(ui.listeners.submit, undefined);
});
test('accepted server response resets once and never opens mail', async () => {
  const ui = setup(async () => ({ status: 202, json: async () => ({ accepted: true }) }));
  await ui.submit();
  assert.equal(ui.resets(), 1);
  assert.match(ui.status.textContent, /submitted/);
  assert.equal(ui.navigations(), 0);
  assert.equal(ui.button.disabled, false);
});
test('errors and malformed success preserve input and never claim sent', async () => {
  for (const code of [400, 429, 503, 200]) {
    const ui = setup(async () => ({ status: code, json: async () => ({}) }));
    await ui.submit();
    assert.equal(ui.resets(), 0);
    assert.match(ui.status.textContent, /text is still here/);
    assert.doesNotMatch(ui.status.textContent, /submitted/);
  }
});
test('network failure preserves input and reuses request ID on retry', async () => {
  const ids = [];
  const ui = setup(async (_, opts) => { ids.push(opts.headers['Idempotency-Key']); throw new Error('offline'); });
  await ui.submit(); await ui.submit();
  assert.equal(ids[0], ids[1]);
  assert.equal(ui.resets(), 0);
  assert.equal(ui.button.disabled, false);
});
test('double click cannot issue two concurrent requests', async () => {
  let release, calls = 0;
  const ui = setup(() => { calls++; return new Promise(resolve => { release = resolve; }); });
  const pending = ui.submit();
  assert.equal(ui.button.disabled, true);
  await ui.submit();
  assert.equal(calls, 1);
  release({ status: 202, json: async () => ({ accepted: true }) });
  await pending;
});
