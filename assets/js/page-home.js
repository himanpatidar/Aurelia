/* Aurelia — home page: featured products, testimonials and blog teasers. */

import * as catalog from './catalog.js';
import { imgAttrs, escapeHtml, escapeAttr, starsHtml } from './format.js';

function fail(el, message) {
  if (!el) return;
  el.removeAttribute('aria-busy');
  el.innerHTML = `<p class="notice notice-err" style="grid-column:1/-1">${escapeHtml(message)}</p>`;
}

async function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  try {
    const items = await catalog.featured(4);
    grid.removeAttribute('aria-busy');
    catalog.renderGrid(grid, items);
  } catch (err) {
    fail(grid, `${err.message} If you are previewing locally, run a web server (python3 -m http.server) rather than opening the file directly.`);
  }
}

async function renderTestimonials() {
  const rail = document.getElementById('testimonial-rail');
  if (!rail) return;
  try {
    const res = await fetch('data/testimonials.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Could not load reviews (HTTP ${res.status}).`);
    const { testimonials } = await res.json();
    rail.removeAttribute('aria-busy');
    rail.innerHTML = testimonials.map((t) => `
      <figure class="quote">
        ${starsHtml(t.rating)}
        <blockquote>“${escapeHtml(t.quote)}”</blockquote>
        <figcaption>
          <span class="avatar" aria-hidden="true">${escapeHtml(t.initials)}</span>
          <span class="who">
            <b>${escapeHtml(t.name)}</b>
            <span>${escapeHtml(t.location)} · <a href="product.html?id=${escapeAttr(t.productSlug)}">${escapeHtml(t.product)}</a></span>
          </span>
        </figcaption>
      </figure>`).join('');
  } catch (err) {
    fail(rail, err.message);
  }
}

async function renderBlogTeasers() {
  const wrap = document.getElementById('blog-teasers');
  if (!wrap) return;
  try {
    const res = await fetch('data/blog.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Could not load articles (HTTP ${res.status}).`);
    const { posts } = await res.json();
    wrap.removeAttribute('aria-busy');
    wrap.innerHTML = posts.slice(0, 3).map((p) => `
      <article class="post-card">
        <a href="${escapeAttr(p.url)}" class="pc-media">
          <img ${imgAttrs({ url: p.image, alt: p.alt, fallback: p.fallback }, { width: 700, sizes: '(min-width:900px) 380px, 90vw' })} width="700" height="440">
        </a>
        <div class="stack stack-2">
          <div class="pc-meta"><span>${escapeHtml(p.category)}</span><span>${escapeHtml(p.dateLabel)}</span><span>${escapeHtml(p.readingTime)}</span></div>
          <a href="${escapeAttr(p.url)}"><h3>${escapeHtml(p.title)}</h3></a>
          <p>${escapeHtml(p.excerpt)}</p>
        </div>
      </article>`).join('');
  } catch (err) {
    fail(wrap, err.message);
  }
}

renderFeatured();
renderTestimonials();
renderBlogTeasers();
