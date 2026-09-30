/* Aurelia — shop page: filters, search, sort, paging and URL sync.
   Filter state is mirrored into the query string so any view is shareable
   and survives a reload. */

import * as catalog from './catalog.js';
import { money, escapeHtml, escapeAttr } from './format.js';

const PAGE_SIZE = 12;

const el = {
  grid: document.getElementById('shop-grid'),
  count: document.getElementById('result-count'),
  search: document.getElementById('shop-search'),
  sort: document.getElementById('shop-sort'),
  cats: document.getElementById('filter-categories'),
  mats: document.getElementById('filter-materials'),
  min: document.getElementById('filter-min'),
  max: document.getElementById('filter-max'),
  inStock: document.getElementById('filter-instock'),
  clear: document.getElementById('filter-clear'),
  active: document.getElementById('active-filters'),
  more: document.getElementById('load-more'),
  form: document.getElementById('shop-filters'),
};

const state = {
  categories: [], materials: [],
  minPrice: null, maxPrice: null,
  inStockOnly: false, q: '', sort: 'featured',
  shown: PAGE_SIZE,
};

let allProducts = [];
let labels = { category: new Map(), material: new Map() };

/* --- URL <-> state ------------------------------------------------------ */

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const list = (k) => (p.get(k) ? p.get(k).split(',').map((s) => s.trim()).filter(Boolean) : []);
  state.categories = list('category');
  state.materials = list('material');
  const min = Number(p.get('min'));
  const max = Number(p.get('max'));
  state.minPrice = Number.isFinite(min) && p.get('min') ? min : null;
  state.maxPrice = Number.isFinite(max) && p.get('max') ? max : null;
  state.inStockOnly = p.get('instock') === '1';
  state.q = p.get('q') ?? '';
  state.sort = catalog.SORTS[p.get('sort')] ? p.get('sort') : 'featured';
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.categories.length) p.set('category', state.categories.join(','));
  if (state.materials.length) p.set('material', state.materials.join(','));
  if (state.minPrice != null) p.set('min', String(state.minPrice));
  if (state.maxPrice != null) p.set('max', String(state.maxPrice));
  if (state.inStockOnly) p.set('instock', '1');
  if (state.q) p.set('q', state.q);
  if (state.sort !== 'featured') p.set('sort', state.sort);
  const qs = p.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

/* --- Controls ----------------------------------------------------------- */

function checkboxList(container, items, selected, name) {
  container.innerHTML = items.map((it) => `
    <li><label class="check">
      <input type="checkbox" name="${name}" value="${escapeAttr(it.slug)}" ${selected.includes(it.slug) ? 'checked' : ''}>
      <span>${escapeHtml(it.label)} <span style="color:var(--muted-light)">(${it.n})</span></span>
    </label></li>`).join('');
}

function countBy(products, key) {
  const m = new Map();
  products.forEach((p) => m.set(p[key], (m.get(p[key]) ?? 0) + 1));
  return m;
}

function buildSortOptions() {
  el.sort.innerHTML = Object.entries(catalog.SORTS)
    .map(([k, v]) => `<option value="${k}" ${k === state.sort ? 'selected' : ''}>${escapeHtml(v.label)}</option>`)
    .join('');
}

function syncControls() {
  el.search.value = state.q;
  el.sort.value = state.sort;
  el.min.value = state.minPrice ?? '';
  el.max.value = state.maxPrice ?? '';
  el.inStock.checked = state.inStockOnly;
  el.form.querySelectorAll('input[name="category"]').forEach((c) => { c.checked = state.categories.includes(c.value); });
  el.form.querySelectorAll('input[name="material"]').forEach((c) => { c.checked = state.materials.includes(c.value); });
  el.form.querySelectorAll('[data-price]').forEach((b) => {
    const [lo, hi] = b.dataset.price.split('-');
    const active = String(state.minPrice ?? '') === lo && String(state.maxPrice ?? '') === (hi || '');
    b.setAttribute('aria-pressed', String(active));
  });
}

/* --- Active filter chips ------------------------------------------------ */

function renderChips() {
  const chips = [];
  state.categories.forEach((c) => chips.push({ label: labels.category.get(c) ?? c, kind: 'category', value: c }));
  state.materials.forEach((m) => chips.push({ label: labels.material.get(m) ?? m, kind: 'material', value: m }));
  if (state.minPrice != null || state.maxPrice != null) {
    const lo = state.minPrice != null ? money(state.minPrice) : 'Any';
    const hi = state.maxPrice != null ? money(state.maxPrice) : 'Any';
    chips.push({ label: `${lo} – ${hi}`, kind: 'price', value: '' });
  }
  if (state.inStockOnly) chips.push({ label: 'In stock only', kind: 'instock', value: '' });
  if (state.q) chips.push({ label: `“${state.q}”`, kind: 'q', value: '' });

  el.active.innerHTML = chips.length
    ? chips.map((c) => `<button type="button" class="chip-remove" data-chip="${escapeAttr(c.kind)}" data-chip-value="${escapeAttr(c.value)}">${escapeHtml(c.label)}</button>`).join('')
      + '<button type="button" class="btn-text" style="font-size:var(--fs-xs)" id="chip-clear">Clear all</button>'
    : '';
}

