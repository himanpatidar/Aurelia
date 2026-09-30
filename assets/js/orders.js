/* Aurelia — demo order history.
   Orders live in localStorage only. There is no server: nothing is charged,
   nothing is shipped, and nothing leaves the browser. */

import { read, write } from './store.js';

const KEY = 'orders:v1';

/** AUR-260214-8F3C — date-stamped and short enough to read aloud. */
function newOrderId(date = new Date()) {
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  let rand = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  const bytes = new Uint8Array(4);
  (window.crypto ?? window.msCrypto)?.getRandomValues?.(bytes);
  for (let i = 0; i < 4; i += 1) {
    const n = bytes[i] || Math.floor(Math.random() * 256);
    rand += chars[n % chars.length];
  }
  return `AUR-${y}${m}${d}-${rand}`;
}

export function getOrders() {
  const list = read(KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getOrder(id) {
  return getOrders().find((o) => o.id === id) ?? null;
}

/**
 * Record a demo order.
 * @param {{items: Array, totals: object, customer: object, payment: string}} data
 * @returns {object} the saved order
 */
export function createOrder({ items, totals, customer, payment }) {
  const placedAt = new Date();
  // Demo delivery estimate: 3–6 working days from now.
  const eta = new Date(placedAt.getTime() + 5 * 86400000);

  const order = {
    id: newOrderId(placedAt),
    placedAt: placedAt.toISOString(),
    etaAt: eta.toISOString(),
    status: 'Confirmed (demo)',
    payment,
    customer,
    items: items.map((l) => ({ ...l })),
    totals: { ...totals },
    demo: true,
  };

  const list = getOrders();
  list.unshift(order);
  write(KEY, list.slice(0, 50)); // keep storage bounded
  return order;
}
