# Desert Tree Camp & Tours: website

A static website for Desert Tree Camp & Tours, a Bedouin-run camp and tour company in Wadi Rum, Jordan, run by Zayed and his brothers.

It's plain HTML, CSS and a little JavaScript. There is no framework, no server and no database. Bookings are sent to Zayed on WhatsApp, and guests pay in cash on arrival.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Home: hero, all tours, overnight options, how to book, about Zayed, reviews, FAQ |
| `tours.html` | All 12 programmes plus the custom Multi-Adventure |
| `tours/*.html` | One page per programme, with price table, start time, what's included |
| `camp.html` | Tents (standard, deluxe, under the stars) and facilities |
| `about.html` | Zayed and his family, meeting point, contact |
| `book.html` | Booking form with a live price estimate. It writes the WhatsApp message |
| `404.html` | Not-found page |

## How it's built

```
data/programmes.json   ← all prices, start times, descriptions (edit this)
data/site.json         ← phone, email, links, site URL (edit this)
tools/build.py         ← generates every .html page from the data
assets/css/style.css   ← design system (colours, fonts, layout)
assets/js/art.js       ← the desert illustrations (drawn on <canvas>)
assets/js/pricing.js   ← price calculator (pure functions, tested)
assets/js/book.js      ← booking form
assets/js/main.js      ← mobile menu, draws illustrations
assets/fonts/          ← self-hosted fonts (SIL Open Font License)
tests/                 ← price calculator tests
```

The HTML pages are generated, so **don't edit them by hand**. Change the data or `tools/build.py`, then rebuild:

```bash
python3 tools/build.py      # Python 3.8+, standard library only
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

```bash
node --test                 # Node 18+
```

The tests check every price in `data/programmes.json` against what Zayed sent on WhatsApp (29–30 Sep and 3 Oct 2026), and check the calculator's rules for groups, children and extras.

## Changing a price

1. Open `data/programmes.json` and find the programme by its `slug`.
2. Edit the `tiers` (price per person by group size). `"price": null` means "contact us for a price".
3. Run `python3 tools/build.py`.
4. Update the matching test in `tests/pricing.test.mjs`, then run `node --test`.

## Deploy to GitHub Pages (free preview link)

1. Create a repo on GitHub, for example `desert-tree-camp`.
2. Upload everything in this folder to the repo root (keep `.nojekyll`).
3. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**.
4. After about a minute the site is live at `https://<your-username>.github.io/desert-tree-camp/`.

If the repo name or account is different, update `site_url` in `data/site.json` and rebuild. It's used for the sitemap, canonical links and social previews.

## Custom domain (later)

When Zayed buys a domain (for example `deserttreecamp.com`):

1. Add a file named `CNAME` containing just the domain.
2. Set `site_url` in `data/site.json` to `https://deserttreecamp.com` and rebuild.
3. At the domain registrar, point DNS to GitHub Pages (4 `A` records to GitHub's IPs, or a `CNAME` record to `<username>.github.io`).
4. In **Settings → Pages**, enter the domain and tick **Enforce HTTPS**.

The domain should be registered in Zayed's name.

## Photos

Zayed's photos (from his Google Photos album, 30 Sep 2026) are in `assets/img/photos/`, each at 1600 px and 800 px (JPEG). Pages load the 800 px version where that's enough. The hot air balloon has no photo yet, so it still uses the illustration.

Photos where guests' faces are recognisable were left out, because we don't have those guests' consent.

## Adding or changing photos

Each programme has `"image": null` in `data/programmes.json`. Save the photo in `assets/img/photos/` as `name-1600.jpg` and `name-800.jpg` (the longest side 1600 px and 800 px), then set `"image": "assets/img/photos/name-1600.jpg"`. Use `"image_pos"` (for example `"50% 30%"`) to choose which part of the photo shows inside the arch. Rebuild, and the photo replaces the illustration inside the arch.

## Waiting on Zayed

- [ ] Languages the team speaks (for the About page)
- [ ] Website languages besides English (French, German, Italian, Spanish?). No Arabic version is needed, but keep the small Arabic words and calligraphy
- [ ] Facebook page link (`links.facebook` in `data/site.json`)
- [ ] Google reviews link (`links.google_reviews`)
- [ ] Whether Tripadvisor reviews can be shown (`links.tripadvisor`, currently off)
- [ ] Price of the guide's camel on the full-day camel ride
- [ ] Prices for 5 or more people on the 2-, 3- and 4-day programmes (the site says "Ask us")
- [ ] Start times for the 3- and 4-day programmes

## Assumptions to confirm with Zayed

- The man with the baby camel (`assets/img/photos/zayed-*.jpg`) is Zayed. The About section presents him that way.

- The children's price (half price aged 3–10) is also applied to extras: deluxe tent, sleeping under the stars and stargazing.
- Children aged 3 and over count towards group size for group prices.
- The Instagram link uses `@desert.tree.camp` and the email `DesertTreeWadiRum@gmail.com`, both from his current website.
- USD amounts use the fixed rate of 1 JOD = 1.41 USD (the dinar is pegged to the dollar).
