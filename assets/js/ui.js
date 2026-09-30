/* Aurelia — global UI behaviour. Loaded on every page.
   Handles: image fallbacks, nav + cart drawers, the cart badge, add-to-bag
   and wishlist buttons, toasts, scroll reveals, active nav state and the
   demo newsletter form. Everything is event-delegated so markup rendered
   later (e.g. the shop grid) is wired automatically. */

import * as cart from './cart.js';
import * as catalog from './catalog.js';
import { money, imgAttrs, escapeHtml, escapeAttr } from './format.js';

/* --- Image fallbacks ---------------------------------------------------- */
/* `error` does not bubble, so we listen in the capture phase on window.
   Each <img data-fallback="..."> falls back once, then gives up. */
window.addEventListener('error', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLImageElement)) return;
  const fb = el.dataset.fallback;
  if (!fb || el.dataset.fellBack === '1') return;
  el.dataset.fellBack = '1';
  el.removeAttribute('srcset');
  el.removeAttribute('sizes');
  el.src = fb;
}, true);

/* --- Toasts ------------------------------------------------------------- */
let toastRegion = null;

function ensureToastRegion() {
  if (toastRegion) return toastRegion;
  toastRegion = document.createElement('div');
  toastRegion.className = 'toast-region';
  toastRegion.setAttribute('role', 'status');
  toastRegion.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastRegion);
  return toastRegion;
}

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

