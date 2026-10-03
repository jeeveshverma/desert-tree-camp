// Price estimate for a booking request.
// Pure functions only (no DOM), so it runs in the browser and in Node tests.
//
// Rules (from Zayed, 30 Sep 2026):
// - Prices are per person, in JOD, and depend on group size.
// - Group size counts every guest aged 3 and over.
// - Children under 3 are free; children aged 3-10 pay half price; over 10 pay full price.
// - Deluxe tent (private bathroom) and sleeping under the stars cost 5 JOD extra per person.
// - The estimate is a guide only. Zayed confirms the final price on WhatsApp.

export function rateFor(programme, groupSize, optionId) {
  const p = programme.pricing;
  if (p.type === "flat") return p.price;
  if (p.type === "quote") return null;
  if (p.type === "options") {
    const o = p.options.find((x) => x.id === optionId) || p.options[0];
    return o.price;
  }
  if (p.type === "tiers") {
    const t = p.tiers.find((x) => groupSize >= x.min && (x.max === null || groupSize <= x.max));
    return t ? t.price : null;
  }
  throw new Error("Unknown pricing type: " + p.type);
}

export function fromPrice(programme) {
  // Lowest per-person price, for "from X JOD" labels. Returns null if there is no fixed price.
  const p = programme.pricing;
  if (p.type === "flat") return p.price;
  if (p.type === "options") return Math.min(...p.options.map((o) => o.price));
  if (p.type === "tiers") {
    const prices = p.tiers.map((t) => t.price).filter((x) => x !== null);
    return prices.length ? Math.min(...prices) : null;
  }
  return null;
}

const round = (n) => Math.round(n * 100) / 100;

export function estimate(data, request) {
  const programme = data.programmes.find((x) => x.slug === request.programme);
  if (!programme) return { ok: false, error: "Choose a programme." };

  const adults = Math.max(0, Math.floor(request.adults || 0));
  const kids = Math.max(0, Math.floor(request.children || 0)); // aged 3-10
  const infants = Math.max(0, Math.floor(request.infants || 0)); // under 3
  const group = adults + kids;
  if (group < 1) return { ok: false, error: "Add at least one guest aged 3 or over." };

  const lines = [];
  const notes = [];
  let needsQuote = false;

  const perPerson = (label, rate) => {
    // name/child/count/rate let the page show the line in the visitor's language.
    if (adults) lines.push({ label: `${label}: ${adults} × ${rate} JOD`, name: label, child: false, count: adults, rate, amount: rate * adults });
    if (kids) lines.push({ label: `${label}, child 3-10: ${kids} × ${round(rate / 2)} JOD`, name: label, child: true, count: kids, rate: round(rate / 2), amount: (rate / 2) * kids });
  };

  const rate = rateFor(programme, group, request.option);
  if (rate === null) {
    needsQuote = true;
    notes.push(
      programme.pricing.type === "quote"
        ? "This programme is planned around you. Zayed will send you a price."
        : `For a group of ${group}, Zayed will send you a price.`
    );
  } else {
    perPerson(programme.name, rate);
    if (programme.pricing.type === "options") {
      const o = programme.pricing.options.find((x) => x.id === request.option) || programme.pricing.options[0];
      if (o.note) notes.push(`Full-day camel ride: ${o.note}. Zayed will confirm the price.`);
    }
  }

  if (programme.overnight && request.night) {
    const opt = data.overnight_options.find((x) => x.id === request.night);
    if (opt && opt.extra > 0) perPerson(opt.name, opt.extra);
  }

  if (request.stargazing && programme.slug !== "stargazing") {
    const sg = data.programmes.find((x) => x.slug === "stargazing");
    if (sg) perPerson("Stargazing add-on", sg.pricing.price);
  }

  if (infants) lines.push({ label: `Children under 3: ${infants} × free`, name: "Children under 3", free: true, count: infants, amount: 0 });
  if (programme.partner) notes.push("Balloon flights depend on the weather. Zayed will confirm availability.");

  const total = round(lines.reduce((s, l) => s + l.amount, 0));
  return {
    ok: true,
    programme: programme.name,
    group,
    lines: lines.map((l) => ({ ...l, amount: round(l.amount) })),
    total: needsQuote ? null : total,
    partialTotal: needsQuote ? total : null,
    usd: needsQuote ? null : Math.round(total * data.usd_per_jod),
    needsQuote,
    notes,
  };
}
