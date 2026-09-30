/* Aurelia — formatting helpers.
   CHANGE CURRENCY HERE: edit CURRENCY below and nothing else. */

export const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
};

const priceFmt = new Intl.NumberFormat(CURRENCY.locale, {
  style: 'currency',
  currency: CURRENCY.code,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 2499 -> "₹2,499" */
export function money(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return priceFmt.format(n);
  } catch {
    return `${CURRENCY.symbol}${Math.round(n).toLocaleString('en-IN')}`;
  }
}

/** Percentage saved, rounded. Returns 0 when there is no genuine discount. */
export function discountPercent(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/* --- Images -------------------------------------------------------------
   Product data stores a bare base URL. We append sizing params here so the
   widths live in one place. Remote (Unsplash) URLs get query params; local
   paths are returned untouched so your own photos work without change.     */

const REMOTE = /^https?:\/\//i;
const WIDTHS = [400, 800, 1200];

export function imageSrc(url, width = 800) {
  if (!url) return '';
  if (!REMOTE.test(url)) return url;
  return `${url}?auto=format&fit=crop&w=${width}&q=75`;
}

export function imageSrcSet(url) {
  if (!url || !REMOTE.test(url)) return '';
  return WIDTHS.map((w) => `${imageSrc(url, w)} ${w}w`).join(', ');
}

/** Build the <img> attributes we use everywhere, incl. the fallback hook. */
export function imgAttrs(image, { width = 800, sizes = '', eager = false } = {}) {
  const src = imageSrc(image?.url, width);
  const srcset = imageSrcSet(image?.url);
  return [
    `src="${escapeAttr(src)}"`,
    srcset ? `srcset="${escapeAttr(srcset)}"` : '',
    sizes && srcset ? `sizes="${escapeAttr(sizes)}"` : '',
    `alt="${escapeAttr(image?.alt || '')}"`,
    image?.fallback ? `data-fallback="${escapeAttr(image.fallback)}"` : '',
    eager ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
  ].filter(Boolean).join(' ');
}

/* --- Text --------------------------------------------------------------- */

/** Escape for use in an HTML attribute value. */
export function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape for use in element text content. */
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function titleCase(slug) {
  return String(slug || '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** "2026-09-22" -> "22 September 2026" */
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Star row markup for a 0–5 rating. */
export function starsHtml(rating) {
  const full = Math.round(Number(rating) || 0);
  const star = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9z"/></svg>';
  let out = '<span class="stars" aria-hidden="true">';
  for (let i = 1; i <= 5; i += 1) {
    out += i <= full ? star : star.replace('<svg', '<svg class="off"');
  }
  return `${out}</span>`;
}
