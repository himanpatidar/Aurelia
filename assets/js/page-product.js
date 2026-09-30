/* Aurelia — product detail page.
   Reads ?id=<slug>, renders the piece, and rewrites the page's title,
   description, canonical URL, OG tags and Product JSON-LD so each product
   presents itself correctly when shared or crawled. */

import * as catalog from './catalog.js';
import * as cart from './cart.js';
import { toast } from './ui.js';
import {
  money, discountPercent, imgAttrs, imageSrc, escapeHtml, escapeAttr, starsHtml,
} from './format.js';

const SITE = 'https://himanpatidar.github.io/Aurelia/';
const root = document.getElementById('pdp-root');
const crumbs = document.getElementById('pdp-crumbs');

function slugFromUrl() {
  return new URLSearchParams(window.location.search).get('id') ?? '';
}

/* --- <head> updates ----------------------------------------------------- */

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function updateHead(p) {
  const url = `${SITE}product.html?id=${encodeURIComponent(p.slug)}`;
  const title = `${p.name} — ${p.finish} ${p.category.replace(/s$/, '')} | Aurelia`;
  const desc = p.shortDescription;
  const img = imageSrc(p.images?.[0]?.url, 1200);

  document.title = title;
  setMeta('meta[name="description"]', 'content', desc);
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', desc);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:image"]', 'content', img);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', desc);
  setMeta('meta[name="twitter:image"]', 'content', img);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.id,
    image: (p.images ?? []).map((i) => imageSrc(i.url, 1200)),
    brand: { '@type': 'Brand', name: 'Aurelia' },
    material: p.specs?.Metal ?? p.material,
    category: p.category,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: p.price,
      availability: p.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  if (p.reviewCount > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  let script = document.getElementById('pdp-ld');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'pdp-ld';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(ld);

  // Breadcrumb JSON-LD
  const bc = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE}shop.html` },
      { '@type': 'ListItem', position: 3, name: p.name, item: url },
    ],
  };
  let bcScript = document.getElementById('pdp-bc');
  if (!bcScript) {
    bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'pdp-bc';
    document.head.appendChild(bcScript);
  }
  bcScript.textContent = JSON.stringify(bc);
}

/* --- Markup ------------------------------------------------------------- */

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
const SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3l7.5 3v6c0 4.4-3.1 8.2-7.5 9.4C7.6 20.2 4.5 16.4 4.5 12V6L12 3z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>';

function galleryHtml(p) {
  const imgs = p.images ?? [];
  const main = imgs[0];
  return `
  <div class="pdp-gallery">
    <div class="pdp-main">
      <img id="pdp-main-img" ${imgAttrs(main, { width: 1000, sizes: '(min-width:900px) 52vw, 92vw', eager: true })} width="1000" height="1000">
    </div>
    ${imgs.length > 1 ? `
    <div class="pdp-thumbs" role="group" aria-label="Product images">
      ${imgs.map((im, i) => `
        <button type="button" data-thumb="${i}" aria-current="${i === 0}" aria-label="View image ${i + 1} of ${imgs.length}">
          <img ${imgAttrs(im, { width: 200 })} width="200" height="200">
        </button>`).join('')}
    </div>` : ''}
  </div>`;
}

function tarnishHtml(p) {
  const a = p.antiTarnish ?? {};
  const rows = [
    a.technology ? `Finish: ${a.technology}` : '',
    a.warranty || '',
    a.waterResistant ? 'Safe to shower, swim and sweat in' : 'Keep away from prolonged water contact',
    a.sweatResistant ? 'Sweat and humidity resistant' : '',
    'Nickel-free — suitable for reactive skin',
  ].filter(Boolean);
  return `
  <div class="tarnish-card">
    <h3>${SHIELD} Anti-tarnish protection</h3>
    <ul>${rows.map((r) => `<li>${CHECK}<span>${escapeHtml(r)}</span></li>`).join('')}</ul>
    <a class="btn-text" href="anti-tarnish.html" style="font-size:var(--fs-xs)">How our barriers work</a>
  </div>`;
}

function sizeHtml(p) {
  if (!p.sizes?.length) return '';
  const isRing = p.category === 'rings' || p.sizes.some((s) => /^\d+$/.test(s));
  const label = p.category === 'pendants' ? 'Initial' : (isRing ? 'Ring size' : 'Size');
  return `
  <div class="field">
    <span class="field-label" id="size-label">${label} <span style="color:var(--danger)" aria-hidden="true">*</span></span>
    <div class="size-opts" role="radiogroup" aria-labelledby="size-label">
      ${p.sizes.map((s, i) => `
        <label><input type="radio" name="size" value="${escapeAttr(s)}" ${i === 0 ? 'checked' : ''}>${escapeHtml(s)}</label>`).join('')}
    </div>
    ${isRing && p.category === 'rings' ? '<span class="hint">Indian ring sizes. Unsure? <a href="faq.html#sizing" style="color:var(--gold-deep)">See the size guide</a>.</span>' : ''}
  </div>`;
}

function specsHtml(p) {
  const entries = Object.entries(p.specs ?? {});
  if (!entries.length) return '';
  return `<dl class="specs">${entries.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>`;
}

function render(p) {
  const off = discountPercent(p.price, p.compareAtPrice);
  const saved = catalog.inWishlist(p.slug);

  root.removeAttribute('aria-busy');
  root.className = 'pdp';
  root.innerHTML = `
    ${galleryHtml(p)}
    <div class="pdp-info">
      <div class="stack stack-2">
        <div class="cluster" style="gap:var(--s-2)">
          <span class="product-cat">${escapeHtml(p.finish)}</span>
          ${p.badges?.includes('new') ? '<span class="badge badge-new">New</span>' : ''}
          ${p.badges?.includes('bestseller') ? '<span class="badge badge-bestseller">Bestseller</span>' : ''}
          ${p.inStock ? '' : '<span class="badge badge-sale">Sold out</span>'}
        </div>
        <h1>${escapeHtml(p.name)}</h1>
        <div class="rating">${starsHtml(p.rating)}<span>${p.rating} out of 5 · ${p.reviewCount} reviews</span></div>
      </div>

      <div class="pdp-price">
        <b>${money(p.price)}</b>
        ${p.compareAtPrice ? `<s>${money(p.compareAtPrice)}</s><span class="off" style="color:var(--danger);font-weight:700">Save ${off}%</span>` : ''}
      </div>
      <p class="lede" style="font-size:var(--fs-md)">${escapeHtml(p.shortDescription)}</p>

      ${tarnishHtml(p)}

      <form class="stack stack-5" id="pdp-form">
        ${sizeHtml(p)}
        <div class="cluster">
          <div class="field">
            <label class="sr-only" for="pdp-qty">Quantity</label>
            <div class="qty">
              <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
              <input id="pdp-qty" type="number" value="1" min="1" max="10" step="1" aria-label="Quantity">
              <button type="button" data-step="1" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="flex:1 1 200px" ${p.inStock ? '' : 'disabled'}>
            ${p.inStock ? 'Add to bag' : 'Sold out'}
          </button>
          <button type="button" class="btn btn-ghost" data-wishlist="${escapeAttr(p.slug)}" aria-pressed="${saved}">
            ${saved ? 'Saved' : 'Save'}
          </button>
        </div>
        ${p.inStock
          ? '<p style="font-size:var(--fs-xs);color:var(--muted)">Free shipping over ₹1,499 · Dispatched in 1–2 working days · 30-day returns</p>'
          : '<p class="notice notice-warn" style="font-size:var(--fs-xs)">This piece is sold out. <a href="contact.html">Contact us</a> to be told when it is back.</p>'}
      </form>

      <div class="accordion">
        <details open>
          <summary>Specifications</summary>
          <div class="acc-body">${specsHtml(p)}</div>
        </details>
        <details>
          <summary>About this piece</summary>
          <div class="acc-body"><p>${escapeHtml(p.description)}</p></div>
        </details>
        <details>
          <summary>Care</summary>
          <div class="acc-body">
            <p>Wipe with the supplied cloth after wearing. Put jewelry on last, after perfume and lotion have dried, and take it off before using cleaning products.
            ${p.antiTarnish?.waterResistant ? 'This piece is rated for water, so showering and swimming are fine.' : 'Remove this piece before showering or swimming — the stone or setting is not rated for prolonged water contact.'}</p>
            <p><a href="care-guide.html" style="color:var(--gold-deep)">Read the full care guide →</a></p>
          </div>
        </details>
        <details>
          <summary>Shipping &amp; returns</summary>
          <div class="acc-body">
            <p>Free shipping on orders over ₹1,499; ₹99 below that. Dispatched within 1–2 working days, delivered in 3–6.</p>
            <p>30 days to return anything unworn in its original packaging. <a href="shipping-returns.html" style="color:var(--gold-deep)">Full policy →</a></p>
          </div>
        </details>
        <details>
          <summary>Anti-tarnish guarantee</summary>
          <div class="acc-body"><p>${escapeHtml(p.antiTarnish?.warranty ?? '12-month anti-tarnish guarantee')} — if the finish tarnishes through normal wear inside that window, we replace the piece. Damage from abrasives, chlorine beyond the rating, or physical impact is not covered.</p></div>
        </details>
      </div>
    </div>`;

  wire(p);
}

function notFound(slug) {
  root.removeAttribute('aria-busy');
  root.className = '';
  root.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.9-3.9"/></svg>
      <h1 style="font-size:var(--fs-2xl)">We could not find that piece</h1>
      <p style="color:var(--muted);max-width:44ch">${slug ? `Nothing in the collection matches “${escapeHtml(slug)}”.` : 'No product was specified.'} It may have been renamed or sold out.</p>
      <div class="cluster" style="justify-content:center">
        <a class="btn btn-primary" href="shop.html">Browse all 18 pieces</a>
        <a class="btn btn-ghost" href="contact.html">Ask us about it</a>
      </div>
    </div>`;
  document.title = 'Product not found — Aurelia';
  setMeta('meta[name="robots"]', 'content', 'noindex, follow');
  crumbs.lastElementChild.innerHTML = '<span aria-current="page">Not found</span>';
}

