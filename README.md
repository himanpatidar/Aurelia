# Aurelia — Anti-Tarnish Jewelry Storefront

A complete, dependency-free static storefront for an anti-tarnish jewelry brand,
built to be served by GitHub Pages.

**Live:** https://himanpatidar.github.io/Aurelia/

- 21 pages · 18 products · 4 articles
- No build step, no framework, no npm dependencies
- One stylesheet, ES modules, product data in JSON
- Mobile-first, keyboard-accessible, SEO-structured

---

## ⚠️ This is a demonstration storefront

The cart and checkout flow is complete and works end to end, but **no payment is
processed and no order is placed or shipped.** There is no server and no payment
processor. Orders are written to the visitor's own `localStorage` so the flow can
be demonstrated.

Deliberately, **no card number, CVV, UPI ID or bank detail is collected anywhere
on this site.** A page that looks like it takes payment details but does not is
misleading to visitors, so the payment step offers selectable methods only. Every
page that could mislead carries a visible demo notice.

See [Going live](#going-live) for the smallest real-payment upgrades.

---

## Running it locally

`fetch()` cannot read a local JSON file over `file://`, so opening `index.html`
directly will leave the product grids empty. Serve the folder instead:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, VS Code Live Server).

---

## Layout

```
/
├── index.html                  Home
├── shop.html                   Catalog — filters, search, sort, URL-synced
├── product.html                Detail page, reads ?id=<slug>
├── cart.html                   Line items, quantities, promo codes
├── checkout.html               Demo checkout
├── order-confirmation.html     Reads ?order=<id>
├── account.html                Demo sign-in, order history, wishlist, address
├── anti-tarnish.html           SEO pillar: the technology
├── care-guide.html             SEO pillar: jewelry care
├── blog.html + blog-*.html     Journal index and 4 articles
├── about.html  contact.html  faq.html
├── shipping-returns.html  privacy.html  terms.html  404.html
├── robots.txt  sitemap.xml  .nojekyll
├── data/
│   ├── products.json           ← the file you edit most
│   ├── testimonials.json
│   └── blog.json               Post index (drives home teasers + blog.html)
├── assets/
│   ├── css/main.css            Whole design system, one file
│   ├── js/                     ES modules, see below
│   └── img/placeholders/*.svg  Local fallback art, one per category
└── tools/
    ├── sync-chrome.mjs         Propagate header/footer edits across pages
    └── check-links.mjs         Verify every link and asset resolves
```

### JavaScript modules

| File | Responsibility |
| --- | --- |
| `format.js` | Currency, dates, image URL/srcset building, HTML escaping. **Currency lives here.** |
| `store.js` | `localStorage` wrapper — guarded, with in-memory fallback |
| `cart.js` | Cart state, totals, shipping rule, promo codes |
| `catalog.js` | Catalog loading (memoised), filter/sort/search, product-card markup, wishlist |
| `orders.js` | Demo order history |
| `user.js` | Demo profile and saved address |
| `ui.js` | Loaded on every page: drawers, toasts, cart badge, add-to-bag, image fallbacks, scroll reveals |
| `page-*.js` | One per page, wires that page's DOM |

---

## Editing the site

### Products

Everything comes from `data/products.json`. Replace the `products` array and the
whole site follows — shop grid, filters, detail pages, related rails, search.

```json
{
  "id": "aur-rng-001",
  "slug": "eterna-solitaire-ring",
  "name": "Eterna Solitaire Ring",
  "category": "rings",
  "material": "925-sterling-silver",
  "finish": "Rhodium-plated",
  "price": 2499,
  "compareAtPrice": 3199,
  "shortDescription": "One line, used on cards and as the meta description.",
  "description": "Full paragraph for the detail page.",
  "specs": { "Metal": "925 sterling silver", "Weight": "3.2 g" },
  "sizes": ["12", "14", "16"],
  "antiTarnish": {
    "technology": "Rhodium barrier + clear e-coat",
    "warranty": "12-month anti-tarnish guarantee",
    "waterResistant": true,
    "sweatResistant": true
  },
  "badges": ["bestseller"],
  "inStock": true,
  "rating": 4.8,
  "reviewCount": 216,
  "featured": true,
  "addedOn": "2026-03-14",
  "images": [
    { "url": "assets/img/products/eterna-1.jpg",
      "fallback": "assets/img/placeholders/rings.svg",
      "alt": "Describe the image for screen readers and SEO" }
  ]
}
```

Notes:

- `category` and `material` must match a `slug` in the `categories` / `materials`
  arrays at the top of the file, or the item will not appear under any filter.
- `slug` is the product URL (`product.html?id=<slug>`) — changing it breaks old links.
- `images[].url` is a **base URL with no query string**. `format.js` appends width
  and quality params and builds a `srcset`. Local paths are used verbatim, so your
  own photos work without any change.
- Set `"compareAtPrice": null` when there is no discount; the "% off" badge is
  derived from it.
- `badges` accepts `"new"` and `"bestseller"`.

### Using your own photography

The current images are **Unsplash placeholders for layout only — they are not
licensed as your product imagery.** Replace them:

1. Drop your files into `assets/img/products/`.
2. Point each `images[].url` at the local path.
3. Aim for a 4:5 portrait crop at roughly 1000×1250 px.

If a remote image ever fails, `ui.js` swaps in the local `fallback` SVG, so the
page never shows a broken image.

### Currency

`assets/js/format.js`, top of file:

```js
export const CURRENCY = { code: 'INR', symbol: '₹', locale: 'en-IN' };
```

