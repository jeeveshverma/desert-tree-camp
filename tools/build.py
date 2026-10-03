#!/usr/bin/env python3
"""Build the Desert Tree Camp & Tours website.

Generates every HTML page, the sitemap and robots.txt from:
  data/site.json        business details (contact, links, site URL)
  data/programmes.json  programmes, prices, start times

Usage (from the repo root):  python3 tools/build.py
No dependencies beyond the Python 3 standard library.
"""
import html
import json
import pathlib
import re
import sys
from datetime import date

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import i18n  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
DATA = json.loads((ROOT / "data/programmes.json").read_text(encoding="utf-8"))
PROGS = DATA["programmes"]
BY_SLUG = {p["slug"]: p for p in PROGS}
# Fixed-price programmes; the custom Multi-Adventure is counted separately.
N_PROGS = sum(1 for p in PROGS if p["group"] != "custom")
NUM_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"]
AR_NUM = "٠١٢٣٤٥٦٧٨٩"

# Site languages: (folder/code, hreflang, name in that language). English lives at the root.
LANGS = [("en", "en", "English"), ("fr", "fr", "Français"), ("de", "de", "Deutsch"), ("it", "it", "Italiano"),
         ("es", "es", "Español"), ("nl", "nl", "Nederlands"), ("pl", "pl", "Polski"), ("ru", "ru", "Русский"),
         ("zh", "zh-Hans", "简体中文"), ("ja", "ja", "日本語"), ("ko", "ko", "한국어")]
I18N = ROOT / "data/i18n"
CATALOGS = {c: json.loads((I18N / f"{c}.json").read_text(encoding="utf-8"))
            for c, _, _ in LANGS[1:] if (I18N / f"{c}.json").exists()}
BUILT = [l for l in LANGS if l[0] == "en" or l[0] in CATALOGS]
LANG = "en"        # language being built
SOURCE = {}        # English catalog keys -> pages they appear on
MISSING = {}       # language -> keys with no translation
e = html.escape


def ar_num(n):
    return "".join(AR_NUM[int(d)] for d in str(n))


def usd(jod):
    return round(jod * DATA["usd_per_jod"])


def wa_link(text=None):
    base = f"https://wa.me/{SITE['whatsapp']}"
    if text:
        from urllib.parse import quote
        base += "?text=" + quote(text)
    return base


# ---------------------------------------------------------------- pricing text
def from_price(p):
    pr = p["pricing"]
    if pr["type"] == "flat":
        return pr["price"], "per person"
    if pr["type"] == "options":
        o = min(pr["options"], key=lambda x: x["price"])
        return o["price"], f"per person, {o['name']} ride"
    if pr["type"] == "tiers":
        priced = [t for t in pr["tiers"] if t["price"] is not None]
        if not priced:
            return None, ""
        t = min(priced, key=lambda x: x["price"])
        return t["price"], f"per person, {group_label(t)}"
    return None, ""


def price_range():
    prices = []
    for p in PROGS:
        pr = p["pricing"]
        if pr["type"] == "flat":
            prices.append(pr["price"])
        elif pr["type"] == "options":
            prices += [o["price"] for o in pr["options"]]
        elif pr["type"] == "tiers":
            prices += [t["price"] for t in pr["tiers"] if t["price"] is not None]
    return min(prices), max(prices)


def group_label(t):
    lo, hi = t["min"], t["max"]
    if hi == lo:
        return "1 person" if lo == 1 else f"{lo} people"
    if hi is None:
        return f"{lo}+ people"
    return f"{lo}–{hi} people"


def price_rows(p):
    """Rows of (label, price_or_None, note) for the price table."""
    pr = p["pricing"]
    if pr["type"] == "tiers":
        return [(group_label(t), t["price"], "") for t in pr["tiers"]]
    if pr["type"] == "options":
        return [(o["name"], o["price"], o.get("note", "")) for o in pr["options"]]
    if pr["type"] == "flat":
        return [("Per person", pr["price"], "")]
    return []


# ---------------------------------------------------------------- structured data
def lang_prefix(code=None):
    code = code or LANG
    return "" if code == "en" else f"{code}/"


def abs_url(path, asset=False, code=None):
    prefix = "" if asset else lang_prefix(code)
    return SITE["site_url"].rstrip("/") + "/" + prefix + path.replace("index.html", "")


def crumbs_ld(*items):
    """BreadcrumbList matching the visible crumbs. items: (name, path)."""
    trail = [("Home", "index.html")] + list(items)
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": abs_url(u)} for i, (n, u) in enumerate(trail)]}


def faq_ld(items):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}


# ---------------------------------------------------------------- shared parts
SVG_DEFS = """<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<clipPath id="archClip" clipPathUnits="objectBoundingBox"><path d="M0,1 L0,0.36 C0,0.2 0.24,0.08 0.5,0 C0.76,0.08 1,0.2 1,0.36 L1,1 Z"/></clipPath>
<symbol id="khatam" viewBox="0 0 40 40"><rect x="8" y="8" width="24" height="24"/><rect x="8" y="8" width="24" height="24" transform="rotate(45 20 20)"/></symbol>
</defs></svg>"""

RIM = '<svg class="rim" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><path d="M0,1 L0,0.36 C0,0.2 0.24,0.08 0.5,0 C0.76,0.08 1,0.2 1,0.36 L1,1" stroke="#c8963e" stroke-width="1.3"/></svg>'

NAV = [("index.html", "Home"), ("tours.html", "Tours"), ("camp.html", "The camp"), ("about.html", "About us")]


def img_tag(image, alt, pos="50% 50%", eager=False, sizes="(max-width: 700px) 100vw, 600px"):
    small = image.replace("-1600.jpg", "-800.jpg")
    big = image.replace("-800.jpg", "-1600.jpg")
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="{{root}}{e(small)}" srcset="{{root}}{e(small)} 800w, {{root}}{e(big)} 1600w" sizes="{sizes}" '
            f'alt="{e(alt)}" style="object-position:{pos}" {load} decoding="async">')


def arch(scene, image=None, alt="", cls="", extra="", pos="50% 50%", eager=False, sizes=None):
    if image:
        inner = img_tag(image, alt, pos, eager, sizes or "(max-width: 700px) 100vw, 600px")
    else:
        inner = f'<canvas data-scene="{scene}" role="img" aria-label="{e(alt)}"></canvas>'
    return f'<div class="arch {cls}"><div class="clip">{inner}</div>{RIM}{extra}</div>'


