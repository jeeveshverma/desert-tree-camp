// Booking request form: live price estimate + WhatsApp message.
import { estimate } from "./pricing.js";

const data = JSON.parse(document.getElementById("tour-data").textContent);
const form = document.getElementById("req");
const WA = form.dataset.whatsapp;
const $ = (id) => document.getElementById(id);
const byslug = Object.fromEntries(data.programmes.map((p) => [p.slug, p]));
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

// Earliest date: tomorrow
const d = new Date(); d.setDate(d.getDate() + 1);
$("f-date").min = d.toISOString().slice(0, 10);

// Preselect from ?tour=slug
const want = new URLSearchParams(location.search).get("tour");
if (want && byslug[want]) $("f-tour").value = want;

function read() {
  const f = new FormData(form);
  return {
    programme: f.get("programme"),
    date: f.get("date"),
    adults: parseInt(f.get("adults"), 10) || 0,
    children: parseInt(f.get("children"), 10) || 0,
    infants: parseInt(f.get("infants"), 10) || 0,
    option: f.get("option"),
    night: f.get("night"),
    stargazing: $("f-stars").checked,
    name: (f.get("name") || "").trim(),
    country: (f.get("country") || "").trim(),
    from: f.get("from"),
    notes: (f.get("notes") || "").trim(),
  };
}

function sync() {
  const p = byslug[$("f-tour").value];
  $("w-camel").hidden = p.pricing.type !== "options";
  $("w-night").hidden = !p.overnight || p.pricing.type === "quote";
  $("w-stars").hidden = p.slug === "stargazing";
}

function renderEstimate() {
  const r = read();
  const est = estimate(data, { ...r, night: $("w-night").hidden ? null : r.night });
  const box = $("est");
  if (!est.ok) { box.innerHTML = `<h3>Your price</h3><p class="empty">${est.error}</p>`; return est; }
  const lines = est.lines.map((l) => `<li><span>${l.label}</span><span>${fmt(l.amount)} JOD</span></li>`).join("");
  const total = est.needsQuote
    ? `<div class="total"><span>Price</span><span>Zayed will quote</span></div>`
    : `<div class="total"><span>Total</span><span>${fmt(est.total)} JOD<br><small>about $${est.usd}</small></span></div>`;
  const notes = [...est.notes, "This is an estimate. Zayed confirms the final price on WhatsApp. Pay in cash on arrival."]
    .map((n) => `<p>${n}</p>`).join("");
  box.innerHTML = `<h3>Your price</h3><ul class="lines">${lines}</ul>${total}<div class="notes">${notes}</div>`;
  return est;
}

function message(r, est) {
  const p = byslug[r.programme];
  const when = new Date(r.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const guests = [`${r.adults} adult${r.adults === 1 ? "" : "s"}`];
  if (r.children) guests.push(`${r.children} child${r.children === 1 ? "" : "ren"} aged 3-10`);
  if (r.infants) guests.push(`${r.infants} under 3`);
  const L = [
    "Hello Zayed, I'd like to book with Desert Tree Camp & Tours.",
    "",
    `Tour: ${p.name}`,
  ];
  if (p.pricing.type === "options") {
    const o = p.pricing.options.find((x) => x.id === r.option);
    if (o) L.push(`Camel ride: ${o.name}`);
  }
  L.push(`Date: ${when}`, `Guests: ${guests.join(", ")}`);
  if (!$("w-night").hidden) {
    const n = data.overnight_options.find((x) => x.id === r.night);
    if (n) L.push(`Night: ${n.name}`);
  }
  if (r.stargazing && p.slug !== "stargazing") L.push("Add-on: Stargazing (2 hours)");
  L.push(`Coming from: ${r.from}`);
  if (r.notes) L.push(`Notes: ${r.notes}`);
  L.push("", est.needsQuote ? "Could you send me the price?" : `Price shown on the website: ${fmt(est.total)} JOD. Could you confirm?`, "", r.country ? `${r.name} (${r.country})` : r.name);
  return L.join("\n");
}

form.addEventListener("input", () => { sync(); renderEstimate(); });
form.addEventListener("change", () => { sync(); renderEstimate(); });
form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const r = read();
  const est = renderEstimate();
  const missing = [];
  if (!r.date) missing.push("a date");
  if (!est.ok) missing.push("at least one guest aged 3 or over");
  if (!r.name) missing.push("your name");
  const err = $("err");
  if (missing.length) { err.textContent = "Please add " + missing.join(", ") + "."; err.hidden = false; return; }
  err.hidden = true;
  const text = message(r, est);
  $("msg").textContent = text;
  $("wa").href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  $("out").hidden = false;
  $("out").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), 2200); }
$("copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("msg").textContent); toast("Copied"); }
  catch { const r = document.createRange(); r.selectNodeContents($("msg")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Text selected. Copy it with your keyboard."); }
});

sync();
renderEstimate();
