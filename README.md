# Topline Stainless Worx — Website

Static site (HTML / CSS / vanilla JS — no build step, no frameworks).
Design: **Industrial Precision** — Forge Black / Spark Orange. Built by Workflow Solutions.

## Pages
| File | Page |
|------|------|
| `index.html` | Home — 11 sections, animated hero canvas, LocalBusiness schema |
| `services.html` | All 6 services in detail (anchored: #fabrication, #gates, #balustrades, #custom, #welding, #polishing) |
| `about.html` | Workshop story, values |
| `gallery.html` | Placeholder project grid |
| `contact.html` | Quote form + map + contact details |

## Run locally
Serve from this folder root (links are root-relative, e.g. `/css/style.css`):
```
python -m http.server 8000
# then open http://localhost:8000
```
Opening `index.html` directly via `file://` will break the root-relative paths — always serve it.

## Deploy
Recommended: **Cloudflare Pages** — point it at this folder as the project root. No build command; output dir is `/`.

## ⚠️ Placeholders to replace before go-live
Search the codebase for each token in brackets.

| Token / file | Replace with | Where |
|--------------|--------------|-------|
| `[DOMAIN]` | Confirmed domain | canonical + og:url (all pages), schema, robots.txt, sitemap.xml |
| `[WHATSAPP_NUMBER]` | Intl format, no `+` (e.g. `27688089229`) | WhatsApp float (all pages), contact aside |
| `[FORMSPREE_ENDPOINT]` | Formspree form URL | `contact.html` form `action` |
| `[GA4_ID]` | GA4 measurement ID | not yet added — insert gtag snippet in `<head>` when ready |
| `assets/images/logo.svg` | Real client logo (SVG preferred) | replace file, keep filename or update refs |
| `assets/images/hero-welding.svg` | Real welding/fabrication hero photo | CSS `.hero` / `.page-hero` background |
| `assets/images/about-workshop.svg` | Real workshop/team photo | about strip backgrounds |
| `assets/images/gallery/` | Real project photos | swap `.gallery-item__ph` divs for `<img>` |
| Testimonials | Real, verified client quotes | `index.html` testimonials section (marked `[PLACEHOLDER]`) |
| Address | Confirm 99 Elm Rd, Petit, Benoni is permanent | footer, contact, schema, map query |

### Notes
- The contact form **fails gracefully** while `[FORMSPREE_ENDPOINT]` is unset — it shows a success
  message without sending. Once the real endpoint is in, it POSTs via `fetch()` with inline success/error.
- All placeholder images are on-brand SVGs so nothing renders broken before real assets arrive.
- Reduced-motion is respected: hero particles/glow stop, scroll reveals disabled, grid remains.
- Map uses a keyless Google Maps embed on the suburb (Petit, Benoni) — swap the `q=` for the exact
  pinned address once confirmed.