# GitHub Pages can't send headers, so the policy goes in a meta tag. Only own scripts run.
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
       "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'")


def head(title, desc, path, root, jsonld=None):
    url = abs_url(path)
    alt = "".join(f'<link rel="alternate" hreflang="{h}" href="{e(abs_url(path, code=c))}">' for c, h, _ in BUILT) if path != "404.html" else ""
    alt += f'<link rel="alternate" hreflang="x-default" href="{e(abs_url(path, code="en"))}">' if alt else ""
    hl = next(h for c, h, _ in LANGS if c == LANG)
    blocks = jsonld if isinstance(jsonld, list) else [jsonld] if jsonld else []
    ld = "".join(f'<script type="application/ld+json">{json.dumps(b, ensure_ascii=False).replace("</", "<\\/")}</script>' for b in blocks)
    full = title if title == SITE["name"] else f"{title} · {SITE['name']}"
    return f"""<!doctype html>
<html lang="{hl}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{e(full)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{e(url)}">
{alt}
<meta property="og:type" content="website">
<meta property="og:title" content="{e(full)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(url)}">
<meta property="og:image" content="{e(SITE['site_url'].rstrip('/'))}/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#12163a">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{root}assets/img/apple-touch-icon.png">
<link rel="preload" href="{root}assets/fonts/el-messiri-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{root}assets/fonts/cairo-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/css/style.css">
{ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{SVG_DEFS}"""


def header(root, active):
    cur = ' aria-current="page"'
    links = "".join(f'<a href="{root}{href}"{cur if href == active else ""}>{label}</a>' for href, label in NAV)
    return f"""<header class="top">
  <div class="wrap">
    <a class="brand" href="{root}index.html" aria-label="{e(SITE['name'])}, home">
      <span class="mark ar" lang="ar">{SITE['name_ar']}</span>
      <span class="words" translate="no"><b>DESERT TREE</b><small>CAMP &amp; TOURS · WADI RUM</small></span>
    </a>
    <!--LANGS--><button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" data-menu="Menu" data-close="Close">Menu</button>
    <nav id="site-nav" aria-label="Main">{links}<a class="btn" href="{root}book.html">Book your trip</a></nav>
  </div>
</header>
<main id="main">"""


def footer(root):
    L = SITE["links"]
    social = [(L.get("instagram"), "Instagram"), (L.get("facebook"), "Facebook")]
    listings = [(L.get("booking"), "Booking.com"), (L.get("airbnb"), "Airbnb"), (L.get("google_reviews"), "Google reviews"), (L.get("tripadvisor"), "Tripadvisor")]
    lis = lambda items: "".join(f'<li><a href="{e(u)}" target="_blank" rel="noopener">{t}</a></li>' for u, t in items if u)
    tours = "".join(f'<li><a href="{root}tours/{p["slug"]}.html">{e(p["name"].replace(" + Overnight", ""))}</a></li>' for p in PROGS[:6])
    return f"""</main>
<footer>
  <div class="sadu"></div>
  <div class="wrap foot-grid">
    <div>
      <div class="mark ar" lang="ar">{SITE['name_ar']}</div>
      <div class="tl" translate="no">Desert Tree Camp &amp; Tours</div>
      <p style="margin-top:16px;max-width:36ch">{e(SITE['tagline'])}. Run by Zayed and his brothers in {e(SITE['address'])}.</p>
    </div>
    <div><h4>Tours</h4><ul>{tours}<li><a href="{root}tours.html">All tours</a></li></ul></div>
    <div><h4>Find us</h4><ul>{lis(social)}{lis(listings)}</ul></div>
    <div><h4>Contact</h4>
      <p>WhatsApp</p><a class="num" href="{wa_link()}" target="_blank" rel="noopener">{SITE['whatsapp_display']}</a>
      <p style="margin-top:12px"><a href="mailto:{SITE['email']}">{SITE['email']}</a></p>
      <p style="margin-top:12px"><a href="{SITE['meeting_point']['maps']}" target="_blank" rel="noopener">Meeting point on Google Maps</a></p>
    </div>
  </div>
  <div class="wrap" style="display:block;padding-block:0"><div class="base"><span>© {date.today().year} Desert Tree Camp &amp; Tours · Wadi Rum, Jordan</span><span class="ar" lang="ar" style="font-size:17px;color:#c8963e">أهلاً وسهلاً في وادي رم</span></div><p class="credit">Website by Jeevesh</p></div>
</footer>
<script src="{root}assets/js/art.js" defer></script>
<script src="{root}assets/js/main.js" defer></script>"""


def wa_float():
    icon = ('<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>')
    msg = "Hello Zayed, I have a question about Desert Tree Camp & Tours."
    return f'\n<a class="wa-float" href="{e(wa_link(msg))}" target="_blank" rel="noopener" aria-label="Message us on WhatsApp">{icon}<span>WhatsApp</span></a>'


def to_24h(text):
    """'2:00 PM' -> '14:00'. Every language besides English uses the 24-hour clock."""
    def conv(m):
        h = int(m.group(1)) % 12 + (12 if m.group(3) == "PM" else 0)
        return f"{h:02d}:{m.group(2)}"
    return re.sub(r"\b(\d{1,2}):(\d{2}) (AM|PM)\b", conv, text)


def lang_switcher(path, site_root):
    if len(BUILT) < 2:
        return ""
    cur = next(n for c, _, n in BUILT if c == LANG)
    items = "".join(
        f'<li><a href="{site_root}{lang_prefix(c)}{path}" hreflang="{h}" lang="{h}"{" aria-current=\"true\"" if c == LANG else ""}>{e(n)}</a></li>'
        for c, h, n in BUILT)
    return (f'<details class="langs" translate="no"><summary aria-label="Language: {e(cur)}">'
            f'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-9 9h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>'
            f'<span>{LANG.upper()}</span></summary><ul>{items}</ul></details>')


