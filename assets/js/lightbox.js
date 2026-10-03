// Gallery lightbox: tap a photo to see it full-size. Arrows or swipe to move, Esc to close.
// Without JS the links still open the full-size photo.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll("a[data-lightbox]"));
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }

  var dlg = el("dialog", "lightbox", { "aria-label": "Photo viewer" });
  var img = el("img", "", { alt: "" });
  var cap = el("p", "lb-cap");
  var count = el("span", "lb-count");
  var text = el("span");
  var prev = el("button", "lb-prev", { type: "button", "aria-label": "Previous photo" });
  var next = el("button", "lb-next", { type: "button", "aria-label": "Next photo" });
  var close = el("button", "lb-close", { type: "button", "aria-label": "Close" });
  prev.textContent = "‹";
  next.textContent = "›";
  close.textContent = "×";
  var fig = el("figure");
  cap.append(count, text);
  fig.append(img, cap);
  dlg.append(fig, prev, next, close);
  document.body.append(dlg);

  var at = 0;
  function show(i) {
    at = (i + links.length) % links.length;
    var thumb = links[at].querySelector("img");
    img.src = links[at].href;
    img.alt = thumb ? thumb.alt : "";
    count.textContent = at + 1 + " / " + links.length;
    text.textContent = img.alt;
  }

  links.forEach(function (a, i) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      show(i);
      dlg.showModal();
    });
  });
  prev.addEventListener("click", function () { show(at - 1); });
  next.addEventListener("click", function () { show(at + 1); });
  close.addEventListener("click", function () { dlg.close(); });
  // Click on the backdrop (outside the photo) closes.
  dlg.addEventListener("click", function (ev) { if (ev.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowLeft") show(at - 1);
    if (ev.key === "ArrowRight") show(at + 1);
  });

  var x0 = null;
  dlg.addEventListener("touchstart", function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
  dlg.addEventListener("touchend", function (ev) {
    if (x0 === null) return;
    var dx = ev.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
