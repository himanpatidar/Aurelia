#!/usr/bin/env node
/**
 * sync-chrome.mjs — propagate the shared header, footer and drawers.
 *
 * Because this site has no build step, the nav and footer markup is real
 * HTML in every page. Each copy is wrapped in sentinel comments:
 *
 *   <!-- #site-nav:start -->     ... <!-- #site-nav:end -->
 *   <!-- #site-footer:start -->  ... <!-- #site-footer:end -->
 *   <!-- #site-drawers:start --> ... <!-- #site-drawers:end -->
 *
 * Edit any one of those blocks in index.html, run this, and every other page
 * is updated to match. Nothing outside the sentinels is touched.
 *
 *   node tools/sync-chrome.mjs           # apply
 *   node tools/sync-chrome.mjs --check   # report drift, change nothing (exit 1 if drift)
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATE = 'index.html';
const BLOCKS = ['site-nav', 'site-footer', 'site-drawers'];
const CHECK = process.argv.includes('--check');

/** Capture a sentinel block, comments included. */
function blockRe(name) {
  return new RegExp(
    `<!--\\s*#${name}:start[\\s\\S]*?#${name}:end\\s*-->`,
    'm',
  );
}

const template = await readFile(path.join(ROOT, TEMPLATE), 'utf8');

const source = {};
for (const name of BLOCKS) {
  const match = template.match(blockRe(name));
  if (!match) {
    console.error(`✗ ${TEMPLATE} is missing the #${name} block — cannot sync.`);
    process.exit(1);
  }
  source[name] = match[0];
}

const pages = (await readdir(ROOT))
  .filter((f) => f.endsWith('.html') && f !== TEMPLATE)
  .sort();

let changed = 0;
let drifted = 0;
const skipped = [];

for (const file of pages) {
  const full = path.join(ROOT, file);
  const original = await readFile(full, 'utf8');
  let next = original;
  const missing = [];

  for (const name of BLOCKS) {
    const re = blockRe(name);
    if (!re.test(next)) { missing.push(name); continue; }
    next = next.replace(re, () => source[name]);
  }

  if (missing.length) skipped.push(`${file} (no ${missing.join(', ')})`);

  if (next !== original) {
    drifted += 1;
    if (CHECK) {
      console.log(`~ ${file} differs from ${TEMPLATE}`);
    } else {
      await writeFile(full, next, 'utf8');
      console.log(`✓ ${file}`);
      changed += 1;
    }
  }
}

if (skipped.length) {
  console.warn(`\n! Skipped block(s) in: ${skipped.join('; ')}`);
}

if (CHECK) {
  console.log(`\n${drifted === 0 ? '✓ All pages match' : `✗ ${drifted} page(s) out of sync`} (${pages.length} checked)`);
  process.exit(drifted === 0 ? 0 : 1);
}

console.log(`\nDone — ${changed} of ${pages.length} page(s) updated from ${TEMPLATE}.`);