def page(path, title, desc, active, body, jsonld=None, tail=""):
    depth = path.count("/")
    page_root = "../" * depth                                  # links to pages in this language
    site_root = "../" * (depth + (LANG != "en"))               # the site root, where assets live
    fab = "" if path == "book.html" else wa_float()
    out = head(title, desc, path, "{root}", jsonld) + header("{root}", active) + body + footer("{root}") + fab + tail + "\n</body>\n</html>\n"
    out = out.replace("<!--LANGS-->", lang_switcher(path, site_root))
    out = out.replace("{root}assets/", site_root + "assets/").replace("{root}", page_root)
    if LANG == "en":
        for k in i18n.collect(out):
            SOURCE.setdefault(k, [])
            if path not in SOURCE[k]:
                SOURCE[k].append(path)
    else:
        out, missing = i18n.translate(to_24h(out), CATALOGS[LANG])
        MISSING.setdefault(LANG, set()).update(missing)
    path = lang_prefix() + path
    f = ROOT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(out, encoding="utf-8")
    return path


def eyebrow(ar, en):
    return f'<span class="eyebrow"><span class="ar" lang="ar">{ar}</span>{en}</span>'


def orn():
    return '<div class="orn"><i></i><svg class="star" viewBox="0 0 40 40" aria-hidden="true"><use href="#khatam" fill="#c8963e"/></svg><i></i></div>'


def card(p, i):
    price, note = from_price(p)
    price_html = f'<b>From {price} JOD <span class="about">≈ ${usd(price)}</span></b><small>{e(note)}</small>' if price is not None else "<b>Price on request</b><small>We'll send you a price</small>"
    tags = "".join(f'<span class="chip">{e(x)}</span>' for x in p["includes"][:2])
    no = f'<span class="no">No. {i}<span class="ar" lang="ar">{ar_num(i)}</span></span>'
    return f"""<a class="card" href="{{root}}tours/{p['slug']}.html">
  {arch(p['scene'], p.get('image'), p.get('image_alt', p['name']), extra=no, pos=p.get('image_pos', '50% 50%'), sizes='(max-width: 560px) 100vw, (max-width: 1040px) 50vw, 380px')}
  <span class="dur">{e(p['duration'])}</span>
  <h4>{e(p['name'])}</h4>
  <p>{e(p['summary'])}</p>
  <div class="foot"><span class="from">{price_html}</span><span class="go">Details →</span></div>
</a>"""


def programme_groups():
    out, n = [], 0
    for g in DATA["groups"]:
        items = [p for p in PROGS if p["group"] == g["id"]]
        cls = "c4" if len(items) == 4 else "c3"
        cards = []
        for p in items:
            n += 1
            cards.append(card(p, n))
        out.append(f"""<div class="group">
  <div class="group-head"><h3>{e(g['name'])}</h3><span class="ar" lang="ar">{g['ar']}</span><p>{e(g['blurb'])}</p></div>
  <div class="cards {cls}">{''.join(cards)}</div>
</div>""")
    return "".join(out)


def custom_banner():
    m = BY_SLUG["multi-adventure"]
    acts = "".join(f"<span>{e(a)}</span>" for a in m["activities"])
    return f"""<div class="custom">
  <canvas data-scene="custom" role="img" aria-label="Jeep, hiker and camels at sunset"></canvas>
  <div class="txt">
    {eyebrow('صمّم رحلتك', 'Build your own')}
    <h3>{e(m['name'])}</h3>
    <p>{e(m['description'][0])}</p>
    <div class="list">{acts}</div>
    <a class="btn gold" href="{{root}}tours/multi-adventure.html">Plan a custom trip</a>
  </div>
</div>"""


def stays():
    scenes = {"tent": "tentstay", "deluxe": "deluxe", "stars": "stars"}
    out = []
    for o in DATA["overnight_options"]:
        price = "Included in your tour" if o["extra"] == 0 else f"+{o['extra']} JOD per person"
        media = img_tag(o["image"], o.get("image_alt", o["name"]), o.get("image_pos", "50% 50%"), sizes="(max-width: 900px) 100vw, 380px") if o.get("image") else f'<canvas data-scene="{scenes[o["id"]]}" role="img" aria-label="{e(o["name"])}"></canvas>'
        out.append(f"""<div class="stay"><div class="stay-media">{media}</div>
<div class="b"><span class="price">{price}</span><h3>{e(o['name'])}</h3><p>{e(o['note'])}</p></div></div>""")
    return '<div class="stay-grid">' + "".join(out) + "</div>"


GALLERY = [
    ("camp-from-above", "Desert Tree Camp seen from the rocks above", "wide"),
    ("food", "Dinner spread at camp", ""),
    ("majlis-fire", "Fireplace in the Bedouin majlis tent", ""),
    ("cave-window", "Looking out of a rock window in Wadi Rum", "tall"),
    ("tent-deluxe-inside", "Inside a deluxe tent", ""),
    ("campfire", "The campfire at night", ""),
    ("mushroom-rock", "The mushroom rock in Wadi Rum", "wide"),
    ("tea", "Bedouin tea and snacks", ""),
    ("cave-lounge", "Candle-lit seating in a rock shelter", ""),
    ("rock-inscriptions", "Ancient rock inscriptions", ""),
    ("camp-tents", "Striped tents at the foot of the mountain", "wide"),
    ("desert-evening", "Evening light over the desert", ""),
]


def gallery():
    items = "".join(
        f'<figure class="g {cls}"><a href="{{root}}assets/img/photos/{n}-1600.jpg" data-lightbox>{img_tag(f"assets/img/photos/{n}-800.jpg", alt, sizes="(max-width: 700px) 50vw, 400px")}</a></figure>'
        for n, alt, cls in GALLERY
    )
    return f'<div class="gallery" data-viewer="Photo viewer" data-prev="Previous photo" data-next="Next photo" data-close="Close">{items}</div>'


def steps():
    items = [
        ("Choose a tour", "Pick a programme, or ask us to plan a mix of activities for the time you have."),
        ("Send your request", "Tell us your date, how many people and where you'd like to sleep. It goes to us on WhatsApp."),
        ("We confirm", "Zayed replies personally to confirm your date, the price and the meeting point."),
        ("Meet us in Wadi Rum", "Pay in cash when you arrive. Changed your plans? Cancelling is free."),
    ]
    words = ["one", "two", "three", "four"]
    return '<div class="steps">' + "".join(
        f'<div class="step"><div class="badge"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#khatam" fill="#9c2b22" stroke="#c8963e" stroke-width="1"/></svg><b lang="ar">{ar_num(i+1)}</b></div><span class="k">Step {words[i]}</span><h3>{t}</h3><p>{d}</p></div>'
        for i, (t, d) in enumerate(items)
    ) + "</div>"


