[中文](README.md) | [English](README.en.md)

# item.show

A lightweight static dashboard to browse your personal items and their lifecycle cost. Data is externalized in `items.json`.

## Directory structure

- `index.html` — app shell and layout
- `styles.css` — design tokens, layout, dark/light adaptations
- `lang.js` — i18n management (zh-CN/en), pill-toggle glue
- `theme.js` — theme switching (auto/light/dark) + persistence
- `script.js` — data loading, rendering, stats, search, animations
- `items.json` — your items data (you own this file)
- `CNAME` — optional custom domain (if using GitHub Pages)

## Animation & anime.js 4.2.2

- Bundled with the official anime.js **4.2.2** build (`anime/dist/bundles/anime.umd.min.js`) so the dashboard works offline/CDN-free.
- `script.js` now exposes several doc-inspired helpers:
  - `initPageIntroTimeline()` — orchestrates the header, banner, stats, and content entrance with `timeline` + `stagger`.
  - `startAuroraBackgroundAnimation()` — animates CSS custom props that drive the aurora gradients in `styles.css`.
  - `initAmbientOrbs()` — spawns floating orb particles with randomized translate/scale loops.
  - `pulseStatCards()` — gently pulses stat-card icons using keyframes.
  - `runItemCardAnimation()` — applies depth, blur dissolve, and staggered entrance to item cards.
- Styles introduce `--aurora-*` variables plus `#ambientOrbs` / `.ambient-orb` layers; they respect both light/dark tokens automatically.
- To extend animations:
  1. Call anime APIs inside `script.js` (timeline/keyframes/stagger recommended).
  2. Use `animeIsReady()` to guard against missing scripts in custom deployments.
  3. Accessibility is honored: ambient layers disable automatically under `prefers-reduced-motion`.


## Running from file:// (CORS)

If you open `index.html` directly via file://, the browser will block `fetch('items.json')` due to CORS/same-origin rules. You will see a message like:


Solutions:

- Serve the folder via a local web server (see Quick start).
- Or, for development only, inline the data in `script.js` (not recommended for production).


## items.json schema

Each item is an object with the following fields:


Accepted date formats (robust parsing):

- ISO-like strings: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`
- Partial month: `YYYY-MM` (treated as the 1st day of that month)
- Timestamps: milliseconds or seconds (auto-detected)
- Special indefinite values: `null`, `"0"`, `0`

Example:

```json
[
  {
    "id": 1,
    "name": "📱Samsung GALAXY Note II",
    "purchaseDate": "2014-10-15",
    "price": 2660,
    "retirementDate": "2016-03-15",
    "warrantyDate": "2015-10-15",
    "notes": "第一台手机",
    "category": "电子设备"
  },
  {
    "id": 2,
    "name": "📱Redmi K30",
    "purchaseDate": 1602892800,
    "price": 1999,
    "retirementDate": "2023/04/27",
    "warrantyDate": "2021.10.17",
    "notes": "主板烧了",
    "category": "电子设备"
  },
  {
    "id": 3,
    "name": "💻Lenovo ThinkPad X280",
    "purchaseDate": "2024-05",
    "price": 1146,
    "retirementDate": null,
    "warrantyDate": 1746576000000,
    "notes": "翻新机",
    "category": "电子设备"
  }
]
```

Notes:

- Currency symbol is presentation only (“¥”), not part of the schema.
- If `retirementDate` is indefinite, daily cost is price divided by days used so far.
- Warranty status:
  - Expired: today > `warrantyDate`
  - Expiring: days remaining ≤ 30 and > 0
  - Active: otherwise or no warranty date


## FAQ

Q: Why do I see a CORS error loading items.json?  

Q: How do I change the language or theme?  

Q: What date formats are supported?  
