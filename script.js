const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); }
menuButton.addEventListener('click', () => { const open = navigation.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); });
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menuButton.focus(); } });
document.querySelector('#year').textContent = new Date().getFullYear();
const form = document.querySelector('#project-form');
const locationSelect = form.querySelector('[name="location"]');
const otherLocationField = document.querySelector('#other-location-field');
const otherLocationInput = document.querySelector('#other-location');
function updateLocationField() {
  const isOther = locationSelect.value === 'other';
  otherLocationField.hidden = !isOther;
  otherLocationInput.disabled = !isOther;
  otherLocationInput.required = isOther;
}
locationSelect.addEventListener('change', updateLocationField);
updateLocationField();
window.addEventListener('pageshow', updateLocationField);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const location = (data.get('location') === 'other' ? data.get('other_location') : data.get('location')).trim();
  const body = `Hello Luxury Handyman Company,\n\nI would like to discuss a project.\n\nName: ${data.get('name').trim()}\nEmail: ${data.get('email').trim()}\nLocation: ${location}\n\nProject details:\n${data.get('message').trim()}\n\nThank you!`;
  document.querySelector('#prepared-request').value = body;
  document.querySelector('#email-fallback').hidden = false;
  document.querySelector('#form-status').textContent = 'Your request is prepared. Review and send it in your email app. Nothing has been sent yet.';
  const subject = encodeURIComponent('Project inquiry');
  window.location.href = `mailto:info@luxuryhandymansolvix.com?subject=${subject}&body=${encodeURIComponent(body)}`;
});
document.querySelector('#copy-request').addEventListener('click', async () => {
  const request = document.querySelector('#prepared-request');
  try { await navigator.clipboard.writeText(request.value); document.querySelector('#form-status').textContent = 'Request copied. Paste it into your email or WhatsApp message and send it there.'; }
  catch { request.focus(); request.select(); document.querySelector('#form-status').textContent = 'Select and copy the prepared request below, then paste it into your email or WhatsApp message.'; }
});