FAQ = [
    ("How do I get to Wadi Rum?", "Wadi Rum Village is about an hour's drive from Aqaba and around two hours from Petra. We meet you in the village. The exact meeting point is on Google Maps, and we'll confirm it on WhatsApp."),
    ("What is included in the price?", "Every overnight programme includes a Bedouin tent with a shared bathroom, dinner and breakfast. The full-day jeep tour also includes lunch."),
    ("Do children pay?", "Children under 3 are free. Children from 3 to 10 years old pay half price, and from 11 they pay the adult price."),
    ("How do I pay?", "In cash when you arrive. There is nothing to pay online."),
    ("Can I cancel?", "Yes. Because you pay on arrival, cancelling is free. Just send us a message so we can plan."),
    ("Why is the price lower for groups?", "The jeep and guide cost the same for one person or several, so the price per person drops as your group grows."),
    ("What should I bring?", "A hat, sunscreen and sunglasses for the day, comfortable closed shoes, and a warm layer. Desert nights are cold, especially from November to March."),
    ("How fit do I need to be?", "Jeep tours, camel rides and stargazing suit everyone. Jabal Burdah and Umm ad Dami involve steep hiking and some scrambling, so tell us your experience and we'll advise."),
    ("When are you open?", "All year round, and you can book at any time."),
]


def faq_html(items):
    return '<div class="qa">' + "".join(
        f'<div class="q"><h3><svg width="16" height="16" viewBox="0 0 40 40" aria-hidden="true"><use href="#khatam" fill="#9c2b22"/></svg>{e(q)}</h3><p>{e(a)}</p></div>' for q, a in items
    ) + "</div>"


def reviews():
    L = SITE["links"]
    items = [(L.get("booking"), "Booking.com", "Read guest reviews"), (L.get("airbnb"), "Airbnb", "Read guest reviews"), (L.get("google_reviews"), "Google", "Read guest reviews"), (L.get("tripadvisor"), "Tripadvisor", "Read guest reviews")]
    items = [x for x in items if x[0]]
    return '<div class="reviews">' + "".join(
        f'<a class="rev" href="{e(u)}" target="_blank" rel="noopener"><span><b>{t}</b><br><span>{s}</span></span><i>→</i></a>' for u, t, s in items
    ) + "</div>"


ZAYED = ("I'm Zayed, born and raised in Wadi Rum. My family has lived a nomadic Bedouin life in this desert for generations. "
         "I grew up in the desert, learning its landscapes, traditions, and way of life from my family.")
ZAYED_2 = ("Today, I run our camp together with my brothers. With years of experience in managing desert tours and our camp, "
           "we care about every detail and always want our guests to leave with beautiful memories that stay with them long after they leave Wadi Rum.")


def host_section():
    return f"""<section class="sec host" id="host">
  <div class="wrap">
    {arch('host', 'assets/img/photos/zayed-1600.jpg', 'Zayed with a young camel in Wadi Rum', 'host-arch', '', pos='50% 35%', sizes='(max-width: 900px) 90vw, 440px')}
    <div>
      {eyebrow('مضيفك', 'Your hosts')}
      <h2>Meet Zayed and his brothers</h2>
      <p class="quote">"{e(ZAYED)}"</p>
      <p class="body">{e(ZAYED_2)}</p>
      <div class="sign"><span class="ar" lang="ar">زايد</span><span>Zayed<br>Desert Tree Camp &amp; Tours</span></div>
    </div>
  </div>
</section>"""


def business_ld():
    L = SITE["links"]
    return {
        "@context": "https://schema.org", "@type": "LodgingBusiness", "name": SITE["name"],
        "description": SITE["tagline"], "url": SITE["site_url"], "telephone": "+" + SITE["whatsapp"], "email": SITE["email"],
        "image": SITE["site_url"].rstrip("/") + "/assets/img/og.png",
        "address": {"@type": "PostalAddress", "addressLocality": "Wadi Rum Village", "addressRegion": "Aqaba Governorate", "addressCountry": "JO"},
        "geo": {"@type": "GeoCoordinates", "latitude": SITE["meeting_point"]["lat"], "longitude": SITE["meeting_point"]["lng"]},
        "priceRange": "JOD {}–{}".format(*price_range()), "paymentAccepted": "Cash", "currenciesAccepted": "JOD",
        "sameAs": [u for u in L.values() if u],
    }


