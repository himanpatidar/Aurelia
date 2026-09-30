#!/usr/bin/env node
/**
 * check-links.mjs — verify every internal link and asset reference resolves.
 *
 * Scans all .html files for href/src/srcset/data-fallback values, resolves
 * the local ones against the repo root, and reports anything missing. Also
 * checks that in-page #anchors exist and that every product slug linked from
 * static HTML is present in data/products.json.
 *
 * Remote URLs are listed but not fetched by default:
 *   node tools/check-links.mjs            # local only
 *   node tools/check-links.mjs --remote   # also HEAD every external URL
 */

import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_REMOTE = process.argv.includes('--remote');

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const htmlFiles = (await readdir(ROOT)).filter((f) => f.endsWith('.html')).sort();
const products = JSON.parse(await readFile(path.join(ROOT, 'data/products.json'), 'utf8'));
const slugs = new Set(products.products.map((p) => p.slug));

const problems = [];
const remote = new Set();
let localChecked = 0;
let anchorsChecked = 0;

/* Collect every id="" in a document so #anchor targets can be verified. */
function idsIn(html) {
  return new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
}

const idsByFile = new Map();
for (const file of htmlFiles) {
  idsByFile.set(file, idsIn(await readFile(path.join(ROOT, file), 'utf8')));
}

for (const file of htmlFiles) {
  const html = await readFile(path.join(ROOT, file), 'utf8');
  const refs = [];

  for (const m of html.matchAll(/\b(?:href|src|data-fallback)="([^"]+)"/g)) refs.push(m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    m[1].split(',').forEach((part) => refs.push(part.trim().split(/\s+/)[0]));
  }

  for (const raw of new Set(refs)) {
    const ref = raw.replace(/&amp;/g, '&').trim();
    if (!ref) continue;
    if (/^(https?:)?\/\//.test(ref)) { remote.add(ref); continue; }
    if (/^(mailto:|tel:|data:|javascript:)/.test(ref)) continue;

    if (ref.startsWith('#')) {
      anchorsChecked += 1;
      const id = ref.slice(1);
      if (id && !idsByFile.get(file).has(id)) {
        problems.push(`${file}: anchor ${ref} has no matching id`);
      }
      continue;
    }

    const [pathPart, query] = ref.split('?');
    const [cleanPath, hash] = pathPart.split('#');
    if (!cleanPath) continue;

    localChecked += 1;
    if (!(await exists(path.join(ROOT, cleanPath)))) {
      problems.push(`${file}: missing file → ${cleanPath}`);
      continue;
    }

    // product.html?id=<slug> — confirm the slug is in the catalog
    if (cleanPath === 'product.html' && query) {
      const id = new URLSearchParams(query).get('id');
      if (id && !slugs.has(id)) problems.push(`${file}: unknown product slug → ${id}`);
    }
    // cross-page #anchor
    if (hash && idsByFile.has(cleanPath) && !idsByFile.get(cleanPath).has(hash)) {
      problems.push(`${file}: ${cleanPath}#${hash} — no such id in ${cleanPath}`);
    }
  }
}

console.log(`Scanned ${htmlFiles.length} pages · ${localChecked} local refs · ${anchorsChecked} anchors · ${remote.size} unique remote URLs`);

if (CHECK_REMOTE) {
  console.log('\nChecking remote URLs…');
  const results = await Promise.all([...remote].map(async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      return res.ok ? null : `${res.status} ${url}`;
    } catch (err) {
      return `ERR ${url} (${err.message})`;
    }
  }));
  results.filter(Boolean).forEach((r) => problems.push(`remote: ${r}`));
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s):`);
  problems.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}
console.log('\n✓ No broken links or missing assets.');
