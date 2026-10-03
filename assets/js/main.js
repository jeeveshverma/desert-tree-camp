// Mobile menu and illustrations. No dependencies.
(function () {
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? btn.dataset.close : btn.dataset.menu;
    });
  }
  // Close the language list when clicking elsewhere or pressing Esc.
  var langs = document.querySelector("details.langs");
  if (langs) {
    document.addEventListener("click", function (ev) { if (!langs.contains(ev.target)) langs.open = false; });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") langs.open = false; });
  }
    function draw() { if (window.drawAll) window.drawAll(); }
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () { draw(); document.body.setAttribute("data-ready", "1"); });
  var t;
  var lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return; // ignore mobile address-bar height changes
    lastW = window.innerWidth;
    clearTimeout(t);
    t = setTimeout(draw, 200);
  });
})();