# ---------------------------------------------------------------- pages
def build_index():
    body = f"""
<section class="hero lattice">
  <div class="ghost ar" lang="ar" aria-hidden="true">وادي رم</div>
  <div class="wrap">
    <div>
      <div class="greet ar" lang="ar">أهلاً وسهلاً</div>
      <div class="kicker">Bedouin-run camp &amp; tours in Wadi Rum</div>
      <h1>The desert, the way <span>the Bedouin know it</span></h1>
      <p class="lede">Cross red sand by jeep, climb to rock bridges and summits, ride camels at sunrise and sleep beneath more stars than you have ever seen. Zayed and his brothers were born here, and they'll show you their desert.</p>
      <div class="cta"><a class="btn gold" href="{{root}}tours.html">Explore the tours</a><a class="btn line" href="{{root}}book.html">Book your trip</a></div>
      <div class="meta"><span><b>{N_PROGS}</b> desert programmes</span><span><b>Cash</b> on arrival</span><span><b>Free</b> cancellation</span></div>
    </div>
    {arch('night', 'assets/img/photos/hero-camp-milky-way-1600.jpg', 'The Milky Way over a striped Bedouin tent at Desert Tree Camp', 'hero-arch', '<span class="tag">A NIGHT AT DESERT TREE CAMP</span>', pos='50% 60%', eager=True, sizes='(max-width: 900px) 90vw, 470px')}
  </div>
</section>
<div class="sadu"></div>

<section class="welcome">
  <div class="wrap">
    <div>
      <div class="big-ar" lang="ar">مرحبا بكم في صحرائنا</div>
      <h2>Welcome to our desert</h2>
      <p class="intro">Wadi Rum is not a place to rush through. Its canyons, dunes and sandstone mountains change colour from hour to hour, and the best of it is found slowly, with someone who knows the way. Spend a day exploring, share a meal by the fire, then sleep in the silence of the desert.</p>
    </div>
    <div class="pillars">
      <div class="pillar"><svg class="corner" viewBox="0 0 40 40" aria-hidden="true"><use href="#khatam" fill="none" stroke="#c8963e" stroke-width="2"/></svg><div class="fig"><b>{N_PROGS}</b><span class="ar" lang="ar">برامج</span></div><h3>Programmes to choose from</h3><p>From a 30-minute camel ride to four days of trekking across the open desert.</p></div>
      <div class="pillar"><svg class="corner" viewBox="0 0 40 40" aria-hidden="true"><use href="#khatam" fill="none" stroke="#c8963e" stroke-width="2"/></svg><div class="fig"><b>1,854 m</b></div><h3>Jordan's highest summit</h3><p>Hike to the top of Jabal Umm ad Dami, deep in the south of Wadi Rum.</p></div>
      <div class="pillar"><svg class="corner" viewBox="0 0 40 40" aria-hidden="true"><use href="#khatam" fill="none" stroke="#c8963e" stroke-width="2"/></svg><div class="fig"><b>3</b><span class="ar" lang="ar">تحت النجوم</span></div><h3>Ways to spend the night</h3><p>A Bedouin tent, a deluxe tent with a private bathroom, or a mattress under the open sky.</p></div>
      <div class="pillar"><svg class="corner" viewBox="0 0 40 40" aria-hidden="true"><use href="#khatam" fill="none" stroke="#c8963e" stroke-width="2"/></svg><div class="fig"><b>Family</b><span class="ar" lang="ar">بدو</span></div><h3>Run by Bedouin brothers</h3><p>Zayed and his brothers grew up in this desert, like their family before them.</p></div>
    </div>
  </div>
</section>

<section class="sec programmes" id="programmes">
  <div class="wrap">
    <div class="sec-head">
      {eyebrow('البرامج', 'Tours')}
      <h2>Choose your desert journey</h2>
      <p>Prices are per person and drop as your group grows. Every overnight programme includes a Bedouin tent, dinner and breakfast.</p>
      {orn()}
    </div>
    {programme_groups()}
    {custom_banner()}
  </div>
</section>

<section class="sec" id="stay">
  <div class="wrap">
    <div class="sec-head">
      {eyebrow('المبيت', 'The camp')}
      <h2>Three ways to spend the night</h2>
      <p>Our camp has hot showers and modern Western-style toilets. Choose how you'd like to sleep when you book.</p>
    </div>
    {stays()}
    <p style="text-align:center;margin-top:32px"><a class="btn line" href="{{root}}camp.html">More about the camp</a></p>
  </div>
</section>

<section class="sec" id="gallery" style="background:var(--night);color:#f5ecdf">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow" style="color:var(--gold-l)"><span class="ar" lang="ar">صور</span>Photos</span>
      <h2>Life at Desert Tree Camp</h2>
      <p style="color:#cfc6db">Dinner by the fire, tea in the majlis, and a desert that changes colour every hour.</p>
    </div>
    {gallery()}
  </div>
</section>
<div class="sadu"></div>

<section class="sec" id="how" style="background:var(--sand)">
  <div class="wrap">
    <div class="sec-head">
      {eyebrow('خطوات الحجز', 'How to book')}
      <h2>From your first message to the campfire</h2>
      <p>No online payment and no booking fees. You send a request, we reply personally, and you pay in cash when you arrive.</p>
    </div>
    {steps()}
    <p style="text-align:center;margin-top:44px"><a class="btn" href="{{root}}book.html">Book your trip</a></p>
  </div>
</section>

{host_section()}

<section class="sec" style="padding-block:72px">
  <div class="wrap">
    <div class="sec-head" style="margin-bottom:36px">{eyebrow('آراء الضيوف', 'Guest reviews')}<h2>What our guests say</h2><p>Read reviews from guests who have stayed with us.</p></div>
    {reviews()}
  </div>
</section>

<section class="sec faq" id="faq">
  <div class="wrap">
    <div class="sec-head">{eyebrow('قبل أن تصل', 'Good to know')}<h2>Before you come</h2></div>
    {faq_html(FAQ)}
  </div>
</section>"""
    desc = "Jeep tours, mountain hikes, camel rides and nights under the stars in Wadi Rum, Jordan, with a Bedouin family. Prices from 10 JOD, cash on arrival, free cancellation."
    tail = '<script src="{root}assets/js/lightbox.js" defer></script>'
    return page("index.html", SITE["name"], desc, "index.html", body, [business_ld(), faq_ld(FAQ)], tail=tail)


def build_tours():
    body = f"""
<section class="page-head lattice"><div class="ghost ar" lang="ar" aria-hidden="true">البرامج</div><div class="wrap">
  <div class="crumbs"><a href="{{root}}index.html">Home</a> / <span>Tours</span></div>
  <h1>Tours in Wadi Rum</h1>
  <p>{NUM_WORDS[N_PROGS]} programmes, from a short camel ride to four days of trekking, plus custom trips. Prices are per person and drop as your group grows.</p>
</div></section>
<div class="sadu thin"></div>
<section class="sec programmes"><div class="wrap">{programme_groups()}{custom_banner()}</div></section>"""
    return page("tours.html", "Tours in Wadi Rum", "All Desert Tree Camp & Tours programmes in Wadi Rum: jeep tours with overnight, Jabal Burdah, Umm ad Dami, 2- to 4-day desert adventures, camel rides, stargazing and hot air balloon, with prices.", "tours.html", body, crumbs_ld(("Tours", "tours.html")))


def day_blocks(blocks):
    out = []
    for b in blocks:
        items = "".join(f"<li>{e(x)}</li>" for x in b["items"])
        note = f'<p class="day-note">{e(b["note"])}</p>' if b.get("note") else ""
        out.append(f'<div class="day"><h3>{e(b["title"])}</h3><ul class="ticks">{items}</ul>{note}</div>')
    return "".join(out)


