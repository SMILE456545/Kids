'use strict';
/* Рисованный стиль: дрожащие контуры «от руки» + акварельная заливка.
   Всё детерминировано через seed, чтобы картинка не «прыгала». */
const INK = '#3b2e29';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const Sk = {
  _r: mulberry32(7),
  seed(s) { this._r = mulberry32((s * 2654435761) >>> 0); },
  rnd() { return this._r(); },
  r(a, b) { return a + (b - a) * this._r(); },
  pick(a) { return a[Math.floor(this._r() * a.length)]; },

  smooth(pts, closed) {
    const p = new Path2D(), n = pts.length;
    if (n < 3) {
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n; i++) p.lineTo(pts[i][0], pts[i][1]);
      if (closed) p.closePath();
      return p;
    }
    if (closed) {
      const a = pts[n - 1], b = pts[0];
      p.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      for (let i = 0; i < n; i++) {
        const c = pts[i], d = pts[(i + 1) % n];
        p.quadraticCurveTo(c[0], c[1], (c[0] + d[0]) / 2, (c[1] + d[1]) / 2);
      }
      p.closePath();
    } else {
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const c = pts[i], d = pts[i + 1];
        p.quadraticCurveTo(c[0], c[1], (c[0] + d[0]) / 2, (c[1] + d[1]) / 2);
      }
      p.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
    return p;
  },
  straight(pts, closed) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    if (closed) p.closePath();
    return p;
  },
  bounds(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return [x0, y0, x1 - x0, y1 - y0];
  },
  ellipsePts(cx, cy, rx, ry, wob, rot) {
    const n = Math.max(10, Math.min(56, Math.round((rx + ry) * 0.45)));
    const pts = [], off = this.r(0, 6.283);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2 + this.r(-0.06, 0.06);
      const k = 1 + this.r(-wob, wob);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return pts;
  },
  segPts(x1, y1, x2, y2, seg, j) {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / seg));
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / n, jj = i ? j : j * 0.4;
      out.push([x1 + (x2 - x1) * t + this.r(-jj, jj), y1 + (y2 - y1) * t + this.r(-jj, jj)]);
    }
    return out;
  },
  rectPts(x, y, w, h, j, seg) {
    seg = seg || Math.max(6, Math.min(24, Math.min(w, h) / 2.5));
    return [
      ...this.segPts(x, y, x + w, y, seg, j),
      ...this.segPts(x + w, y, x + w, y + h, seg, j),
      ...this.segPts(x + w, y + h, x, y + h, seg, j),
      ...this.segPts(x, y + h, x, y, seg, j),
    ];
  },
  polyPts(pts, j, seg) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      out.push(...this.segPts(a[0], a[1], b[0], b[1], seg, j));
    }
    return out;
  },

  wash(ctx, b, amt) {
    const [x, y, w, h] = b;
    const n = Math.round(Math.min(70, Math.max(2, (w * h / 1400) * amt)));
    const m = Math.max(6, Math.min(w, h));
    for (let i = 0; i < n; i++) {
      const px = x + this.r(0, w), py = y + this.r(0, h);
      const rad = this.r(0.25, 0.7) * m;
      const dark = this.rnd() < 0.55;
      const c = dark ? '80,50,25' : '255,252,235';
      const a = dark ? this.r(0.04, 0.1) : this.r(0.06, 0.15);
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(${c},${a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
  },
  paint(ctx, p, b, o) {
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(p); }
    if (o.tex) {
      ctx.save(); ctx.clip(p);
      this.wash(ctx, b, o.tex);
      if (o.shade !== false) {
        const g = ctx.createLinearGradient(0, b[1], 0, b[1] + b[3]);
        g.addColorStop(0, 'rgba(255,250,235,0.12)');
        g.addColorStop(0.55, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(60,35,20,0.16)');
        ctx.fillStyle = g; ctx.fillRect(b[0], b[1], b[2], b[3]);
      }
      ctx.restore();
    }
    if (o.stroke !== null) {
      const lw = o.lw || 2.2;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = o.stroke || INK; ctx.lineWidth = lw;
      ctx.stroke(p);
      if (lw >= 1.6) {
        ctx.save(); ctx.globalAlpha *= 0.3; ctx.translate(0.7, 0.5);
        ctx.lineWidth = lw * 0.5; ctx.stroke(p); ctx.restore();
      }
    }
  },
  outline(ctx, p, lw) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = lw || 2.2; ctx.stroke(p);
  },

  ellipse(ctx, cx, cy, rx, ry, o = {}) {
    const pts = this.ellipsePts(cx, cy, rx, ry, o.wob ?? 0.035, o.rot || 0);
    const p = this.smooth(pts, true);
    this.paint(ctx, p, this.bounds(pts), o);
    return p;
  },
  rect(ctx, x, y, w, h, o = {}) {
    const pts = this.rectPts(x, y, w, h, o.j ?? 1.1, o.seg);
    const p = o.sharp ? this.straight(pts, true) : this.smooth(pts, true);
    this.paint(ctx, p, [x, y, w, h], o);
    return p;
  },
  poly(ctx, pts, o = {}) {
    const q = this.polyPts(pts, o.j ?? 1.1, o.seg || 14);
    const p = o.smooth ? this.smooth(q, true) : this.straight(q, true);
    this.paint(ctx, p, this.bounds(q), o);
    return p;
  },
  line(ctx, x1, y1, x2, y2, o = {}) {
    const q = this.segPts(x1, y1, x2, y2, o.seg || 12, o.j ?? 0.8);
    q.push([x2, y2]);
    this.strokeOpen(ctx, q, o);
  },
  curve(ctx, pts, o = {}) {
    const j = o.j ?? 0.5;
    const q = pts.map(([x, y], i) => (i === 0 || i === pts.length - 1) ? [x, y] : [x + this.r(-j, j), y + this.r(-j, j)]);
    this.strokeOpen(ctx, q, o);
  },
  strokeOpen(ctx, q, o) {
    const p = this.smooth(q, false);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.outline) { ctx.strokeStyle = INK; ctx.lineWidth = (o.lw || 2) + o.outline * 2; ctx.stroke(p); }
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.strokeStyle = o.color || INK; ctx.lineWidth = o.lw || 2;
    ctx.stroke(p);
    ctx.restore();
  },
  dot(ctx, x, y, r, col) {
    ctx.fillStyle = col || INK; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  },
  shadow(ctx, x, y, rx, ry, a) {
    ctx.fillStyle = `rgba(45,60,25,${a ?? 0.2})`;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  },
};

/* Готовые спрайты: рисуем один раз в offscreen-canvas с запасом по разрешению */
function makeSprite(w, h, ox, oy, fn, ss = 2) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
  const x = c.getContext('2d');
  x.scale(ss, ss); x.translate(ox, oy);
  fn(x);
  return { c, w, h, ox, oy };
}
function blit(ctx, s, x, y, flip, sx = 1, sy = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -sx : sx, sy);
  ctx.drawImage(s.c, -s.ox, -s.oy, s.w, s.h);
  ctx.restore();
}