export function toast(message, { icon = true, duration = 3200 } = {}) {
  const region = ensureToastRegion();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon ? CHECK : ''}<span>${escapeHtml(message)}</span>`;
  region.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('is-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    window.setTimeout(() => el.remove(), 600);
  }, duration);
}

/* --- Drawers ------------------------------------------------------------ */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
let lastFocused = null;

function openDrawer(id) {
  const drawer = document.getElementById(id);
  if (!drawer) return;
  lastFocused = document.activeElement;
  drawer.dataset.open = 'true';
  document.body.style.overflow = 'hidden';
  const first = drawer.querySelector(FOCUSABLE);
  if (first) window.setTimeout(() => first.focus(), 60);
}

function closeDrawer(drawer) {
  if (!drawer) return;
  drawer.dataset.open = 'false';
  if (!document.querySelector('.drawer[data-open="true"]')) {
    document.body.style.overflow = '';
  }
  if (lastFocused instanceof HTMLElement) lastFocused.focus();
}

function closeAllDrawers() {
  document.querySelectorAll('.drawer[data-open="true"]').forEach(closeDrawer);
}

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-drawer-open]');
  if (opener) {
    e.preventDefault();
    openDrawer(opener.dataset.drawerOpen);
    return;
  }
  const closer = e.target.closest('[data-drawer-close]');
  if (closer || e.target.classList?.contains('drawer-scrim')) {
    closeDrawer(e.target.closest('.drawer'));
  }
});

document.addEventListener('keydown', (e) => {
  const open = document.querySelector('.drawer[data-open="true"]');
  if (!open) return;
  if (e.key === 'Escape') {
    closeDrawer(open);
    return;
  }
  if (e.key !== 'Tab') return;
  // Keep focus inside the panel while it is open.
  const items = [...open.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
});

/* --- Cart badge + mini cart --------------------------------------------- */

function renderBadge(state) {
  const n = state.totals.itemCount;
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(n);
    el.hidden = n === 0;
  });
}

function miniLineHtml(line) {
  const href = `product.html?id=${encodeURIComponent(line.slug)}`;
  return `
  <div class="mini-item">
    <a class="mi-media" href="${escapeAttr(href)}">
      <img ${imgAttrs(line.image, { width: 200 })} width="200" height="250">
    </a>
    <div>
      <a class="mi-name" href="${escapeAttr(href)}">${escapeHtml(line.name)}</a>
      <div class="mi-qty">${line.size ? `Size ${escapeHtml(line.size)} · ` : ''}Qty ${line.qty}</div>
    </div>
    <div style="text-align:right">
      <div>${money(line.price * line.qty)}</div>
      <button type="button" class="link-danger" data-remove="${escapeAttr(line.key)}">Remove</button>
    </div>
  </div>`;
}

function renderMiniCart(state) {
  const body = document.getElementById('cart-drawer-body');
  const foot = document.getElementById('cart-drawer-foot');
  if (!body || !foot) return;

  if (!state.items.length) {
    body.innerHTML = `
      <div class="stack stack-4" style="text-align:center;padding:var(--s-10) 0">
        <p style="color:var(--muted)">Your bag is empty.</p>
        <a class="btn btn-primary" href="shop.html">Browse the collection</a>
      </div>`;
    foot.innerHTML = '';
    return;
  }

  const t = state.totals;
  body.innerHTML = `<div class="stack stack-5">${state.items.map(miniLineHtml).join('')}</div>`;
  foot.innerHTML = `
    ${t.freeShippingGap > 0
      ? `<p style="font-size:var(--fs-xs);color:var(--muted);margin-bottom:var(--s-3)">Add ${money(t.freeShippingGap)} more for free shipping.</p>`
      : '<p style="font-size:var(--fs-xs);color:var(--success);margin-bottom:var(--s-3)">Free shipping applied.</p>'}
    <div class="summary-total" style="margin-top:0;border-top:0;padding-top:0">
      <span>Subtotal</span><b>${money(t.subtotal)}</b>
    </div>
    <div class="stack stack-2" style="margin-top:var(--s-4)">
      <a class="btn btn-primary btn-block" href="checkout.html">Checkout</a>
      <a class="btn btn-ghost btn-block" href="cart.html">View bag</a>
    </div>`;
}

function syncCart(state = cart.getState()) {
  renderBadge(state);
  renderMiniCart(state);
}

document.addEventListener('cart:change', (e) => syncCart(e.detail));

/* --- Add to bag / remove / wishlist ------------------------------------- */

document.addEventListener('click', async (e) => {
  const addBtn = e.target.closest('[data-add]');
  if (addBtn) {
    e.preventDefault();
    const slug = addBtn.dataset.add;
    addBtn.disabled = true;
    try {
      const product = await catalog.bySlug(slug);
      if (!product) { toast('Sorry — that product could not be found.', { icon: false }); return; }
      if (!product.inStock) { toast(`${product.name} is sold out.`, { icon: false }); return; }
      cart.addItem(product, { qty: 1 });
      toast(`${product.name} added to your bag.`);
      openDrawer('cart-drawer');
    } catch (err) {
      toast('Could not add to bag — please reload the page.', { icon: false });
    } finally {
      addBtn.disabled = false;
    }
    return;
  }

  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    e.preventDefault();
    cart.removeItem(removeBtn.dataset.remove);
    toast('Removed from your bag.', { icon: false });
    return;
  }

  const wishBtn = e.target.closest('[data-wishlist]');
  if (wishBtn) {
    e.preventDefault();
    const slug = wishBtn.dataset.wishlist;
    const nowSaved = catalog.toggleWishlist(slug);
    wishBtn.setAttribute('aria-pressed', String(nowSaved));
    toast(nowSaved ? 'Saved to your wishlist.' : 'Removed from your wishlist.', { icon: nowSaved });
  }
});

/* Keep every wishlist button on the page in sync with the stored list. */
document.addEventListener('wishlist:change', (e) => {
  const list = e.detail ?? [];
  document.querySelectorAll('[data-wishlist]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(list.includes(btn.dataset.wishlist)));
  });
});

/* --- Scroll reveal ------------------------------------------------------ */

function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach((el) => io.observe(el));
}

/* --- Active nav --------------------------------------------------------- */

function markActiveNav() {
  const here = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a, .drawer-nav a').forEach((a) => {
    const target = a.getAttribute('href')?.split('?')[0].split('#')[0];
    if (!target) return;
    if (target === here) a.setAttribute('aria-current', 'page');
    // Treat product & blog detail pages as belonging to their section.
    if (here === 'product.html' && target === 'shop.html') a.setAttribute('aria-current', 'page');
    if (here.startsWith('blog-') && target === 'blog.html') a.setAttribute('aria-current', 'page');
  });
}

/* --- Newsletter (demo) -------------------------------------------------- */
/* INTEGRATION SEAM: to collect real addresses, replace the body of this
   handler with a POST to your provider (Mailchimp / Buttondown / Formspree)
   or swap the <form> for their embed. Nothing is stored or sent today. */

function initNewsletter() {
  document.querySelectorAll('form[data-newsletter]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input || !input.value.trim()) return;
      if (!input.checkValidity()) { toast('Please enter a valid email address.', { icon: false }); return; }
      form.reset();
      toast('Thanks! This is a demo form — no address was stored.', { icon: false, duration: 4200 });
    });
  });
}

/* --- Footer year -------------------------------------------------------- */

function stampYear() {
  const y = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = y; });
}

/* --- Boot --------------------------------------------------------------- */

function boot() {
  syncCart();
  initReveal();
  markActiveNav();
  initNewsletter();
  stampYear();
  // Reflect stored wishlist state on any statically-rendered buttons.
  document.dispatchEvent(new CustomEvent('wishlist:change', { detail: catalog.getWishlist() }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export { openDrawer, closeDrawer, closeAllDrawers, syncCart };
