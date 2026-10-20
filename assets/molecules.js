// MHN.ENG — subtle molecular motion behind the Home hero.
// Molecules interact: soft repulsion up close, weak attraction at mid range, plus
// thermal noise. They collide, form loose bonds and drift apart again. Pauses off-screen; static for reduced motion.
(function () {
  if (window.__mhnMolJs) return;
  window.__mhnMolJs = true;

  var st = null;

  function setup(canvas) {
    var ctx = canvas.getContext('2d');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var s = { canvas: canvas, ctx: ctx, reduce: reduce, parts: [], pairs: [], w: 0, h: 0, dpr: 1, visible: true, last: 0 };
    resize(s);
    return s;
  }

  function resize(s) {
    var host = s.canvas.parentElement.getBoundingClientRect();
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    s.w = Math.max(1, Math.round(host.width)); s.h = Math.max(1, Math.round(host.height));
    s.canvas.width = s.w * s.dpr; s.canvas.height = s.h * s.dpr;
    s.canvas.style.width = s.w + 'px'; s.canvas.style.height = s.h + 'px';
    s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    var n = Math.round(Math.min(170, Math.max(50, (s.w * s.h) / 9000)));
    s.parts = [];
    for (var i = 0; i < n; i++) {
      s.parts.push({
        x: Math.random() * s.w, y: Math.random() * s.h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() < 0.15 ? 3 : 1.6 + Math.random() * 1.1,
        hot: Math.random() < 0.1, fx: 0, fy: 0, flash: 0
      });
    }
    for (var w = 0; w < 120; w++) stepParts(s, 1);   // settle into a natural arrangement
    draw(s);
  }

  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 0.8; }

  // Interaction model (all in px and frames):
  //   r < R0      soft repulsion  — molecules bounce off each other
  //   R0 < r < RC weak attraction — they drift together and form loose, short-lived bonds
  //   plus Langevin noise + drag (a thermostat) so the "gas" never freezes or boils.
  var R0 = 46, RC = 110, KREP = 0.008, KATT = 0.00022;

  function stepParts(s, dt) {
    var P = s.parts, n = P.length, i, j;
    for (i = 0; i < n; i++) { P[i].fx = 0; P[i].fy = 0; }
    s.pairs.length = 0;
    for (i = 0; i < n; i++) {
      var a = P[i];
      for (j = i + 1; j < n; j++) {
        var b = P[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= RC * RC || d2 < 0.01) continue;
        var r = Math.sqrt(d2), ux = dx / r, uy = dy / r, f;
        if (r < R0) {
          f = -KREP * (R0 - r);                         // push apart
          if (r < R0 * 0.55 && !a.flash && !b.flash) { a.flash = b.flash = 1; }   // a hard collision
        } else {
          var t = (r - R0) / (RC - R0);
          f = KATT * (r - R0) * (1 - t) * (1 - t);     // pull together, fading to zero at RC
        }
        a.fx += f * ux; a.fy += f * uy; b.fx -= f * ux; b.fy -= f * uy;
        s.pairs.push(i, j, r);
      }
    }
    var theta = 0.02, sigma = 0.085, vmax = 0.9, sq = Math.sqrt(dt);
    for (i = 0; i < n; i++) {
      var p = P[i], m = p.r;                             // bigger molecules are heavier
      p.vx += (p.fx / m * 1.6 - theta * p.vx) * dt + sigma * gauss() * sq;
      p.vy += (p.fy / m * 1.6 - theta * p.vy) * dt + sigma * gauss() * sq;
      var sp = Math.hypot(p.vx, p.vy);
      if (sp > vmax) { p.vx *= vmax / sp; p.vy *= vmax / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 4) { p.x = 4; p.vx = Math.abs(p.vx); } else if (p.x > s.w - 4) { p.x = s.w - 4; p.vx = -Math.abs(p.vx); }
      if (p.y < 4) { p.y = 4; p.vy = Math.abs(p.vy); } else if (p.y > s.h - 4) { p.y = s.h - 4; p.vy = -Math.abs(p.vy); }
      if (p.flash) { p.flash -= 0.03 * dt; if (p.flash < 0) p.flash = 0; }
    }
  }

  function draw(s) {
    var c = s.ctx, P = s.parts, L = s.pairs;
    c.clearRect(0, 0, s.w, s.h);
    c.lineWidth = 1;
    for (var q = 0; q < L.length; q += 3) {
      var a = P[L[q]], b = P[L[q + 1]], r = L[q + 2];
      var bond = Math.max(0, 1 - Math.abs(r - R0 * 1.25) / (R0 * 0.9));   // strongest near the bond length
      var al = (1 - r / RC) * 0.14 + bond * 0.22;
      c.strokeStyle = (a.hot || b.hot) && bond > 0.4 ? 'rgba(198,241,53,' + (al * 0.9).toFixed(3) + ')' : 'rgba(161,171,180,' + al.toFixed(3) + ')';
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    }
    for (var k = 0; k < P.length; k++) {
      var p = P[k];
      if (p.flash > 0) {
        c.strokeStyle = 'rgba(198,241,53,' + (p.flash * 0.5).toFixed(3) + ')';
        c.beginPath(); c.arc(p.x, p.y, p.r + 3 + (1 - p.flash) * 8, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = p.hot ? 'rgba(198,241,53,0.85)' : 'rgba(238,241,243,0.5)';
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
    }
  }

  function loop(t) {
    var s = st; if (!s) return;
    var dt = s.last ? Math.min(3, (t - s.last) / 16.67) : 1; s.last = t;
    if (s.visible && !document.hidden) { stepParts(s, dt); draw(s); }
    requestAnimationFrame(loop);
  }

  var tries = 0;
  function init() {
    if (st) return;
    var canvas = document.querySelector('.hero-molecules');
    if (!canvas) return;
    var box = canvas.parentElement.getBoundingClientRect();
    if (box.width < 50 || box.height < 50) {           // not laid out yet (e.g. inside a preview frame): try again
      if (tries++ < 600) requestAnimationFrame(init);
      return;
    }
    st = setup(canvas);
    if (!st.reduce) requestAnimationFrame(loop);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { st.visible = es[0].isIntersecting || es[0].intersectionRatio > 0; }).observe(canvas.parentElement);
    }
    var tm, lw = st.w, lh = st.h;
    function onSize() {
      clearTimeout(tm);
      tm = setTimeout(function () {
        var b = canvas.parentElement.getBoundingClientRect();
        if (Math.abs(b.width - lw) > 2 || Math.abs(b.height - lh) > 2) { resize(st); lw = st.w; lh = st.h; }
      }, 120);
    }
    if ('ResizeObserver' in window) new ResizeObserver(onSize).observe(canvas.parentElement);
    window.addEventListener('resize', onSize);
  }

  if (document.readyState !== 'loading') init();
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  var mo = new MutationObserver(function () { init(); if (st) mo.disconnect(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