def build_tour(p):
    rows = price_rows(p)
    table = ""
    if rows:
        trs = "".join(
            f'<tr><td>{e(label)}{f"<br><small>{e(note)}</small>" if note else ""}</td><td>'
            + (f'<b>{price} JOD</b><span class="usd">about ${usd(price)}</span>' if price is not None else '<b>Ask us</b>')
            + "</td></tr>"
            for label, price, note in rows
        )
        head_label = "Group size" if p["pricing"]["type"] == "tiers" else ("Ride" if p["pricing"]["type"] == "options" else "")
        table = f'<table class="price-table"><thead><tr><th>{head_label}</th><th>Per person</th></tr></thead><tbody>{trs}</tbody></table>'
    else:
        table = '<p style="margin-top:14px">Tell us what you would like to do and how much time you have, and we will send you a programme and a price on WhatsApp.</p>'

    notes = []
    if p["pricing"]["type"] != "quote":
        notes.append("Children under 3 go free, and children aged 3–10 pay half price.")
    if p.get("overnight") and p["pricing"]["type"] != "quote":
        notes.append("Includes a Bedouin tent with a shared bathroom. Deluxe tent with private bathroom or sleeping under the stars: +5 JOD per person.")
    if p["pricing"]["type"] == "tiers" and any(t["price"] is None for t in p["pricing"]["tiers"]):
        notes.append("For group sizes marked 'Ask us', we'll send you a price.")
    notes.append("Pay in cash on arrival. Free cancellation.")
    notes_html = "".join(f"<p class='note'>{e(n)}</p>" for n in notes)

    fp, _ = from_price(p)
    facts = [("From", f"{fp} JOD per person") if fp is not None else ("Price", "on request"), ("Duration", p["duration"]), ("Starts", p["start"])]
    if p.get("partner"):
        facts.append(("Run by", "our local partner"))
    facts_html = "".join(f'<span class="fact"><b>{k}</b><span>{e(v)}</span></span>' for k, v in facts)
    desc_html = "".join(f"<p>{e(x)}</p>" for x in p["description"])
    inc = "".join(f"<li>{e(x)}</li>" for x in p["includes"])
    fit = f"<h2>Fitness</h2><p>{e(p['fitness'])}</p>" if p.get("fitness") else ""
    days = ""
    if p.get("itinerary"):
        days = "<h2>Day by day</h2>" + day_blocks(p["itinerary"])
    if p.get("stay_options"):
        days += "<h2>Where you sleep</h2>" + day_blocks(p["stay_options"])
    acts = ""
    if p.get("activities"):
        acts = "<h2>Activities to choose from</h2><ul class='ticks'>" + "".join(f"<li>{e(a)}</li>" for a in p["activities"]) + "</ul>"
    msg = f"Hello Zayed, I'd like to ask about the {p['name']}."
    same = [x for x in PROGS if x["group"] == p["group"] and x["slug"] != p["slug"]]
    rest = [x for x in PROGS if x["group"] != p["group"] and x["slug"] != p["slug"] and x["group"] != "custom"]
    others = (same + rest)[:3]
    other_cards = "".join(card(x, PROGS.index(x) + 1) for x in others)

    price, _ = from_price(p)
    ld = {"@context": "https://schema.org", "@type": "TouristTrip", "name": p["name"], "description": p["summary"],
          "touristType": "Adventure", "provider": {"@type": "LodgingBusiness", "name": SITE["name"], "telephone": "+" + SITE["whatsapp"]}}
    if price is not None:
        ld["offers"] = {"@type": "Offer", "price": price, "priceCurrency": "JOD", "availability": "https://schema.org/InStock"}
    if p.get("image"):
        ld["image"] = abs_url(p["image"], asset=True)
    if p.get("itinerary"):
        ld["itinerary"] = {"@type": "ItemList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": b["title"], "description": "; ".join(b["items"])}
            for i, b in enumerate(p["itinerary"])]}

    body = f"""
<section class="page-head lattice"><div class="ghost ar" lang="ar" aria-hidden="true">وادي رم</div><div class="wrap">
  <div class="crumbs"><a href="{{root}}index.html">Home</a> / <a href="{{root}}tours.html">Tours</a> / <span>{e(p['name'])}</span></div>
  <h1>{e(p['name'])}</h1>
  <p>{e(p['summary'])}</p>
</div></section>
<div class="sadu thin"></div>
<section class="tour"><div class="wrap">
  <div>
    {arch(p['scene'], p.get('image'), p.get('image_alt', p['name']), pos=p.get('image_pos', '50% 50%'), eager=True, sizes='(max-width: 920px) 100vw, 720px')}
    <div class="facts">{facts_html}</div>
    <div class="prose">{desc_html}
      {days}
      <h2>What's included</h2><ul class="ticks">{inc}</ul>
      {acts}{fit}
    </div>
  </div>
  <aside class="side-box" aria-label="Prices">
    <h2>Prices</h2>
    {table}
    {notes_html}
    <a class="btn" href="{{root}}book.html?tour={p['slug']}">Book this tour</a>
    <a class="btn line" href="{wa_link(msg)}" target="_blank" rel="noopener">Ask on WhatsApp</a>
  </aside>
</div></section>
<section class="others"><div class="wrap">
  <div class="group-head"><h3>You might also like</h3><span class="ar" lang="ar">برامج أخرى</span></div>
  <div class="cards c3">{other_cards}</div>
</div></section>"""
    crumbs = crumbs_ld(("Tours", "tours.html"), (p["name"], f"tours/{p['slug']}.html"))
    return page(f"tours/{p['slug']}.html", p["name"], p["summary"], "tours.html", body, [ld, crumbs])