Prices in `products.json` are plain integers, so only this block changes.

### Promo codes and shipping

`assets/js/cart.js`:

```js
export const SHIPPING = { flat: 99, freeAbove: 1499 };
export const PROMOS = {
  AURELIA10: { type: 'percent', value: 10, minSubtotal: 0,    label: '10% off your order' },
  SHINE15:   { type: 'percent', value: 15, minSubtotal: 2000, label: '15% off over ₹2,000' },
  FREESHIP:  { type: 'shipping', value: 0, minSubtotal: 0,    label: 'Free shipping' },
};
```

These are client-side and readable by anyone. Never put a code here that
represents money you cannot afford to honour.

### Header, footer and navigation

The nav and footer are **real HTML in every page** — not injected by JavaScript —
so they work without JS and cost nothing in layout shift. Each copy sits between
sentinel comments:

```html
<!-- #site-nav:start -->     … <!-- #site-nav:end -->
<!-- #site-footer:start -->  … <!-- #site-footer:end -->
<!-- #site-drawers:start --> … <!-- #site-drawers:end -->
```

Edit the block in `index.html`, then propagate it:

```bash
node tools/sync-chrome.mjs           # apply to all other pages
node tools/sync-chrome.mjs --check   # report drift only (exit 1 if any)
```

### Adding a blog post

1. Copy any `blog-*.html`, rename it, and rewrite the `<article class="prose">` body.
2. Update the `<title>`, `<meta name="description">`, `<link rel="canonical">` and the
   `BlogPosting` JSON-LD block in `<head>`.
3. Add an entry at the top of `posts` in `data/blog.json` — this drives the blog
   index, the home-page teasers and the `<noscript>` list.
4. Add the URL to `sitemap.xml`.

### Theme and colours

All colours, type and spacing are custom properties at the top of
`assets/css/main.css` under `:root`. Retheming is that one block.

---

## Deploying

Already configured for GitHub Pages — `.nojekyll` is present and every asset path
is relative, which is what makes a project site under `/Aurelia/` work.

```bash
git add -A
git commit -m "Update storefront"
git push
```

Then **Settings → Pages → Source: `main` / `/ (root)`**. Live in 1–2 minutes.

### Custom domain

1. Create a `CNAME` file at the repo root containing just your domain.
2. Point a DNS `CNAME` record at `himanpatidar.github.io`.
3. Find-and-replace `https://himanpatidar.github.io/Aurelia/` with your domain in:
   - every `<link rel="canonical">` and `og:url` (all 21 pages)
   - `sitemap.xml` and `robots.txt`
   - the `SITE` constant in `assets/js/page-product.js`

---

## Going live

Each of these has a commented seam in the code. Cheapest first:

| Need | Smallest real option |
| --- | --- |
| **Take orders** | WhatsApp handoff — build the cart into a `wa.me/?text=` message. No account, no fees. Replace the submit handler in `page-checkout.js`. |
| **Take payments** | Razorpay payment links (one per product, add a `paymentLink` field) or Snipcart / Shopify Buy Buttons for a real cart. |
| **Contact form** | Formspree, Basin or Netlify Forms. Seam is at the top of `page-contact.js`. |
| **Newsletter** | Mailchimp or Buttondown embed. Seam is `initNewsletter()` in `ui.js`. |
| **Real accounts** | Needs a backend. `user.js` is a demo shim and provides no security — do not adapt it. |
| **Live chat** | Tawk.to or Crisp — a single script tag before `</body>`. |
| **Analytics** | Plausible or GoatCounter (one script tag, no cookie banner needed). |

---

## A note on SEO

The static content pages — home, anti-tarnish, care guide, FAQ, about, the four
articles and the policy pages — are **real HTML** and index normally. That is
where the organic search weight sits, and it is why those pages carry the long-form
copy.

The shop grid and product pages render from `data/products.json` in the browser.
Google does execute JavaScript and will index them, but client-rendered content is
indexed less reliably than static HTML. Mitigations already in place:

- `Product` + `Offer` + `AggregateRating` JSON-LD injected per product (read
  directly by Google, no rendering required)
- All 18 product URLs listed in `sitemap.xml`
- Per-product `<title>`, description, canonical and OG tags rewritten on render
- `BreadcrumbList`, `FAQPage`, `BlogPosting`, `JewelryStore` and `WebSite`
  structured data across the site

If product search traffic becomes important, the fix is pre-rendering one static
HTML file per product — which means adopting a build step (Astro or Eleventy would
both do it well).

---

## Checks

```bash
node tools/check-links.mjs            # internal links, assets, anchors, product slugs
node tools/check-links.mjs --remote   # also HEAD every external URL
node tools/sync-chrome.mjs --check    # header/footer drift
```

`--remote` reports expected failures: `himanpatidar.github.io` URLs 404 until the
site is deployed, X/Twitter returns 403 to scripted HEAD requests, and the two
bare font origins have no root document.

---

## Browser support

Modern evergreen browsers. Uses ES modules, `:has()`, `aspect-ratio`,
`IntersectionObserver` and `Intl.NumberFormat` — all baseline-available. Degrades
sensibly: `localStorage` failures fall back to memory, failed images fall back to
local SVGs, and the content pages work with JavaScript disabled.

---

## Licence

Site code and copy: MIT (see `LICENSE`).
Placeholder photography: [Unsplash Licence](https://unsplash.com/license) — for
layout demonstration only, not licensed as product imagery for a real shop.
Typefaces: Cormorant Garamond and Inter, SIL Open Font Licence.
