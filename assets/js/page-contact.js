/* Aurelia — contact form.
   A static site has no server to receive a message, so instead of faking a
   "sent" confirmation this composes a real mailto: with the message filled
   in. The visitor can see exactly where it is going.

   INTEGRATION SEAM: to receive submissions properly, point the form at a
   form backend (Formspree, Basin, Netlify Forms) and replace the mailto
   construction below with a fetch POST + success state. */

import { toast } from './ui.js';

const CONTACT_EMAIL = 'hello@aurelia.example';

const form = document.getElementById('contact-form');
const formError = document.getElementById('ct-form-error');

const RULES = {
  'ct-name': (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
  'ct-email': (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
  'ct-message': (v) => (v.trim().length >= 10 ? '' : 'Please add a little more detail (at least 10 characters).'),
};

function showError(id, message) {
  const field = document.getElementById(id);
  const slot = form.querySelector(`[data-err-for="${id}"]`);
  if (slot) slot.textContent = message;
  if (message) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
  return !message;
}

function validateField(id) {
  return showError(id, RULES[id](document.getElementById(id).value));
}

Object.keys(RULES).forEach((id) => {
  document.getElementById(id)?.addEventListener('blur', () => validateField(id));
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  let ok = true;
  let firstBad = null;
  Object.keys(RULES).forEach((id) => {
    if (!validateField(id)) {
      ok = false;
      if (!firstBad) firstBad = document.getElementById(id);
    }
  });
  if (!ok) {
    formError.textContent = 'Please correct the highlighted fields.';
    firstBad.focus();
    return;
  }
  formError.textContent = '';

  const data = Object.fromEntries(new FormData(form).entries());
  const subject = `[${data.subject}] ${data.name}`;
  const lines = [
    data.message.trim(),
    '',
    '—',
    `Name: ${data.name.trim()}`,
    `Email: ${data.email.trim()}`,
    data.order?.trim() ? `Order reference: ${data.order.trim()}` : '',
    `Topic: ${data.subject}`,
  ].filter((l) => l !== '');

  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;

  // Assigning location is what opens the mail client; it does not navigate away.
  window.location.href = href;
  toast('Opening your email app with the message ready to send.', { icon: false, duration: 5000 });
});