def build_camp():
    facilities = [
        ("Hot showers", "Clean showers at camp, so you can wash off the desert dust."),
        ("Western-style toilets", "Modern toilets, shared or private depending on your tent."),
        ("Tents for every group", "Single, double, triple and family tents."),
        ("Dinner by the fire", "Dinner and breakfast are included with every overnight stay."),
    ]
    fac = "".join(f'<div class="facility"><h3>{t}</h3><p>{d}</p></div>' for t, d in facilities)
    L = SITE["links"]
    body = f"""
<section class="page-head lattice"><div class="ghost ar" lang="ar" aria-hidden="true">المخيم</div><div class="wrap">
  <div class="crumbs"><a href="{{root}}index.html">Home</a> / <span>The camp</span></div>
  <h1>Desert Tree Camp</h1>
  <p>A Bedouin camp in Wadi Rum, run by Zayed and his brothers. Every overnight tour includes a tent, dinner and breakfast.</p>
</div></section>
<div class="sadu thin"></div>
<section class="sec"><div class="wrap">
  <div class="sec-head">{eyebrow('المبيت', 'Where you sleep')}<h2>Three ways to spend the night</h2><p>Choose your option when you book. The extra cost is per person, and children aged 3–10 pay half.</p></div>
  {stays()}
  <div class="facilities">{fac}</div>
  <div class="gallery" style="margin-top:48px">
    <figure class="g wide">{img_tag("assets/img/photos/dining-hall-800.jpg", "The dining tent", sizes="(max-width: 700px) 100vw, 600px")}</figure>
    <figure class="g">{img_tag("assets/img/photos/bathroom-800.jpg", "A bathroom at camp", sizes="(max-width: 700px) 50vw, 300px")}</figure>
    <figure class="g">{img_tag("assets/img/photos/tent-deluxe-inside-800.jpg", "Inside a deluxe tent", sizes="(max-width: 700px) 50vw, 300px")}</figure>
    <figure class="g wide">{img_tag("assets/img/photos/camp-tents-800.jpg", "Tents at the foot of the mountain", sizes="(max-width: 700px) 100vw, 600px")}</figure>
    <figure class="g">{img_tag("assets/img/photos/food-800.jpg", "Dinner at camp", sizes="(max-width: 700px) 50vw, 300px")}</figure>
    <figure class="g">{img_tag("assets/img/photos/campfire-800.jpg", "The campfire", sizes="(max-width: 700px) 50vw, 300px")}</figure>
  </div>
  <p style="text-align:center;margin-top:48px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
    <a class="btn" href="{{root}}book.html">Book your stay</a>
    <a class="btn line" href="{e(SITE['camp_maps'])}" target="_blank" rel="noopener">Camp location on Google Maps</a>
    {f'<a class="btn line" href="{e(L["booking"])}" target="_blank" rel="noopener">See us on Booking.com</a>' if L.get('booking') else ''}
  </p>
</div></section>"""
    return page("camp.html", "The camp", "Desert Tree Camp in Wadi Rum: Bedouin tents with shared bathroom, deluxe tents with private bathroom, or sleeping under the stars. Hot showers and Western-style toilets.", "camp.html", body, crumbs_ld(("The camp", "camp.html")))


def build_about():
    mp = SITE["meeting_point"]
    body = f"""
<section class="page-head lattice"><div class="ghost ar" lang="ar" aria-hidden="true">عائلتنا</div><div class="wrap">
  <div class="crumbs"><a href="{{root}}index.html">Home</a> / <span>About us</span></div>
  <h1>A Bedouin family in Wadi Rum</h1>
  <p>Zayed and his brothers run Desert Tree Camp &amp; Tours in the desert where their family has lived for generations.</p>
</div></section>
<div class="sadu thin"></div>
{host_section()}
<section class="sec" style="background:var(--sand)"><div class="wrap">
  <div class="sec-head">{eyebrow('موقعنا', 'Find us')}<h2>Where we meet you</h2><p>We meet guests in Wadi Rum Village and drive together to the camp. Send us a message and we'll confirm the time.</p></div>
  <div class="reviews">
    <a class="rev" href="{e(mp['maps'])}" target="_blank" rel="noopener"><span><b>Meeting point</b><br><span>Wadi Rum Village · {mp['lat']:.4f}° N, {mp['lng']:.4f}° E</span></span><i>→</i></a>
    <a class="rev" href="{e(SITE['camp_maps'])}" target="_blank" rel="noopener"><span><b>The camp</b><br><span>Desert Tree Camp on Google Maps</span></span><i>→</i></a>
    <a class="rev" href="{wa_link()}" target="_blank" rel="noopener"><span><b>WhatsApp</b><br><span>{SITE['whatsapp_display']}</span></span><i>→</i></a>
  </div>
</div></section>
<section class="sec faq"><div class="wrap"><div class="sec-head">{eyebrow('قبل أن تصل', 'Good to know')}<h2>Before you come</h2></div>{faq_html(FAQ)}</div></section>"""
    return page("about.html", "About us", "Meet Zayed and his brothers, a Bedouin family running Desert Tree Camp & Tours in Wadi Rum, Jordan.", "about.html", body, [crumbs_ld(("About us", "about.html")), faq_ld(FAQ)])


