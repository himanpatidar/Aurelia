/* Aurelia — order confirmation. Reads ?order=<id> from local order history. */

import * as orders from './orders.js';
import { money, imgAttrs, escapeHtml, escapeAttr, formatDate } from './format.js';

const root = document.getElementById('conf-root');
const id = new URLSearchParams(window.location.search).get('order') ?? '';

function notFound() {
  root.removeAttribute('aria-busy');
  root.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.5"/></svg>
      <h1 style="font-size:var(--fs-2xl)">We could not find that order</h1>
      <p style="color:var(--muted);max-width:46ch">
        ${id ? `No order with the reference “${escapeHtml(id)}” is stored on this device.` : 'No order reference was given.'}
        Demo orders are saved to the browser they were placed in, so they will not appear on another device or after clearing site data.
      </p>
      <div class="cluster" style="justify-content:center">
        <a class="btn btn-primary" href="account.html">View your orders</a>
        <a class="btn btn-ghost" href="shop.html">Back to the shop</a>
      </div>
    </div>`;
}

function render(o) {
  const t = o.totals;
  const c = o.customer;
  root.removeAttribute('aria-busy');
  root.innerHTML = `
    <div class="stack stack-8">
      <div class="center-text stack stack-4">
        <div style="display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--success-pale);color:var(--success);margin:0 auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="30" height="30" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h1>Thank you, ${escapeHtml(c.name.split(' ')[0])}</h1>
        <p class="lede">Your demo order is recorded. Reference <strong>${escapeHtml(o.id)}</strong>.</p>
        <p class="notice notice-warn" style="text-align:left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.5"/></svg>
          <span><strong>Nothing was charged and nothing will ship.</strong> This storefront is a demonstration —
          the order exists only in this browser's local storage so you can see the full flow.</span>
        </p>
      </div>

      <div class="card">
        <div class="order-card">
          <div class="oc-head">
            <div><span style="color:var(--muted);font-size:var(--fs-xs)">Order</span><b>${escapeHtml(o.id)}</b></div>
            <div><span style="color:var(--muted);font-size:var(--fs-xs)">Placed</span><b>${escapeHtml(formatDate(o.placedAt))}</b></div>
            <div><span style="color:var(--muted);font-size:var(--fs-xs)">Estimated delivery</span><b>${escapeHtml(formatDate(o.etaAt))}</b></div>
            <div><span style="color:var(--muted);font-size:var(--fs-xs)">Payment</span><b>${escapeHtml(o.payment)}</b></div>
          </div>

          <div class="stack stack-4">${o.items.map((l) => `
            <div class="mini-item">
              <a class="mi-media" href="product.html?id=${escapeAttr(l.slug)}"><img ${imgAttrs(l.image, { width: 160 })} width="160" height="200"></a>
              <span>
                <a class="mi-name" href="product.html?id=${escapeAttr(l.slug)}">${escapeHtml(l.name)}</a>
                <span class="mi-qty">${l.size ? `Size ${escapeHtml(l.size)} · ` : ''}Qty ${l.qty}</span>
              </span>
              <span>${money(l.price * l.qty)}</span>
            </div>`).join('')}
          </div>

          <div class="summary-rows" style="padding-top:var(--s-5);border-top:1px solid var(--line)">
            <div><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
            ${t.discount ? `<div class="discount"><span>Discount (${escapeHtml(t.promoCode ?? '')})</span><span>−${money(t.discount)}</span></div>` : ''}
            <div><span>Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></div>
          </div>
          <div class="summary-total"><span>Total</span><b>${money(t.total)}</b></div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h2 style="font-size:var(--fs-md);font-family:var(--font-body);font-weight:600;margin-bottom:var(--s-3)">Shipping to</h2>
          <p style="font-size:var(--fs-sm);color:var(--ink-soft);line-height:1.8">
            ${escapeHtml(c.name)}<br>
            ${escapeHtml(c.addr1)}<br>
            ${c.addr2 ? `${escapeHtml(c.addr2)}<br>` : ''}
            ${escapeHtml(c.city)}, ${escapeHtml(c.state)} ${escapeHtml(c.pin)}<br>
            ${escapeHtml(c.phone)} · ${escapeHtml(c.email)}
          </p>
        </div>
        <div class="card">
          <h2 style="font-size:var(--fs-md);font-family:var(--font-body);font-weight:600;margin-bottom:var(--s-3)">Keep it bright</h2>
          <p style="font-size:var(--fs-sm);color:var(--ink-soft)">Your anti-tarnish barrier does most of the work, but two habits double the life of any piece.</p>
          <div class="stack stack-2" style="margin-top:var(--s-4)">
            <a class="btn btn-ghost btn-sm" href="care-guide.html">Read the care guide</a>
            <a class="btn-text" href="account.html" style="font-size:var(--fs-xs)">Track this order</a>
          </div>
        </div>
      </div>

      <div class="cluster" style="justify-content:center">
        <a class="btn btn-primary" href="shop.html">Continue shopping</a>
        <button type="button" class="btn btn-ghost" onclick="window.print()">Print this page</button>
      </div>
    </div>`;
  document.title = `Order ${o.id} confirmed — Aurelia`;
}

const order = id ? orders.getOrder(id) : null;
if (order) render(order); else notFound();
