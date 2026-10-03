// Run with: node --test tests/
// Every expected number below comes from Zayed's WhatsApp messages (29-30 Sep 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estimate, rateFor, fromPrice } from "../assets/js/pricing.js";

const data = JSON.parse(readFileSync(new URL("../data/programmes.json", import.meta.url)));
const prog = (slug) => data.programmes.find((p) => p.slug === slug);

test("full-day jeep tour tiers: 100 / 50 / 40", () => {
  assert.equal(rateFor(prog("full-day-jeep-tour"), 1), 100);
  assert.equal(rateFor(prog("full-day-jeep-tour"), 2), 50);
  assert.equal(rateFor(prog("full-day-jeep-tour"), 3), 40);
  assert.equal(rateFor(prog("full-day-jeep-tour"), 9), 40);
});

test("half-day 80/40/35 and 3-hour 65/30", () => {
  assert.deepEqual([1, 2, 3].map((n) => rateFor(prog("half-day-jeep-tour"), n)), [80, 40, 35]);
  assert.deepEqual([1, 2, 5].map((n) => rateFor(prog("3-hour-jeep-tour"), n)), [65, 30, 30]);
});

test("mountain programmes and group prices", () => {
  assert.deepEqual([1, 2, 3, 5, 6].map((n) => rateFor(prog("jabal-burdah-adventure"), n)), [120, 65, 50, 50, null]);
  assert.deepEqual([1, 2, 3, 6, 7].map((n) => rateFor(prog("umm-ad-dami-adventure"), n)), [150, 75, 60, 60, null]);
  assert.deepEqual([1, 2, 3, 6, 7].map((n) => rateFor(prog("white-desert-experience"), n)), [null, 60, 50, 50, null]);
});

test("multi-day programmes (Zayed, 3 Oct 2026); 5+ people ask for a price", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => rateFor(prog("two-day-desert-adventure"), n)), [200, 120, 90, 80, null]);
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => rateFor(prog("three-day-desert-adventure"), n)), [250, 170, 150, 150, null]);
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => rateFor(prog("four-day-desert-trek"), n)), [450, 300, 230, 200, null]);
});

test("flat prices and camel options", () => {
  assert.equal(rateFor(prog("stargazing"), 4), 15);
  assert.equal(rateFor(prog("hot-air-balloon"), 1), 160);
  assert.deepEqual(["30m", "1h", "2h", "day"].map((o) => rateFor(prog("camel-ride"), 1, o)), [10, 15, 25, 40]);
});

test("from-prices", () => {
  assert.equal(fromPrice(prog("full-day-jeep-tour")), 40);
  assert.equal(fromPrice(prog("white-desert-experience")), 50);
  assert.equal(fromPrice(prog("camel-ride")), 10);
  assert.equal(fromPrice(prog("multi-adventure")), null);
});

test("couple, full day, under the stars, with stargazing", () => {
  const e = estimate(data, { programme: "full-day-jeep-tour", adults: 2, night: "stars", stargazing: true });
  // 2×50 + 2×5 + 2×15
  assert.equal(e.total, 140);
  assert.equal(e.usd, Math.round(140 * 1.41));
});

test("children: under 3 free, 3-10 half price, and they count towards group size", () => {
  // 2 adults + 1 child (3-10) = group of 3 → 40 JOD tier. 2×40 + 1×20 = 100
  const e = estimate(data, { programme: "full-day-jeep-tour", adults: 2, children: 1, infants: 1, night: "tent" });
  assert.equal(e.group, 3);
  assert.equal(e.total, 100);
});

test("deluxe tent adds 5 per person, half for children", () => {
  const e = estimate(data, { programme: "half-day-jeep-tour", adults: 1, children: 2, night: "deluxe" });
  // group 3 → 35. 35 + 2×17.5 + 5 + 2×2.5 = 80
  assert.equal(e.total, 80);
});

test("contact-us tiers and quote programmes need a quote", () => {
  assert.equal(estimate(data, { programme: "white-desert-experience", adults: 1 }).needsQuote, true);
  assert.equal(estimate(data, { programme: "jabal-burdah-adventure", adults: 6 }).needsQuote, true);
  const m = estimate(data, { programme: "multi-adventure", adults: 4 });
  assert.equal(m.needsQuote, true);
  assert.equal(m.total, null);
});

test("full-day camel ride adds the guide-camel note", () => {
  const e = estimate(data, { programme: "camel-ride", adults: 2, option: "day" });
  assert.equal(e.total, 80);
  assert.ok(e.notes.some((n) => n.includes("camel for the guide")));
});

test("no guests is rejected", () => {
  assert.equal(estimate(data, { programme: "camel-ride", adults: 0, infants: 2 }).ok, false);
});
