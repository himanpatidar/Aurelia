/* Aurelia — article pages: render the "mentioned in this article" product
   rail from the comma-separated slugs in data-products. */

import * as catalog from './catalog.js';
import { escapeHtml } from './format.js';

const grid = document.getElementById('article-products');

(async function init() {
  if (!grid) return;
  const slugs = (grid.dataset.products ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) { grid.closest('section')?.remove(); return; }
  try {
    const all = await catalog.all();
    const items = slugs.map((s) => all.find((p) => p.slug === s)).filter(Boolean);
    grid.removeAttribute('aria-busy');
    if (!items.length) { grid.closest('section')?.remove(); return; }
    catalog.renderGrid(grid, items);
  } catch (err) {
    grid.removeAttribute('aria-busy');
    grid.innerHTML = `<p class="notice notice-err" style="grid-column:1/-1">${escapeHtml(err.message)}</p>`;
  }
}());
