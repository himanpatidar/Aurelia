/* Aurelia — demo account page: sign-in, order history, wishlist, address. */

import * as user from './user.js';
import * as orders from './orders.js';
import * as catalog from './catalog.js';
import { toast } from './ui.js';
import { money, imgAttrs, escapeHtml, escapeAttr, formatDate } from './format.js';

const root = document.getElementById('account-root');
const titleEl = document.getElementById('account-title');
const subEl = document.getElementById('account-sub');

let activeTab = new URLSearchParams(window.location.search).get('tab') || 'orders';

/* --- Signed out --------------------------------------------------------- */

function renderSignIn() {
  titleEl.textContent = 'Sign in';
  subEl.textContent = 'Local demo account — any email and password will work.';
  root.removeAttribute('aria-busy');
  root.innerHTML = `
    <div class="container-narrow" style="margin-inline:auto">
      <div class="card">
        <form id="signin-form" class="stack stack-5" novalidate>
          <div class="field">
            <label for="si-name">Your name</label>
            <input class="input" id="si-name" name="name" type="text" autocomplete="name" placeholder="Optional">
          </div>
          <div class="field">
            <label for="si-email">Email</label>
            <input class="input" id="si-email" name="email" type="email" autocomplete="email" required>
            <span class="err" id="si-email-err"></span>
          </div>
          <div class="field">
            <label for="si-pass">Password</label>
            <input class="input" id="si-pass" name="password" type="password" autocomplete="current-password" required>
            <span class="hint">Never stored or transmitted — it is discarded the moment you submit.</span>
            <span class="err" id="si-pass-err"></span>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Sign in</button>
        </form>
      </div>
      <p style="font-size:var(--fs-sm);color:var(--muted);text-align:center;margin-top:var(--s-6)">
        Placed an order already? Sign in with the same email to see it, as long as you are on the same browser.
      </p>
    </div>`;

  const form = document.getElementById('signin-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('si-email');
    const pass = document.getElementById('si-pass');
    let ok = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      document.getElementById('si-email-err').textContent = 'Enter a valid email address.';
      email.setAttribute('aria-invalid', 'true');
      ok = false;
    } else {
      document.getElementById('si-email-err').textContent = '';
      email.removeAttribute('aria-invalid');
    }
    if (!pass.value) {
      document.getElementById('si-pass-err').textContent = 'Enter any password — this is a demo.';
      pass.setAttribute('aria-invalid', 'true');
      ok = false;
    } else {
      document.getElementById('si-pass-err').textContent = '';
      pass.removeAttribute('aria-invalid');
    }
    if (!ok) return;

    user.signIn({ email: email.value, name: document.getElementById('si-name').value.trim() });
    toast('Signed in on this device.');
  });
}

/* --- Tabs --------------------------------------------------------------- */

const TABS = [
  ['orders', 'Orders'],
  ['wishlist', 'Wishlist'],
  ['address', 'Address'],
];

function tabsHtml() {
  return `<div class="tabs" role="tablist" aria-label="Account sections">
    ${TABS.map(([id, label]) => `
      <button type="button" role="tab" id="tab-${id}" data-tab="${id}"
              aria-selected="${id === activeTab}" aria-controls="panel-${id}">${label}</button>`).join('')}
  </div>`;
}

/* --- Orders ------------------------------------------------------------- */

