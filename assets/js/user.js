/* Aurelia — demo account profile.
   There is no authentication here. Any email/password pair creates a local
   profile so the account UI can be demonstrated; the password is never
   stored. Do not adapt this into real auth — it provides no security. */

import { read, write, remove } from './store.js';

const KEY = 'user:v1';
const ADDR_KEY = 'address:v1';

export function getUser() {
  const u = read(KEY, null);
  return u && typeof u.email === 'string' ? u : null;
}

export function isSignedIn() {
  return getUser() !== null;
}

/** Create/refresh the local profile. The password is deliberately discarded. */
export function signIn({ email, name = '' }) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return null;
  const existing = getUser();
  const user = {
    email: clean,
    name: name || existing?.name || clean.split('@')[0],
    since: existing?.since ?? new Date().toISOString(),
  };
  write(KEY, user);
  document.dispatchEvent(new CustomEvent('user:change', { detail: user }));
  return user;
}

export function signOut() {
  remove(KEY);
  document.dispatchEvent(new CustomEvent('user:change', { detail: null }));
}

export function getAddress() {
  return read(ADDR_KEY, null);
}

export function saveAddress(addr) {
  write(ADDR_KEY, addr);
}

export function clearAddress() {
  remove(ADDR_KEY);
}
