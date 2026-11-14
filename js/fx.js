'use strict';
/* Эффект кнопки «Играть»: из-за кнопки во все стороны разлетаются лепестки (assets/fx), кружатся и падают.
   Слой рисуется на главном экране под кнопкой — лепестки вылетают из-за неё. Вызов: tapBurst(x, y). */
(function () {
  const LEAVES = ['leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf6'];
  const PETALS = ['petal_white', 'petal_pink', 'petal_blue', 'petal_cream', 'petal_purple', 'petal_red'];
  const FLOWERS = ['flower_white', 'flower_pink', 'flower_blue', 'flower_cream', 'flower_purple', 'flower_red'];
  const img = {};
  for (const n of [...LEAVES, ...PETALS, ...FLOWERS]) { const im = new Image(); im.src = 'assets/fx/' + n + '.png'; img[n] = im; }

  const cv = document.createElement('canvas');
  cv.id = 'fx';
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:1';
  const mount = () => { const t = document.getElementById('title'); if (t && cv.parentNode !== t) t.insertBefore(cv, t.firstChild); };
  document.addEventListener('DOMContentLoaded', mount); mount();
  const ctx = cv.getContext('2d');
  let dpr = 1;
  const resize = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  addEventListener('resize', resize); resize();

  const parts = [];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function burst(x, y) {
    const n = 22 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const r = Math.random(), name = r < 0.7 ? pick(PETALS) : r < 0.85 ? pick(FLOWERS) : pick(LEAVES);
      const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;      // во все стороны из-за кнопки
      const sp = 260 + Math.random() * 260;
      parts.push({ name, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 9,
        size: (name.startsWith('flower') ? 30 : 24) + Math.random() * 12, life: 0, max: 0.9 + Math.random() * 0.4, sway: Math.random() * 6.28 });
    }
    if (parts.length > 160) parts.splice(0, parts.length - 160);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  }
  let running = false, last = 0;
  function tick(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += 520 * dt;                                     // падают
      p.vx *= 1 - 1.8 * dt; p.vy *= 1 - 1.2 * dt;           // воздух тормозит — плавно, как листики
      p.x += (p.vx + Math.sin(p.life * 7 + p.sway) * 30) * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const im = img[p.name]; if (!im.complete || !im.naturalWidth) continue;
      const k = p.life / p.max, s = p.size * (k < 0.15 ? 0.5 + k / 0.3 : 1), w = s * im.naturalWidth / Math.max(im.naturalWidth, im.naturalHeight), h = s * im.naturalHeight / Math.max(im.naturalWidth, im.naturalHeight);
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(tick); else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  }
  window.tapBurst = burst;
})();