function ordersHtml() {
  const list = orders.getOrders();
  if (!list.length) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 8l9-4 9 4v8l-9 4-9-4V8z"/><path d="M3 8l9 4 9-4M12 12v8"/></svg>
        <h2 style="font-size:var(--fs-xl)">No orders yet</h2>
        <p style="color:var(--muted);max-width:42ch">Demo orders placed in this browser will appear here with their reference and status.</p>
        <a class="btn btn-primary" href="shop.html">Shop the collection</a>
      </div>`;
  }
  return `<div class="stack stack-6">${list.map((o) => `
    <div class="card order-card">
      <div class="oc-head">
        <div><span style="color:var(--muted);font-size:var(--fs-xs)">Order</span><b>${escapeHtml(o.id)}</b></div>
        <div><span style="color:var(--muted);font-size:var(--fs-xs)">Placed</span><b>${escapeHtml(formatDate(o.placedAt))}</b></div>
        <div><span style="color:var(--muted);font-size:var(--fs-xs)">Status</span><b><span class="badge badge-tarnish">${escapeHtml(o.status)}</span></b></div>
        <div><span style="color:var(--muted);font-size:var(--fs-xs)">Total</span><b>${money(o.totals.total)}</b></div>
      </div>
      <div class="stack stack-3">${o.items.map((l) => `
        <div class="mini-item">
          <a class="mi-media" href="product.html?id=${escapeAttr(l.slug)}"><img ${imgAttrs(l.image, { width: 160 })} width="160" height="200"></a>
          <span>
            <a class="mi-name" href="product.html?id=${escapeAttr(l.slug)}">${escapeHtml(l.name)}</a>
            <span class="mi-qty">${l.size ? `Size ${escapeHtml(l.size)} · ` : ''}Qty ${l.qty}</span>
          </span>
          <span>${money(l.price * l.qty)}</span>
        </div>`).join('')}
      </div>
      <div class="cluster">
        <a class="btn btn-ghost btn-sm" href="order-confirmation.html?order=${escapeAttr(o.id)}">View details</a>
        <span style="font-size:var(--fs-xs);color:var(--muted)">Estimated delivery ${escapeHtml(formatDate(o.etaAt))}</span>
      </div>
    </div>`).join('')}</div>`;
}

/* --- Wishlist ----------------------------------------------------------- */

async function renderWishlistInto(panel) {
  const slugs = catalog.getWishlist();
  if (!slugs.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 20.5l-1.4-1.3C5.7 14.9 3 12.4 3 9.2A4.7 4.7 0 0 1 7.7 4.5c1.6 0 3.1.8 4.3 2.3 1.2-1.5 2.7-2.3 4.3-2.3A4.7 4.7 0 0 1 21 9.2c0 3.2-2.7 5.7-7.6 10z"/></svg>
        <h2 style="font-size:var(--fs-xl)">Your wishlist is empty</h2>
        <p style="color:var(--muted);max-width:42ch">Tap the heart on any piece to save it here for later.</p>
        <a class="btn btn-primary" href="shop.html">Browse the collection</a>
      </div>`;
    return;
  }
  try {
    const all = await catalog.all();
    const items = slugs.map((s) => all.find((p) => p.slug === s)).filter(Boolean);
    if (!items.length) {
      panel.innerHTML = '<p class="notice">The saved pieces are no longer in the catalogue.</p>';
      return;
    }
    panel.innerHTML = '<div class="product-grid"></div>';
    catalog.renderGrid(panel.firstElementChild, items);
  } catch (err) {
    panel.innerHTML = `<p class="notice notice-err">${escapeHtml(err.message)}</p>`;
  }
}

/* --- Address ------------------------------------------------------------ */

function addressHtml() {
  const a = user.getAddress();
  if (!a) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
        <h2 style="font-size:var(--fs-xl)">No saved address</h2>
        <p style="color:var(--muted);max-width:42ch">Tick “save this address” at checkout and it will appear here for next time.</p>
        <a class="btn btn-primary" href="shop.html">Shop the collection</a>
      </div>`;
  }
  return `
    <div class="card" style="max-width:480px">
      <h2 style="font-size:var(--fs-md);font-family:var(--font-body);font-weight:600;margin-bottom:var(--s-4)">Default address</h2>
      <p style="font-size:var(--fs-sm);color:var(--ink-soft);line-height:1.9">
        ${escapeHtml(a.name)}<br>
        ${escapeHtml(a.addr1)}<br>
        ${a.addr2 ? `${escapeHtml(a.addr2)}<br>` : ''}
        ${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pin)}<br>
        ${escapeHtml(a.phone)}
      </p>
      <button type="button" class="btn btn-ghost btn-sm" id="addr-clear" style="margin-top:var(--s-5)">Remove this address</button>
    </div>`;
}

/* --- Signed in shell ---------------------------------------------------- */

function renderAccount() {
  const u = user.getUser();
  titleEl.textContent = `Hello, ${u.name}`;
  subEl.innerHTML = `Signed in as ${escapeHtml(u.email)} · <button type="button" class="btn-text" id="signout" style="font-size:var(--fs-sm)">Sign out</button>`;
  root.removeAttribute('aria-busy');

  root.innerHTML = `
    ${tabsHtml()}
    <div role="tabpanel" id="panel-orders" aria-labelledby="tab-orders" ${activeTab === 'orders' ? '' : 'hidden'}></div>
    <div role="tabpanel" id="panel-wishlist" aria-labelledby="tab-wishlist" ${activeTab === 'wishlist' ? '' : 'hidden'}></div>
    <div role="tabpanel" id="panel-address" aria-labelledby="tab-address" ${activeTab === 'address' ? '' : 'hidden'}></div>`;

  document.getElementById('panel-orders').innerHTML = ordersHtml();
  document.getElementById('panel-address').innerHTML = addressHtml();
  renderWishlistInto(document.getElementById('panel-wishlist'));

  document.getElementById('signout').addEventListener('click', () => {
    user.signOut();
    toast('Signed out.', { icon: false });
  });

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      activeTab = tab.dataset.tab;
      root.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === activeTab)));
      root.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = p.id !== `panel-${activeTab}`; });
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState(null, '', url);
      return;
    }
    if (e.target.id === 'addr-clear') {
      user.clearAddress();
      document.getElementById('panel-address').innerHTML = addressHtml();
      toast('Saved address removed.', { icon: false });
    }
  });
}

function render() {
  if (user.isSignedIn()) renderAccount();
  else renderSignIn();
}

document.addEventListener('user:change', render);
document.addEventListener('wishlist:change', () => {
  const panel = document.getElementById('panel-wishlist');
  if (panel && !panel.hidden) renderWishlistInto(panel);
});

render();
