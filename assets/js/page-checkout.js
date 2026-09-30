/* Aurelia — demo checkout.
   Validates the form properly, then records the order locally and moves to
   the confirmation page. No payment details are collected and no network
   request is made: there is no processor behind this. */

import * as cart from './cart.js';
import * as orders from './orders.js';
import * as user from './user.js';
import { money, imgAttrs, escapeHtml, escapeAttr } from './format.js';

const form = document.getElementById('checkout-form');
const summaryEl = document.getElementById('checkout-summary');
const formError = document.getElementById('co-form-error');
const submitBtn = document.getElementById('co-submit');

/* --- Summary ------------------------------------------------------------ */

function renderSummary(state = cart.getState()) {
  const t = state.totals;
  summaryEl.removeAttribute('aria-busy');

  if (!state.items.length) {
    summaryEl.innerHTML = `
      <h2 style="font-size:var(--fs-lg);font-family:var(--font-body);font-weight:600">Your bag is empty</h2>
      <p style="color:var(--muted);font-size:var(--fs-sm);margin-top:var(--s-3)">Add a piece before checking out.</p>
      <a class="btn btn-primary btn-block" href="shop.html" style="margin-top:var(--s-5)">Shop the collection</a>`;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Nothing to order';
    return;
  }

  submitBtn.disabled = false;
  summaryEl.innerHTML = `
    <h2 style="font-size:var(--fs-lg);font-family:var(--font-body);font-weight:600;margin-bottom:var(--s-5)">
      Order summary
    </h2>
    <div class="stack stack-4">${state.items.map((l) => `
      <div class="mini-item">
        <span class="mi-media"><img ${imgAttrs(l.image, { width: 160 })} width="160" height="200"></span>
        <span>
          <span class="mi-name">${escapeHtml(l.name)}</span>
          <span class="mi-qty">${l.size ? `Size ${escapeHtml(l.size)} · ` : ''}Qty ${l.qty}</span>
        </span>
        <span>${money(l.price * l.qty)}</span>
      </div>`).join('')}
    </div>
    <div class="summary-rows" style="margin-top:var(--s-6);padding-top:var(--s-5);border-top:1px solid var(--line)">
      <div><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      ${t.discount ? `<div class="discount"><span>Discount (${escapeHtml(t.promoCode)})</span><span>−${money(t.discount)}</span></div>` : ''}
      <div><span>Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></div>
    </div>
    <div class="summary-total"><span>Total</span><b>${money(t.total)}</b></div>
    <p style="font-size:var(--fs-xs);color:var(--muted);margin-top:var(--s-4)">
      You will not be charged. This storefront has no payment processor connected.
    </p>`;
}

/* --- Validation --------------------------------------------------------- */

const RULES = {
  'co-name':  (v) => (v.trim().length >= 2 ? '' : 'Please enter your full name.'),
  'co-email': (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
  'co-phone': (v) => (/^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a 10-digit Indian mobile number.'),
  'co-addr1': (v) => (v.trim().length >= 5 ? '' : 'Please enter your street address.'),
  'co-city':  (v) => (v.trim().length >= 2 ? '' : 'Please enter your city.'),
  'co-state': (v) => (v.trim().length >= 2 ? '' : 'Please enter your state.'),
  'co-pin':   (v) => (/^\d{6}$/.test(v.trim()) ? '' : 'Indian PIN codes are 6 digits.'),
};

function showError(id, message) {
  const field = document.getElementById(id);
  const slot = form.querySelector(`[data-err-for="${id}"]`);
  if (slot) slot.textContent = message;
  if (field) {
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }
  return !message;
}

function validateField(id) {
  const field = document.getElementById(id);
  if (!field || !RULES[id]) return true;
  return showError(id, RULES[id](field.value));
}

function validateAll() {
  let firstBad = null;
  let ok = true;
  Object.keys(RULES).forEach((id) => {
    if (!validateField(id)) {
      ok = false;
      if (!firstBad) firstBad = document.getElementById(id);
    }
  });

  const terms = document.getElementById('co-terms');
  if (!terms.checked) {
    showError('co-terms', 'Please acknowledge the demo notice to continue.');
    ok = false;
    if (!firstBad) firstBad = terms;
  } else {
    showError('co-terms', '');
  }

  if (!ok && firstBad) {
    formError.textContent = 'Please correct the highlighted fields.';
    firstBad.focus();
    firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } else {
    formError.textContent = '';
  }
  return ok;
}

/* Validate on blur — never while someone is still typing. */
Object.keys(RULES).forEach((id) => {
  document.getElementById(id)?.addEventListener('blur', () => validateField(id));
});
document.getElementById('co-terms').addEventListener('change', (e) => {
  if (e.target.checked) showError('co-terms', '');
});

/* --- Prefill from a saved address --------------------------------------- */

function prefill() {
  const saved = user.getAddress();
  const u = user.getUser();
  if (u?.email && !document.getElementById('co-email').value) {
    document.getElementById('co-email').value = u.email;
    if (u.name) document.getElementById('co-name').value = u.name;
  }
  if (!saved) return;
  ['name', 'email', 'phone', 'addr1', 'addr2', 'city', 'state', 'pin'].forEach((k) => {
    const field = form.querySelector(`[name="${k}"]`);
    if (field && saved[k] && !field.value) field.value = saved[k];
  });
}

/* --- Submit ------------------------------------------------------------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const state = cart.getState();
  if (!state.items.length) {
    formError.textContent = 'Your bag is empty.';
    return;
  }
  if (!validateAll()) return;

  const data = Object.fromEntries(new FormData(form).entries());
  const customer = {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.replace(/[\s-]/g, ''),
    addr1: data.addr1.trim(),
    addr2: (data.addr2 ?? '').trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    pin: data.pin.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Recording your order…';

  try {
    const order = orders.createOrder({
      items: state.items,
      totals: state.totals,
      customer,
      payment: data.payment ?? 'UPI',
    });

    if (data.save) user.saveAddress(customer);
    // Sign the visitor in locally so the order appears under their account.
    if (!user.isSignedIn()) user.signIn({ email: customer.email, name: customer.name });

    cart.clear();
    window.location.href = `order-confirmation.html?order=${encodeURIComponent(order.id)}`;
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place order (demo)';
    formError.textContent = 'Could not record the order on this device. Check that your browser allows local storage.';
  }
});

document.addEventListener('cart:change', (e) => renderSummary(e.detail));
renderSummary();
prefill();