/* --- Render ------------------------------------------------------------- */

function currentResults() {
  const filtered = catalog.filter(allProducts, state);
  return catalog.sort(filtered, state.sort);
}

function render() {
  const results = currentResults();
  const page = results.slice(0, state.shown);

  el.grid.removeAttribute('aria-busy');

  if (!results.length) {
    el.grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.9-3.9"/></svg>
        <h3>Nothing matches those filters</h3>
        <p style="color:var(--muted)">Try widening the price range or clearing a category.</p>
        <button type="button" class="btn btn-primary" id="empty-clear">Clear all filters</button>
      </div>`;
    document.getElementById('empty-clear')?.addEventListener('click', clearAll);
  } else {
    catalog.renderGrid(el.grid, page, { eager: true });
  }

  el.count.innerHTML = results.length
    ? `Showing <b>${page.length}</b> of <b>${results.length}</b> ${results.length === 1 ? 'piece' : 'pieces'}`
    : '<b>0</b> pieces';

  el.more.hidden = page.length >= results.length;
  renderChips();
  syncControls();
  writeUrl();
}

function update({ resetPaging = true } = {}) {
  if (resetPaging) state.shown = PAGE_SIZE;
  render();
}

/* --- Events ------------------------------------------------------------- */

function clearAll() {
  state.categories = []; state.materials = [];
  state.minPrice = null; state.maxPrice = null;
  state.inStockOnly = false; state.q = '';
  update();
}

let searchTimer = null;

function wire() {
  el.form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'category') {
      state.categories = [...el.form.querySelectorAll('input[name="category"]:checked')].map((c) => c.value);
    } else if (t.name === 'material') {
      state.materials = [...el.form.querySelectorAll('input[name="material"]:checked')].map((c) => c.value);
    } else if (t === el.inStock) {
      state.inStockOnly = t.checked;
    } else if (t === el.min || t === el.max) {
      const v = Number(t.value);
      const val = t.value === '' || !Number.isFinite(v) ? null : Math.max(0, v);
      if (t === el.min) state.minPrice = val; else state.maxPrice = val;
    }
    update();
  });

  el.form.addEventListener('click', (e) => {
    const preset = e.target.closest('[data-price]');
    if (preset) {
      const [lo, hi] = preset.dataset.price.split('-');
      const already = preset.getAttribute('aria-pressed') === 'true';
      state.minPrice = already || !lo ? null : Number(lo);
      state.maxPrice = already || !hi ? null : Number(hi);
      update();
    }
  });

  el.form.addEventListener('submit', (e) => e.preventDefault());
  el.clear.addEventListener('click', clearAll);

  el.search.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.q = el.search.value.trim();
      update();
    }, 180);
  });

  el.sort.addEventListener('change', () => {
    state.sort = el.sort.value;
    update();
  });

  el.more.addEventListener('click', () => {
    state.shown += PAGE_SIZE;
    render();
    // Move focus to the first newly-revealed card for keyboard users.
    el.grid.querySelectorAll('.product-card')[state.shown - PAGE_SIZE]
      ?.querySelector('a')?.focus({ preventScroll: true });
  });

  el.active.addEventListener('click', (e) => {
    if (e.target.id === 'chip-clear') { clearAll(); return; }
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    const { chip: kind, chipValue: value } = chip.dataset;
    if (kind === 'category') state.categories = state.categories.filter((c) => c !== value);
    else if (kind === 'material') state.materials = state.materials.filter((m) => m !== value);
    else if (kind === 'price') { state.minPrice = null; state.maxPrice = null; }
    else if (kind === 'instock') state.inStockOnly = false;
    else if (kind === 'q') state.q = '';
    update();
  });

  // Deep link from the header search icon: shop.html#shop-search
  if (window.location.hash === '#shop-search') {
    el.search.focus({ preventScroll: true });
  }
}

/* --- Boot --------------------------------------------------------------- */

(async function init() {
  readUrl();
  buildSortOptions();
  try {
    const data = await catalog.load();
    allProducts = data.products;
    data.categories.forEach((c) => labels.category.set(c.slug, c.label));
    data.materials.forEach((m) => labels.material.set(m.slug, m.label));

    const catCounts = countBy(allProducts, 'category');
    const matCounts = countBy(allProducts, 'material');
    checkboxList(el.cats, data.categories.map((c) => ({ ...c, n: catCounts.get(c.slug) ?? 0 })), state.categories, 'category');
    checkboxList(el.mats, data.materials.map((m) => ({ ...m, n: matCounts.get(m.slug) ?? 0 })), state.materials, 'material');

    wire();
    render();
  } catch (err) {
    el.grid.removeAttribute('aria-busy');
    el.grid.innerHTML = `<p class="notice notice-err" style="grid-column:1/-1">${escapeHtml(err.message)} If you are previewing locally, serve the folder with <code>python3 -m http.server</code> instead of opening the file directly.</p>`;
    el.count.textContent = '';
  }
}());
