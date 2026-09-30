/* Aurelia — product catalog: loading, filtering, sorting and card rendering.
   The fetch is memoised, so several modules on one page share a single
   request. NOTE: fetch() of a local JSON file does not work over file:// —
   serve the folder (python3 -m http.server) when previewing locally. */

import { money, discountPercent, imgAttrs, escapeHtml, escapeAttr, starsHtml } from './format.js';
import { read, write } from './store.js';

const DATA_URL = 'data/products.json';
const WISHLIST_KEY = 'wishlist:v1';

let cache = null;

/** Load and memoise the catalog. Rejects with a readable message on failure. */
export function load() {
  if (!cache) {
    cache = fetch(DATA_URL, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load the catalog (HTTP ${res.status}).`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data?.products)) throw new Error('Catalog file is missing a "products" array.');
        return data;
      })
      .catch((err) => {
        cache = null; // allow a retry on the next call
        throw err;
      });
  }
  return cache;
}

export async function all() {
  return (await load()).products;
}

export async function categories() {
  return (await load()).categories ?? [];
}

export async function materials() {
  return (await load()).materials ?? [];
}

export async function bySlug(slug) {
  return (await all()).find((p) => p.slug === slug) ?? null;
}

export async function featured(limit = 4) {
  const list = (await all()).filter((p) => p.featured);
  return list.slice(0, limit);
}

export async function related(product, limit = 4) {
  if (!product) return [];
  const list = await all();
  const sameCategory = list.filter((p) => p.category === product.category && p.slug !== product.slug);
  const sameMaterial = list.filter((p) => p.material === product.material && p.slug !== product.slug
    && !sameCategory.includes(p));
  return [...sameCategory, ...sameMaterial].slice(0, limit);
}

/** Human label for a category/material slug, from the catalog's own lists. */
export async function labelFor(kind, slug) {
  const data = await load();
  const list = kind === 'material' ? data.materials : data.categories;
  return list?.find((x) => x.slug === slug)?.label ?? slug;
}

/* --- Filtering ---------------------------------------------------------- */

export const SORTS = {
  featured:     { label: 'Featured',        fn: (a, b) => (b.featured - a.featured) || (b.rating - a.rating) },
  'price-asc':  { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  rating:       { label: 'Top rated',       fn: (a, b) => (b.rating - a.rating) || (b.reviewCount - a.reviewCount) },
  newest:       { label: 'Newest first',    fn: (a, b) => String(b.addedOn).localeCompare(String(a.addedOn)) },
  name:         { label: 'Name: A to Z',    fn: (a, b) => a.name.localeCompare(b.name) },
};

/** Free-text match across the fields a shopper would plausibly type. */
function matchesQuery(p, tokens) {
  if (!tokens.length) return true;
  const haystack = [
    p.name, p.shortDescription, p.description, p.category, p.material,
    p.finish, ...(p.badges ?? []), ...Object.values(p.specs ?? {}),
  ].join(' ').toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

/**
 * @param {Array} products
 * @param {{categories?:string[], materials?:string[], minPrice?:number,
 *          maxPrice?:number, inStockOnly?:boolean, q?:string}} f
 */
export function filter(products, f = {}) {
  const tokens = String(f.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  const cats = f.categories ?? [];
  const mats = f.materials ?? [];

  return products.filter((p) => {
    if (cats.length && !cats.includes(p.category)) return false;
    if (mats.length && !mats.includes(p.material)) return false;
    if (Number.isFinite(f.minPrice) && p.price < f.minPrice) return false;
    if (Number.isFinite(f.maxPrice) && p.price > f.maxPrice) return false;
    if (f.inStockOnly && !p.inStock) return false;
    return matchesQuery(p, tokens);
  });
}

export function sort(products, key = 'featured') {
  const s = SORTS[key] ?? SORTS.featured;
  return [...products].sort(s.fn);
}

export function priceBounds(products) {
  if (!products.length) return { min: 0, max: 0 };
  const prices = products.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/* --- Wishlist ----------------------------------------------------------- */

export function getWishlist() {
  const list = read(WISHLIST_KEY, []);
  return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
}

export function inWishlist(slug) {
  return getWishlist().includes(slug);
}

/** @returns {boolean} the new state (true = now saved) */
export function toggleWishlist(slug) {
  const list = getWishlist();
  const i = list.indexOf(slug);
  if (i >= 0) list.splice(i, 1);
  else list.push(slug);
  write(WISHLIST_KEY, list);
  document.dispatchEvent(new CustomEvent('wishlist:change', { detail: list }));
  return i < 0;
}

/* --- Rendering ---------------------------------------------------------- */

const CARD_SIZES = '(min-width:1024px) 280px, (min-width:640px) 45vw, 90vw';

/** The product card used on the home page, shop grid, related rails and account. */
export function productCardHtml(p, { eager = false } = {}) {
  const off = discountPercent(p.price, p.compareAtPrice);
  const primary = p.images?.[0];
  const alt = p.images?.[1] ?? primary;
  const saved = inWishlist(p.slug);
  const href = `product.html?id=${encodeURIComponent(p.slug)}`;

  const flags = [
    p.badges?.includes('new') ? '<span class="badge badge-new">New</span>' : '',
    p.badges?.includes('bestseller') ? '<span class="badge badge-bestseller">Bestseller</span>' : '',
    off ? `<span class="badge badge-sale">${off}% off</span>` : '',
  ].filter(Boolean).join('');

  return `
  <article class="product-card" data-slug="${escapeAttr(p.slug)}">
    <a class="product-media" href="${escapeAttr(href)}" aria-label="${escapeAttr(p.name)}">
      <img class="is-primary" ${imgAttrs(primary, { width: 800, sizes: CARD_SIZES, eager })} width="800" height="1000">
      ${alt && alt !== primary ? `<img class="is-alt" ${imgAttrs(alt, { width: 800, sizes: CARD_SIZES })} width="800" height="1000">` : ''}
      ${p.inStock ? '' : '<span class="oos-veil">Sold out</span>'}
    </a>
    ${flags ? `<div class="product-flags">${flags}</div>` : ''}
    <button type="button" class="wishlist-btn" data-wishlist="${escapeAttr(p.slug)}"
            aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${escapeAttr(p.name)} ${saved ? 'from' : 'to'} your wishlist">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M12 20.5l-1.4-1.3C5.7 14.9 3 12.4 3 9.2A4.7 4.7 0 0 1 7.7 4.5c1.6 0 3.1.8 4.3 2.3 1.2-1.5 2.7-2.3 4.3-2.3A4.7 4.7 0 0 1 21 9.2c0 3.2-2.7 5.7-7.6 10z"/>
      </svg>
    </button>
    <div class="product-meta">
      <span class="product-cat">${escapeHtml(p.finish || p.category)}</span>
      <a class="product-name" href="${escapeAttr(href)}">${escapeHtml(p.name)}</a>
      <div class="rating">${starsHtml(p.rating)}<span>${p.rating} (${p.reviewCount})</span></div>
      <div class="product-price">
        <b>${money(p.price)}</b>
        ${p.compareAtPrice ? `<s>${money(p.compareAtPrice)}</s>` : ''}
      </div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm add-btn" data-add="${escapeAttr(p.slug)}"
            ${p.inStock ? '' : 'disabled'}>
      ${p.inStock ? 'Add to bag' : 'Sold out'}
    </button>
  </article>`;
}

export function renderGrid(container, products, opts = {}) {
  if (!container) return;
  container.innerHTML = products.map((p, i) => productCardHtml(p, { eager: opts.eager && i < 2 })).join('');
}
