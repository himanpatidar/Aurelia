/* Aurelia — blog index, rendered from data/blog.json so there is a single
   source of truth for posts. The <noscript> list in the page keeps every
   article reachable without JavaScript. */

import { imgAttrs, escapeHtml, escapeAttr } from './format.js';

const wrap = document.getElementById('blog-list');

(async function init() {
  try {
    const res = await fetch('data/blog.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Could not load articles (HTTP ${res.status}).`);
    const { posts } = await res.json();
    wrap.removeAttribute('aria-busy');
    wrap.innerHTML = posts.map((p, i) => `
      <article class="post-card">
        <a href="${escapeAttr(p.url)}" class="pc-media">
          <img ${imgAttrs({ url: p.image, alt: p.alt, fallback: p.fallback }, { width: 700, sizes: '(min-width:900px) 380px, 90vw', eager: i === 0 })} width="700" height="440">
        </a>
        <div class="stack stack-2">
          <div class="pc-meta">
            <span class="badge badge-soft">${escapeHtml(p.category)}</span>
            <time datetime="${escapeAttr(p.date)}">${escapeHtml(p.dateLabel)}</time>
            <span>${escapeHtml(p.readingTime)}</span>
          </div>
          <a href="${escapeAttr(p.url)}"><h2 style="font-size:var(--fs-lg);font-family:var(--font-display);font-weight:500">${escapeHtml(p.title)}</h2></a>
          <p>${escapeHtml(p.excerpt)}</p>
          <a class="btn-text" href="${escapeAttr(p.url)}" style="font-size:var(--fs-xs);justify-self:start">Read the article</a>
        </div>
      </article>`).join('');
  } catch (err) {
    wrap.removeAttribute('aria-busy');
    wrap.innerHTML = `<p class="notice notice-err" style="grid-column:1/-1">${escapeHtml(err.message)}</p>`;
  }
}());
