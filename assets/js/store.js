/* Aurelia — localStorage wrapper.
   Every access is guarded: Safari private mode throws on setItem, and some
   browsers report a populated localStorage that cannot be written to. When
   persistence is unavailable we fall back to an in-memory map so the site
   keeps working for the length of the visit instead of breaking outright. */

const PREFIX = 'aurelia:';
const memory = new Map();
let persistent = null; // lazily probed

function canPersist() {
  if (persistent !== null) return persistent;
  try {
    const probe = `${PREFIX}__probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    persistent = true;
  } catch {
    persistent = false;
  }
  return persistent;
}

export function isPersistent() {
  return canPersist();
}

export function read(key, fallback = null) {
  const k = PREFIX + key;
  try {
    const raw = canPersist() ? window.localStorage.getItem(k) : memory.get(k);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    // Corrupt or hand-edited value — drop it rather than crash the page.
    try { window.localStorage.removeItem(k); } catch { /* ignore */ }
    return fallback;
  }
}

export function write(key, value) {
  const k = PREFIX + key;
  const raw = JSON.stringify(value);
  if (canPersist()) {
    try {
      window.localStorage.setItem(k, raw);
      return true;
    } catch {
      // Quota exceeded mid-session — degrade to memory.
      persistent = false;
    }
  }
  memory.set(k, raw);
  return false;
}

export function remove(key) {
  const k = PREFIX + key;
  try { window.localStorage.removeItem(k); } catch { /* ignore */ }
  memory.delete(k);
}

/** Subscribe to changes made in OTHER tabs. Returns an unsubscribe function. */
export function onExternalChange(key, handler) {
  const k = PREFIX + key;
  const listener = (e) => { if (e.key === k) handler(read(key)); };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
