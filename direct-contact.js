/* Activated only after an HTTPS endpoint has been deployed and verified. */
(function () {
  const form = document.querySelector('#project-form');
  if (!form || !form.dataset.endpoint) return;
  const endpoint = new URL(form.dataset.endpoint, window.location.href);
  if (endpoint.protocol !== 'https:') return;
  form.dataset.directActive = 'true';
  const status = document.querySelector('#form-status');
  const button = form.querySelector('button[type="submit"]');
  form.querySelector('.form-intro').textContent = 'Send your project details directly to our team.';
  form.querySelector('.form-note').innerHTML = 'Your request will be emailed to info@luxuryhandymansolvix.com. See our <a href="privacy.html">Privacy notice</a>.';
  button.innerHTML = 'Send my message <span aria-hidden="true">↗</span>';
  const buttonLabel = button.innerHTML;
  const trap = document.createElement('input');
  trap.name = 'website';
  trap.autocomplete = 'off';
  trap.tabIndex = -1;
  trap.hidden = true;
  form.append(trap);
  let pending = false;
  let previousPayload = '';
  let requestId;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const payload = JSON.stringify(Object.fromEntries(new FormData(form)));
    if (payload !== previousPayload) {
      previousPayload = payload;
      requestId = crypto.randomUUID();
    }
    pending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your request…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(endpoint.href, {
        method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId },
        body: payload, signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 202 && result.accepted === true) {
        status.textContent = 'Thank you. Your request has been submitted to Luxury Handyman Company.';
        form.reset();
        form.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('#email-fallback').hidden = true;
        previousPayload = '';
      } else if (response.status === 429) {
        status.textContent = 'Too many requests. Please try later, or contact us by phone or WhatsApp. Your text is still here.';
      } else if (response.status === 400) {
        status.textContent = 'Please check your name, email, location and project details. Your text is still here.';
      } else {
        status.textContent = 'We could not confirm delivery. Your text is still here. Please contact us by phone or WhatsApp before sending again.';
      }
    } catch {
      status.textContent = 'We could not confirm delivery. Please check your connection. Your text is still here; you can contact us by phone or WhatsApp.';
    } finally {
      clearTimeout(timer);
      pending = false;
      button.disabled = false;
      button.innerHTML = buttonLabel;
      form.removeAttribute('aria-busy');
    }
  });
})();