def build_book():
    groups = []
    for g in DATA["groups"] + [{"id": "custom", "name": "Custom"}]:
        opts = "".join(f'<option value="{p["slug"]}">{e(p["name"])}</option>' for p in PROGS if p["group"] == g["id"])
        groups.append(f'<optgroup label="{e(g["name"])}">{opts}</optgroup>')
    camel = BY_SLUG["camel-ride"]["pricing"]["options"]
    camel_opts = "".join(f'<label><input type="radio" name="option" value="{o["id"]}"{" checked" if i == 0 else ""}><span>{e(o["name"])}</span></label>' for i, o in enumerate(camel))
    def night_label(o):
        extra = "" if o["extra"] == 0 else f" (+{o['extra']} JOD)"
        return e(o["name"].split(",")[0]) + extra
    night_opts = "".join(f'<label><input type="radio" name="night" value="{o["id"]}"{" checked" if i == 0 else ""}><span>{night_label(o)}</span></label>' for i, o in enumerate(DATA["overnight_options"]))
    body = f"""
<section class="page-head lattice"><div class="ghost ar" lang="ar" aria-hidden="true">اطلب رحلتك</div><div class="wrap">
  <div class="crumbs"><a href="{{root}}index.html">Home</a> / <span>Book your trip</span></div>
  <h1>Book your trip</h1>
  <p>Fill in a few details to see the price, then send your request to Zayed on WhatsApp. Nothing is booked until we confirm, and you pay in cash when you arrive.</p>
</div></section>
<div class="sadu thin"></div>
<section class="book lattice"><div class="wrap">
  <div class="req-grid">
    <form class="form" id="req" data-whatsapp="{e(SITE['whatsapp'])}" novalidate>
      <div class="fl full"><label for="f-tour">Tour</label><select id="f-tour" name="programme">{''.join(groups)}</select></div>
      <div class="fl"><label for="f-date">Date</label><input id="f-date" name="date" type="date" required></div>
      <div class="fl"><label for="f-adults">Adults and children over 10</label><input id="f-adults" name="adults" type="number" min="0" max="40" value="2" inputmode="numeric"></div>
      <div class="fl"><label for="f-kids">Children aged 3–10</label><input id="f-kids" name="children" type="number" min="0" max="20" value="0" inputmode="numeric"><small>Half price</small></div>
      <div class="fl"><label for="f-infants">Children under 3</label><input id="f-infants" name="infants" type="number" min="0" max="10" value="0" inputmode="numeric"><small>Free</small></div>
      <fieldset class="fl full" id="w-camel" hidden><legend>Camel ride length</legend><div class="seg">{camel_opts}</div></fieldset>
      <fieldset class="fl full" id="w-stay" hidden><legend>Accommodation</legend><div class="seg" id="stay-opts"></div></fieldset>
      <fieldset class="fl full" id="w-night"><legend>Where would you like to sleep?</legend><div class="seg">{night_opts}</div></fieldset>
      <div class="fl full" id="w-stars"><label class="check"><input type="checkbox" id="f-stars" name="stargazing"> Add the 2-hour stargazing experience (15 JOD per person)</label></div>
      <div class="fl"><label for="f-name">Your name</label><input id="f-name" name="name" type="text" autocomplete="name" required></div>
      <div class="fl"><label for="f-country">Country</label><input id="f-country" name="country" type="text" autocomplete="country-name"></div>
      <div class="fl full"><label for="f-from">Coming from</label><select id="f-from" name="from"><option value="Not decided yet">Not decided yet</option><option value="Aqaba">Aqaba</option><option value="Petra / Wadi Musa">Petra / Wadi Musa</option><option value="Amman">Amman</option><option value="Other">Other</option></select></div>
      <div class="fl full"><label for="f-notes">Anything else?</label><textarea id="f-notes" name="notes" placeholder="Dietary needs, fitness for hikes, a special occasion…"></textarea></div>
      <p class="err" id="err" role="alert" hidden></p>
      <button class="btn gold" type="submit">Prepare my WhatsApp message</button>
    </form>
    <div class="side">
      <div class="estimate" id="est" aria-live="polite"><h3>Your price</h3><p class="empty">Choose a tour and the number of guests.</p></div>
      <div class="estimate" id="out" hidden>
        <h3>Your message to Zayed</h3>
        <p class="notes" style="margin-top:6px">It's in English, so Zayed can read it straight away.</p>
        <div class="preview" id="msg" style="margin-top:12px"></div>
        <div class="send-row" style="margin-top:14px"><a class="btn wa" id="wa" href="#" target="_blank" rel="noopener">Send on WhatsApp</a><button class="btn line" type="button" id="copy">Copy text</button></div>
        <p class="notes" style="margin-top:10px">If WhatsApp doesn't open, copy the text and send it to {SITE['whatsapp_display']}.</p>
      </div>
      <div class="note"><h4>Prefer to message directly?</h4><p>WhatsApp Zayed any time. Replies usually come the same day.</p><a class="num" href="{wa_link()}" target="_blank" rel="noopener">{SITE['whatsapp_display']}</a></div>
    </div>
  </div>
</div></section>
<div class="toast" id="toast" hidden></div>"""
    data_json = json.dumps(DATA, ensure_ascii=False).replace("</", "<\\/")
    js_i18n = json.dumps(js_catalog(), ensure_ascii=False).replace("</", "<\\/")
    tail = f"""<script id="tour-data" type="application/json">{data_json}</script>
<script id="i18n" type="application/json">{js_i18n}</script>
<script type="module" src="{{root}}assets/js/book.js"></script>"""
    return page("book.html", "Book your trip", "Check prices and send a booking request to Desert Tree Camp & Tours on WhatsApp. Pay in cash on arrival, free cancellation.", "book.html", body, crumbs_ld(("Book your trip", "book.html")), tail=tail)


# Text that book.js builds in the browser, so it never appears in the English HTML.
JS_STRINGS = [
    "Your price", "Total", "Price", "Zayed will quote", "about $1",
    "This is an estimate. Zayed confirms the final price on WhatsApp. Pay in cash on arrival.",
    ", child 3-10", "Children under 3", "free", "Stargazing add-on",
    "Choose a programme.", "Add at least one guest aged 3 or over.",
    "This programme is planned around you. Zayed will send you a price.",
    "For a group of 1, Zayed will send you a price.",
    "Full-day camel ride: plus a camel for the guide. Zayed will confirm the price.",
    "Balloon flights depend on the weather. Zayed will confirm availability.",
    "Please choose a date.", "Please add at least one guest aged 3 or over.", "Please add your name.",
    "Copied", "Text selected. Copy it with your keyboard.",
]


def js_keys():
    texts = JS_STRINGS + [p["name"] for p in PROGS] + [o["name"] for o in DATA["overnight_options"]]
    texts += [o["label"] for p in PROGS for o in p.get("stay_options", []) if o.get("label")]
    return [i18n.make_key(t)[0] for t in texts]


def js_catalog():
    if LANG == "en":
        return {}
    cat = CATALOGS[LANG]
    return {k: cat[k] for k in js_keys() if i18n.lookup(cat, k) is not None}


def build_404():
    body = """
<section class="page-head lattice" style="min-height:60vh"><div class="wrap">
  <h1>Lost in the desert?</h1>
  <p>This page doesn't exist. Head back to the start, or see all our tours.</p>
  <p style="display:flex;gap:12px;flex-wrap:wrap;margin-top:28px"><a class="btn gold" href="{root}index.html">Home</a><a class="btn line" style="color:#f5ecdf" href="{root}tours.html">All tours</a></p>
</div></section>"""
    return page("404.html", "Page not found", "Page not found.", "", body)


def build_language(code):
    global LANG
    LANG = code
    pages = [build_index(), build_tours(), build_camp(), build_about(), build_book()]
    pages += [build_tour(p) for p in PROGS]
    if code == "en":
        build_404()
    return pages


def main():
    pages = []
    for code, _, _ in BUILT:
        pages += build_language(code)
    for k in js_keys():
        SOURCE.setdefault(k, []).append("book.js")
    I18N.mkdir(parents=True, exist_ok=True)
    (I18N / "_source.json").write_text(json.dumps(dict(sorted(SOURCE.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for code, _, _ in LANGS[1:]:
        if code not in CATALOGS:
            print(f"  {code}: no data/i18n/{code}.json yet, skipped")
        else:
            gaps = set(SOURCE) - {k for k in SOURCE if i18n.lookup(CATALOGS[code], k) is not None}
            if gaps:
                print(f"  {code}: {len(gaps)} strings not translated (shown in English)")
    base = SITE["site_url"].rstrip("/")
    today = date.today().isoformat()
    urls = "".join(f"<url><loc>{base}/{p.replace('index.html', '')}</loc><lastmod>{today}</lastmod></url>" for p in pages)
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n', encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n", encoding="utf-8")
    print(f"Built {len(pages) + 1} pages into {ROOT}")


if __name__ == "__main__":
    main()
