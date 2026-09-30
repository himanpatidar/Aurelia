/* Aurelia — cart state.
   Persisted in localStorage under "aurelia:cart:v1". Any mutation dispatches
   a `cart:change` event on `document`, which the header badge, the cart
   drawer and the cart/checkout pages all listen for. */

import { read, write, onExternalChange } from './store.js';

const KEY = 'cart:v1';
const MAX_QTY = 10;

export const SHIPPING = {
  flat: 99,
  freeAbove: 1499,
};

/* Promo codes are intentionally client-side — this is a static storefront and
   these are demo codes. Never put a code here that represents real money you
   cannot afford to honour, because anyone can read this file. */
export const PROMOS = {
  AURELIA10: { type: 'percent', value: 10, minSubtotal: 0,    label: '10% off your order' },
  SHINE15:   { type: 'percent', value: 15, minSubtotal: 2000, label: '15% off over ₹2,000' },
  FREESHIP:  { type: 'shipping', value: 0, minSubtotal: 0,    label: 'Free shipping' },
};

/** A stable key per cart line: same product + same size = same line. */
function lineKey(slug, size) {
  return size ? `${slug}::${size}` : slug;
}

function load() {
  const data = read(KEY, { items: [], promo: null });
  return {
    items: Array.isArray(data.items) ? data.items.filter(isValidLine) : [],
    promo: typeof data.promo === 'string' ? data.promo : null,
  };
}

function isValidLine(l) {
  return l && typeof l.slug === 'string' && Number.isFinite(l.price) && Number.isFinite(l.qty) && l.qty > 0;
}

function save(state) {
  write(KEY, state);
  emit();
}

function emit() {
  document.dispatchEvent(new CustomEvent('cart:change', { detail: getState() }));
}

export function getState() {
  const state = load();
  return { ...state, totals: totalsFor(state) };
}

export function getItems() {
  return load().items;
}

export function count() {
  return load().items.reduce((n, l) => n + l.qty, 0);
}

/**
 * Add a product to the cart.
 * @param {object} product  a product record from products.json
 * @param {{size?: string, qty?: number}} opts
 */
export function addItem(product, { size = '', qty = 1 } = {}) {
  const state = load();
  const key = lineKey(product.slug, size);
  const existing = state.items.find((l) => l.key === key);
  const add = Math.max(1, Math.trunc(qty));

  if (existing) {
    existing.qty = Math.min(MAX_QTY, existing.qty + add);
  } else {
    state.items.push({
      key,
      slug: product.slug,
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      size,
      qty: Math.min(MAX_QTY, add),
      image: product.images?.[0] ?? null,
    });
  }
  save(state);
  return getState();
}

export function setQty(key, qty) {
  const state = load();
  const line = state.items.find((l) => l.key === key);
  if (!line) return getState();
  const n = Math.trunc(Number(qty));
  if (!Number.isFinite(n) || n < 1) return removeItem(key);
  line.qty = Math.min(MAX_QTY, n);
  save(state);
  return getState();
}

export function removeItem(key) {
  const state = load();
  state.items = state.items.filter((l) => l.key !== key);
  if (!state.items.length) state.promo = null;
  save(state);
  return getState();
}

export function clear() {
  save({ items: [], promo: null });
  return getState();
}

/* --- Promo codes -------------------------------------------------------- */

/** @returns {{ok: boolean, message: string}} */
export function applyPromo(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  const state = load();
  if (!code) return { ok: false, message: 'Enter a code to apply.' };

  const promo = PROMOS[code];
  if (!promo) return { ok: false, message: `"${code}" is not a valid code.` };

  const subtotal = subtotalFor(state);
  if (subtotal < promo.minSubtotal) {
    return { ok: false, message: `${code} needs a subtotal of ₹${promo.minSubtotal.toLocaleString('en-IN')} or more.` };
  }

  state.promo = code;
  save(state);
  return { ok: true, message: `${code} applied — ${promo.label}.` };
}

export function removePromo() {
  const state = load();
  state.promo = null;
  save(state);
  return getState();
}

/* --- Totals ------------------------------------------------------------- */

function subtotalFor(state) {
  return state.items.reduce((sum, l) => sum + l.price * l.qty, 0);
}

function totalsFor(state) {
  const subtotal = subtotalFor(state);
  const itemCount = state.items.reduce((n, l) => n + l.qty, 0);
  const promo = state.promo ? PROMOS[state.promo] : null;
  const promoValid = promo && subtotal >= promo.minSubtotal;

  let discount = 0;
  if (promoValid && promo.type === 'percent') {
    discount = Math.round((subtotal * promo.value) / 100);
  }

  const afterDiscount = subtotal - discount;
  let shipping = 0;
  if (itemCount > 0) {
    const freeByPromo = promoValid && promo.type === 'shipping';
    shipping = (freeByPromo || afterDiscount >= SHIPPING.freeAbove) ? 0 : SHIPPING.flat;
  }

  return {
    itemCount,
    subtotal,
    discount,
    shipping,
    total: afterDiscount + shipping,
    promoCode: promoValid ? state.promo : null,
    promoLabel: promoValid ? promo.label : null,
    freeShippingGap: Math.max(0, SHIPPING.freeAbove - afterDiscount),
  };
}

/* Keep tabs in sync: another tab changing the cart re-emits locally. */
onExternalChange(KEY, () => emit());
