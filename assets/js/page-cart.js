/* Aurelia — cart page: line items, quantities, promo code and totals. */

import * as cart from './cart.js';
import * as catalog from './catalog.js';
import { toast } from './ui.js';
import { money, imgAttrs, escapeHtml, escapeAttr } from './format.js';

const root = document.getElementById('cart-root');

function lineHtml(line) {
  const href = `product.html?id=${encodeURIComponent(line.slug)}`;
  return `
  <div class="line-item" data-key="${escapeAttr(line.key)}">
    <a class="li-media" href="${escapeAttr(href)}">
      <img ${imgAttrs(line.image, { width: 240 })} width="240" height="300">
    </a>
    <div class="li-body">
      <div class="li-top">
        <div>
          <a class="li-name" href="${escapeAttr(href)}">${escapeHtml(line.name)}</a>
          <div class="li-attr">${line.size ? `Size ${escapeHtml(line.size)} · ` : ''}${escapeHtml(line.category)}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          <b>${money(line.price * line.qty)}</b>
          ${line.qty > 1 ? `<div class="li-attr">${money(line.price)} each</div>` : ''}
        </div>
      </div>
      <div class="li-foot">
        <div class="qty">
          <button type="button" data-qty-step="-1" aria-label="Decrease quantity of ${escapeAttr(line.name)}">−</button>
          <input type="number" value="${line.qty}" min="1" max="10" step="1" data-qty-input
                 aria-label="Quantity of ${escapeAttr(line.name)}">
          <button type="button" data-qty-step="1" aria-label="Increase quantity of ${escapeAttr(line.name)}">+</button>
        </div>
        <button type="button" class="link-danger" data-remove="${escapeAttr(line.key)}">Remove</button>
      </div>
    </div>
  </div>`;
}

function summaryHtml(t) {
  return `
  <aside class="summary card" aria-label="Order summary">
    <h2 style="font-size:var(--fs-lg);font-family:var(--font-body);font-weight:600;margin-bottom:var(--s-5)">Order summary</h2>
    <div class="summary-rows">
      <div><span>Subtotal (${t.itemCount} ${t.itemCount === 1 ? 'item' : 'items'})</span><span>${money(t.subtotal)}</span></div>
      ${t.discount ? `<div class="discount"><span>Discount (${escapeHtml(t.promoCode)})</span><span>−${money(t.discount)}</span></div>` : ''}
      <div><span>Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></div>
    </div>
    <div class="summary-total"><span>Total</span><b>${money(t.total)}</b></div>

    ${t.freeShippingGap > 0
      ? `<p style="font-size:var(--fs-xs);color:var(--muted);margin-top:var(--s-4)">Add ${money(t.freeShippingGap)} more to qualify for free shipping.</p>`
      : `<p style="font-size:var(--fs-xs);color:var(--success);margin-top:var(--s-4)">Free shipping applied.</p>`}

    <div style="margin-top:var(--s-6)">
      ${t.promoCode
        ? `<div class="notice notice-ok" style="font-size:var(--fs-xs);padding:var(--s-3) var(--s-4)">
             <span><strong>${escapeHtml(t.promoCode)}</strong> — ${escapeHtml(t.promoLabel)}.
             <button type="button" class="link-danger" id="promo-remove" style="margin-left:var(--s-2)">Remove</button></span>
           </div>`
        : `<form class="promo-form" id="promo-form" novalidate>
             <label class="sr-only" for="promo-code">Promo code</label>
             <input class="input" id="promo-code" name="code" type="text" placeholder="Promo code" autocomplete="off" spellcheck="false">
             <button class="btn btn-ghost btn-sm" type="submit">Apply</button>
           </form>
           <p style="font-size:var(--fs-xs);color:var(--muted);margin-top:var(--s-2)">Try <code>AURELIA10</code> or <code>SHINE15</code>.</p>`}
      <span class="err" id="promo-msg" role="alert" style="display:block;margin-top:var(--s-2)"></span>
    </div>

    <div class="stack stack-2" style="margin-top:var(--s-6)">
      <a class="btn btn-primary btn-block" href="checkout.html">Proceed to checkout</a>
      <a class="btn btn-ghost btn-block" href="shop.html">Continue shopping</a>
    </div>
    <p style="font-size:var(--fs-xs);color:var(--muted);text-align:center;margin-top:var(--s-4)">
      Demo storefront — no payment is taken.
    </p>
  </aside>`;
}

function emptyHtml() {
  return `
  <div class="empty-state" style="grid-column:1/-1">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
    <h2 style="font-size:var(--fs-2xl)">Your bag is empty</h2>
    <p style="color:var(--muted);max-width:40ch">Nothing here yet. The bestsellers are a good place to start — all under ₹2,500.</p>
    <div class="cluster" style="justify-content:center">
      <a class="btn btn-primary" href="shop.html">Shop the collection</a>
      <a class="btn btn-ghost" href="account.html">View your wishlist</a>
    </div>
  </div>`;
}

function render(state = cart.getState()) {
  root.removeAttribute('aria-busy');
  if (!state.items.length) {
    root.style.gridTemplateColumns = '1fr';
    root.innerHTML = emptyHtml();
    document.getElementById('cart-recs-section').hidden = true;
    return;
  }
  root.style.gridTemplateColumns = '';
  root.innerHTML = `
    <div>
      <div style="border-top:1px solid var(--line)">${state.items.map(lineHtml).join('')}</div>
      <p style="font-size:var(--fs-xs);color:var(--muted);margin-top:var(--s-5)">
        Prices include GST. Maximum 10 of any one piece per order.
      </p>
    </div>
    ${summaryHtml(state.totals)}`;
  renderRecs(state);
}

/* Suggest pieces from categories not already in the bag. */
async function renderRecs(state) {
  const section = document.getElementById('cart-recs-section');
  const grid = document.getElementById('cart-recs');
  try {
    const all = await catalog.all();
    const have = new Set(state.items.map((l) => l.slug));
    const haveCats = new Set(state.items.map((l) => l.category));
    const picks = all
      .filter((p) => p.inStock && !have.has(p.slug))
      .sort((a, b) => (haveCats.has(a.category) - haveCats.has(b.category)) || (b.rating - a.rating))
      .slice(0, 4);
    if (!picks.length) { section.hidden = true; return; }
    section.hidden = false;
    catalog.renderGrid(grid, picks);
  } catch {
    section.hidden = true;
  }
}

/* --- Events ------------------------------------------------------------- */

root.addEventListener('click', (e) => {
  const step = e.target.closest('[data-qty-step]');
  if (step) {
    const wrap = step.closest('.line-item');
    const input = wrap.querySelector('[data-qty-input]');
    const next = (Number(input.value) || 1) + Number(step.dataset.qtyStep);
    cart.setQty(wrap.dataset.key, next);
  }
});

root.addEventListener('change', (e) => {
  const input = e.target.closest('[data-qty-input]');
  if (!input) return;
  cart.setQty(input.closest('.line-item').dataset.key, input.value);
});

root.addEventListener('submit', (e) => {
  const form = e.target.closest('#promo-form');
  if (!form) return;
  e.preventDefault();
  const msg = document.getElementById('promo-msg');
  const result = cart.applyPromo(form.querySelector('#promo-code').value);
  if (result.ok) {
    toast(result.message);
  } else {
    msg.textContent = result.message;
  }
});

root.addEventListener('click', (e) => {
  if (e.target.id !== 'promo-remove') return;
  cart.removePromo();
  toast('Promo code removed.', { icon: false });
});

document.addEventListener('cart:change', (e) => render(e.detail));
render();