/* --- Interactions ------------------------------------------------------- */

function wire(p) {
  const form = document.getElementById('pdp-form');
  const qty = document.getElementById('pdp-qty');
  const mainImg = document.getElementById('pdp-main-img');

  root.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) {
      const next = Math.min(10, Math.max(1, (Number(qty.value) || 1) + Number(step.dataset.step)));
      qty.value = String(next);
      return;
    }
    const thumb = e.target.closest('[data-thumb]');
    if (thumb) {
      const im = p.images[Number(thumb.dataset.thumb)];
      if (!im) return;
      mainImg.dataset.fellBack = '';
      mainImg.srcset = '';
      mainImg.src = imageSrc(im.url, 1000);
      mainImg.alt = im.alt ?? p.name;
      mainImg.dataset.fallback = im.fallback ?? '';
      root.querySelectorAll('[data-thumb]').forEach((b) => b.setAttribute('aria-current', String(b === thumb)));
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!p.inStock) return;
    const size = form.querySelector('input[name="size"]:checked')?.value ?? '';
    const n = Math.min(10, Math.max(1, Number(qty.value) || 1));
    cart.addItem(p, { size, qty: n });
    toast(`${p.name} added to your bag.`);
    document.getElementById('cart-drawer').dataset.open = 'true';
    document.body.style.overflow = 'hidden';
  });
}

async function renderRelated(p) {
  const section = document.getElementById('related-section');
  const grid = document.getElementById('related-grid');
  const items = await catalog.related(p, 4);
  if (!items.length) return;
  section.hidden = false;
  catalog.renderGrid(grid, items);
}

/* --- Boot --------------------------------------------------------------- */

(async function init() {
  const slug = slugFromUrl();
  try {
    const p = slug ? await catalog.bySlug(slug) : null;
    if (!p) { notFound(slug); return; }
    updateHead(p);
    crumbs.lastElementChild.innerHTML = `<span aria-current="page">${escapeHtml(p.name)}</span>`;
    render(p);
    renderRelated(p);
  } catch (err) {
    root.removeAttribute('aria-busy');
    root.innerHTML = `<p class="notice notice-err">${escapeHtml(err.message)} If you are previewing locally, serve the folder with <code>python3 -m http.server</code>.</p>`;
  }
}());
