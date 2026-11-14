'use strict';
/* Персонажи, животные, овощи. Все рисуются от точки «ноги» (0,0), смотрят вправо. */
const PAL = {
  skin: '#f8d3b6', cheek: 'rgba(236,116,116,0.42)', boot: '#7b4f33',
  wood: '#a8744b', woodL: '#c99a6c', woodD: '#7d5235', gate: '#e3c391', picket: '#f1e8d4',
  dirt: '#d6b78e', dirtD: '#b88f66', soil: '#8a5c3c', soilD: '#6e4630',
  barn: '#c65b4c', roof: '#5b4b4c', white: '#f6f1e6', hay: '#e8c66a', hayD: '#c9a24a',
  leaf: '#7fae55', leafD: '#5f8f3e', leafL: '#a3cb72',
};

const KIDS = {
  girl: { name: 'Айлин', shirt: '#f4a5bb', over: '#5b8cc9', overD: '#476fa6', hair: '#3f2b22' },
  boy: { name: 'Миша', shirt: '#f3cf5e', over: '#4f7fbf', overD: '#3f669e', hair: '#8b5a33', cap: '#d9574f', capD: '#b5443e' },
};

function eye(ctx, x, y, s = 1) {
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y, 1.7 * s, 2.3 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 0.5 * s, y - 0.8 * s, 0.6 * s, 0, Math.PI * 2); ctx.fill();
}
function eyeOnDark(ctx, x, y, s = 1) {
  Sk.ellipse(ctx, x, y, 2.4 * s, 2.8 * s, { fill: '#fff', stroke: null });
  eye(ctx, x + 0.4 * s, y + 0.2 * s, s * 0.85);
}
function limb(ctx, x1, y1, x2, y2, col, w) {
  const p = new Path2D(); p.moveTo(x1, y1); p.lineTo(x2, y2);
  ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = w + 3.2; ctx.stroke(p);
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(p);
}

/* ---------------- Ребёнок в комбинезоне ---------------- */
function drawKid(ctx, x, y, o) {
  const K = KIDS[o.gender] || KIDS.girl, boy = o.gender === 'boy';
  const t = o.t || 0, walk = !!o.walk;
  const ph = walk ? Math.sin(t * 12) : 0;
  const bob = walk ? Math.abs(Math.cos(t * 12)) * 2.2 : Math.sin(t * 2.4) * 0.6;
  const wave = o.wave ? Math.sin(t * 7) : null;
  Sk.seed(300 + (Math.floor(t * 4) % 3));
  ctx.save(); ctx.translate(x, y);
  if (!o.noShadow) Sk.shadow(ctx, 0, 0, 15, 4.5, 0.22);
  ctx.scale(o.dir || 1, 1); ctx.translate(0, -bob);

  // дальняя рука
  limb(ctx, -9, -45, -13 - ph * 4, -30, K.shirt, 4.6);
  Sk.ellipse(ctx, -13 - ph * 4, -29, 3.3, 3.3, { fill: PAL.skin, lw: 1.8 });
  // ноги
  for (const [lx, s] of [[-5.5, -1], [5.5, 1]]) {
    const sw = ph * 4.5 * s;
    Sk.rect(ctx, lx - 4.5 + sw * 0.4, -25, 9, 20, { fill: K.over, lw: 2, seg: 7, j: 0.5 });
    Sk.ellipse(ctx, lx + 1.8 + sw, -4, 6.8, 4, { fill: PAL.boot, lw: 2 });
  }
  // туловище: рубашка + комбинезон
  Sk.rect(ctx, -11.5, -51, 23, 18, { fill: K.shirt, lw: 2.2, seg: 8, j: 0.6 });
  Sk.rect(ctx, -12.5, -36, 25, 15, { fill: K.over, lw: 2.2, seg: 8, j: 0.6, tex: 0.5 });
  Sk.rect(ctx, -8, -47, 16, 13, { fill: K.over, lw: 2, seg: 6, j: 0.5 });
  limb(ctx, -6.5, -46, -9.5, -51, K.over, 2.6);
  limb(ctx, 6.5, -46, 9.5, -51, K.over, 2.6);
  Sk.dot(ctx, -5.2, -44.3, 1.6, '#f2c84b'); Sk.dot(ctx, 5.2, -44.3, 1.6, '#f2c84b');
  Sk.rect(ctx, -3.5, -42.5, 7, 5.5, { stroke: K.overD, lw: 1.3, j: 0.3, seg: 4 });
  // ближняя рука
  if (wave !== null) {
    const hx = 25 + wave * 4, hy = -70;
    limb(ctx, 9, -46, hx, hy, K.shirt, 4.6);
    Sk.ellipse(ctx, hx, hy - 1, 3.6, 3.6, { fill: PAL.skin, lw: 1.8 });
  } else {
    limb(ctx, 9, -45, 13 + ph * 4, -30, K.shirt, 4.6);
    Sk.ellipse(ctx, 13 + ph * 4, -29, 3.4, 3.4, { fill: PAL.skin, lw: 1.8 });
  }
  // голова
  if (!boy) {
    Sk.ellipse(ctx, -17, -60, 5.5, 8.5, { fill: K.hair, lw: 2, rot: 0.3 });
    Sk.ellipse(ctx, 17, -60, 5.5, 8.5, { fill: K.hair, lw: 2, rot: -0.3 });
    Sk.ellipse(ctx, -15, -66, 2.6, 2.6, { fill: '#ff7fa8', lw: 1.5 });
    Sk.ellipse(ctx, 15, -66, 2.6, 2.6, { fill: '#ff7fa8', lw: 1.5 });
  } else {
    Sk.ellipse(ctx, -14, -63, 5, 6, { fill: K.hair, lw: 1.8 });
  }
  Sk.ellipse(ctx, 0, -67, 16.5, 15.5, { fill: PAL.skin, lw: 2.3, tex: 0.4, shade: false });
  if (!boy) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 + i / 10); pts.push([Math.cos(a) * 17.5, -67 + Math.sin(a) * 16.8]); }
    pts.push([14, -70], [11, -75], [7, -71], [3, -76], [-1, -71], [-5, -76], [-9, -71], [-13, -73], [-16, -64]);
    Sk.poly(ctx, pts, { fill: K.hair, lw: 2.1, smooth: true, j: 0.3, seg: 6 });
  } else {
    // чёлка из-под кепки
    Sk.ellipse(ctx, -9, -70, 6, 4, { fill: K.hair, lw: 1.6 });
    Sk.ellipse(ctx, -1, -71, 6, 4, { fill: K.hair, lw: 1.6 });
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 + i / 10); pts.push([Math.cos(a) * 17.8, -71 + Math.sin(a) * 14]); }
    Sk.poly(ctx, pts, { fill: K.cap, lw: 2.1, smooth: true, j: 0.3, seg: 6, tex: 0.5 });
    Sk.ellipse(ctx, 15, -71.5, 11, 3.4, { fill: K.capD, lw: 1.9 });
    Sk.dot(ctx, 0, -84.5, 2, K.capD);
  }
  // лицо, повёрнуто в сторону движения
  const fx = 3;
  const blink = (t % 3.7) < 0.13;
  if (blink) {
    Sk.line(ctx, fx - 8, -64, fx - 4, -64, { lw: 1.6 });
    Sk.line(ctx, fx + 4, -64, fx + 8, -64, { lw: 1.6 });
  } else { eye(ctx, fx - 6, -64.5); eye(ctx, fx + 6, -64.5); }
  Sk.ellipse(ctx, fx - 9.5, -59, 3.2, 2.1, { fill: PAL.cheek, stroke: null });
  Sk.ellipse(ctx, fx + 8.5, -59, 3.2, 2.1, { fill: PAL.cheek, stroke: null });
  Sk.dot(ctx, fx + 0.5, -60.5, 1.1, 'rgba(190,110,90,0.8)');
  if (o.talk) Sk.ellipse(ctx, fx, -56.3, 3.6, 2.9, { fill: '#b4443f', lw: 1.6 });
  else Sk.curve(ctx, [[fx - 4, -58], [fx, -55.3], [fx + 4, -58]], { lw: 1.7, j: 0.1 });
  ctx.restore();
}

/* ---------------- Животные ---------------- */
function legs(ctx, xs, top, len, w, col, hoof) {
  for (const lx of xs) {
    Sk.rect(ctx, lx - w / 2, top, w, len, { fill: col, lw: 2, seg: Math.max(5, w), j: 0.5 });
    if (hoof) Sk.rect(ctx, lx - w / 2 - 0.5, -4, w + 1, 4, { fill: hoof, lw: 1.8, seg: 4, j: 0.3 });
  }
}

const ANIMALS = {
  sheep: {
    w: 70, h: 56, ox: 30, oy: 52, speed: 26, hop: 2.5,
    variants: [
      { wool: '#f7f3ea', face: '#3f3633', dark: true },
      { wool: '#efe2c4', face: '#f0dcc8' },
      { wool: '#d3cbc3', face: '#3f3633', dark: true },
      { wool: '#6a605a', face: '#2f2826', dark: true },
    ],
    draw(ctx, c) {
      legs(ctx, [-15, -7, 8, 16], -18, 18, 5, c.dark ? c.face : '#c9b6a3', null);
      const B = [];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B.push([Math.cos(a) * 19, -29 + Math.sin(a) * 10.5, Sk.r(8, 10.5)]); }
      for (const [x, y, r] of B) Sk.ellipse(ctx, x, y, r, r, { fill: c.wool, lw: 2.3 });
      for (const [x, y, r] of B) Sk.ellipse(ctx, x, y, r - 2.4, r - 2.4, { fill: c.wool, stroke: null });
      Sk.ellipse(ctx, 0, -29, 19, 10.5, { fill: c.wool, stroke: null, tex: 1.5 });
      ctx.strokeStyle = 'rgba(59,46,41,0.3)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(Sk.r(-16, 12), Sk.r(-36, -22), 2.6, 0.4, 2.8); ctx.stroke(); }
      Sk.ellipse(ctx, 21, -37, 6, 2.8, { fill: c.face, lw: 1.8, rot: -0.5 });
      Sk.ellipse(ctx, 26, -31, 7.5, 9.5, { fill: c.face, lw: 2.2, rot: 0.25 });
      Sk.ellipse(ctx, 32, -38, 6, 2.6, { fill: c.face, lw: 1.8, rot: 0.5 });
      for (const [x, y] of [[21, -40], [25.5, -42.5], [30, -40.5]]) Sk.ellipse(ctx, x, y, 4.2, 4.2, { fill: c.wool, lw: 1.6 });
      if (c.dark) eyeOnDark(ctx, 29, -32, 0.9); else eye(ctx, 29, -32, 0.9);
    },
  },
  goat: {
    w: 66, h: 74, ox: 28, oy: 70, speed: 36, hop: 3,
    variants: [
      { body: '#f4efe4', horn: '#cbb89a' },
      { body: '#a8743f', patch: '#f4efe4', horn: '#d8c7a6' },
      { body: '#8e8782', horn: '#d8c7a6', head: '#5b5450' },
      { body: '#3f3836', patch: '#f4efe4', horn: '#cbb89a' },
    ],
    draw(ctx, c) {
      legs(ctx, [-14, -7, 8, 14], -24, 24, 5, c.body, '#4b3b33');
      Sk.ellipse(ctx, -20, -39, 3, 5.5, { fill: c.body, lw: 1.8, rot: -0.6 });
      Sk.poly(ctx, [[12, -38], [19, -52], [27, -48], [20, -30]], { fill: c.head || c.body, lw: 2.2, smooth: true, seg: 6 });
      const b = Sk.ellipse(ctx, 0, -31, 20, 11.5, { fill: c.body, lw: 2.3, tex: 1 });
      if (c.patch) {
        ctx.save(); ctx.clip(b);
        Sk.ellipse(ctx, -9, -30, 10, 9, { fill: c.patch, stroke: null });
        Sk.ellipse(ctx, 9, -23, 7, 6, { fill: c.patch, stroke: null });
        ctx.restore(); Sk.outline(ctx, b, 2.3);
      }
      Sk.curve(ctx, [[21, -55], [18, -62], [12, -64]], { lw: 3, color: c.horn, outline: 1.1 });
      Sk.ellipse(ctx, 16, -51, 6, 2.4, { fill: c.head || c.body, lw: 1.8, rot: 0.35 });
      Sk.poly(ctx, [[27, -43], [30, -35], [25, -41]], { fill: c.patch || '#d9d0c4', lw: 1.6, j: 0.3, seg: 4 });
      Sk.ellipse(ctx, 23, -50, 7, 7.5, { fill: c.head || c.body, lw: 2.2 });
      Sk.ellipse(ctx, 29, -46, 5.5, 4.5, { fill: c.head || c.body, lw: 2.1, rot: 0.5 });
      Sk.dot(ctx, 32, -46.5, 0.9);
      if (c.body === '#3f3836' || c.head) eyeOnDark(ctx, 25, -52, 0.85); else eye(ctx, 25, -52, 0.85);
    },
  },
  pig: {
    w: 66, h: 50, ox: 30, oy: 46, speed: 22, hop: 2,
    variants: [
      { body: '#f3b5b0', snout: '#e8928e', dark: '#d98681' },
      { body: '#f3b5b0', snout: '#e8928e', dark: '#d98681', spot: '#5a4440' },
      { body: '#c48d6c', snout: '#a8705a', dark: '#8f5b47' },
    ],
    draw(ctx, c) {
      legs(ctx, [-14, -6, 8, 15], -12, 12, 6, c.body, c.dark);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(-26, -26, 3, 0.2, 5.4); ctx.stroke();
      Sk.poly(ctx, [[12, -33], [15, -42], [20, -33]], { fill: c.dark, lw: 1.8, seg: 4, j: 0.3 });
      const b = Sk.ellipse(ctx, 0, -22, 24, 15, { fill: c.body, lw: 2.4, tex: 1 });
      ctx.save(); ctx.clip(b);
      if (c.spot) { Sk.ellipse(ctx, -9, -27, 8, 6, { fill: c.spot, stroke: null }); Sk.ellipse(ctx, 6, -14, 6, 4, { fill: c.spot, stroke: null }); }
      if (c.mud) for (let i = 0; i < 6; i++) Sk.ellipse(ctx, Sk.r(-20, 18), Sk.r(-18, -8), Sk.r(3, 7), Sk.r(2, 4), { fill: 'rgba(110,74,45,0.85)', stroke: null });
      ctx.restore(); Sk.outline(ctx, b, 2.4);
      Sk.ellipse(ctx, 17, -17, 3.5, 2.2, { fill: PAL.cheek, stroke: null });
      Sk.ellipse(ctx, 24.5, -21, 5, 6.5, { fill: c.snout, lw: 2 });
      Sk.dot(ctx, 24.5, -23.3, 1.1); Sk.dot(ctx, 24.5, -18.7, 1.1);
      Sk.poly(ctx, [[13, -31], [22, -40], [22, -29]], { fill: c.body, lw: 1.8, seg: 4, j: 0.3 });
      eye(ctx, 16.5, -25.5, 0.85);
    },
  },
  chicken: {
    w: 38, h: 36, ox: 16, oy: 33, speed: 40, hop: 2.5,
    variants: [
      { body: '#fbf7ee', wing: '#ece4d4' },
      { body: '#c97e3f', wing: '#a9622b' },
      { body: '#46403c', wing: '#2f2a27', dark: true },
      { body: '#e9d6b4', wing: '#c9a679' },
    ],
    draw(ctx, c) {
      Sk.line(ctx, -2, -6, -3, 0, { lw: 1.8, color: '#e39a35', seg: 4 });
      Sk.line(ctx, 3, -6, 4, 0, { lw: 1.8, color: '#e39a35', seg: 4 });
      Sk.line(ctx, -5, 0, 0, 0, { lw: 1.6, color: '#e39a35', seg: 4 });
      Sk.line(ctx, 1, 0, 7, 0, { lw: 1.6, color: '#e39a35', seg: 4 });
      Sk.poly(ctx, [[-6, -15], [-15, -29], [-11, -16], [-16, -22], [-8, -10]], { fill: c.wing, lw: 1.8, seg: 5, j: 0.3 });
      Sk.ellipse(ctx, 0, -13, 10.5, 8.5, { fill: c.body, lw: 2.1, tex: 0.8 });
      Sk.ellipse(ctx, -1, -13, 6, 3.8, { fill: c.wing, lw: 1.6, rot: 0.25 });
      Sk.ellipse(ctx, 5, -28, 2, 2.6, { fill: '#e04b3f', lw: 1.3 });
      Sk.ellipse(ctx, 8, -28.5, 2, 2.6, { fill: '#e04b3f', lw: 1.3 });
      Sk.ellipse(ctx, 7, -22, 5.5, 5.5, { fill: c.body, lw: 2 });
      Sk.poly(ctx, [[11.5, -23.5], [15.5, -22], [11.5, -20.5]], { fill: '#f2a93b', lw: 1.3, seg: 4, j: 0.2 });
      Sk.ellipse(ctx, 11, -18.5, 1.6, 2.4, { fill: '#e04b3f', lw: 1.1 });
      if (c.dark) eyeOnDark(ctx, 8.5, -23, 0.7); else eye(ctx, 8.5, -23, 0.75);
    },
  },
  rabbit: {
    w: 40, h: 44, ox: 18, oy: 41, speed: 0, hop: 3,
    variants: [
      { fur: '#f8f4ec', inner: '#f2b3b5' },
      { fur: '#a9a39d', inner: '#e9a9ab' },
      { fur: '#b88a5f', inner: '#efb1a6' },
      { fur: '#4a4340', inner: '#d99597', dark: true },
    ],
    draw(ctx, c) {
      Sk.ellipse(ctx, 5, -30, 2.8, 8.5, { fill: c.fur, lw: 1.7, rot: -0.25 });
      Sk.ellipse(ctx, -11, -11, 4.2, 4.2, { fill: '#fdfbf6', lw: 1.6 });
      Sk.ellipse(ctx, 0, -10, 11, 9, { fill: c.fur, lw: 2.1, tex: 0.8 });
      Sk.ellipse(ctx, -2, -2.5, 7, 3, { fill: c.fur, lw: 1.7 });
      Sk.ellipse(ctx, 9, -17, 7, 6.5, { fill: c.fur, lw: 2 });
      Sk.ellipse(ctx, 10, -31, 2.8, 8.5, { fill: c.fur, lw: 1.7, rot: 0.15 });
      Sk.ellipse(ctx, 10.2, -31, 1.2, 6, { fill: c.inner, stroke: null, rot: 0.15 });
      Sk.dot(ctx, 15.6, -16, 1.2, '#e58a95');
      if (c.dark) eyeOnDark(ctx, 11, -18.5, 0.7); else eye(ctx, 11, -18.5, 0.75);
    },
  },
  cow: {
    w: 120, h: 96, ox: 48, oy: 90, speed: 18, hop: 1.5,
    variants: [
      { body: '#f7f3ea', spot: '#2f2a28' },
      { body: '#f7f3ea', spot: '#8a5634' },
      { body: '#a06b45' },
      { body: '#38312e', spot: '#f7f3ea', head: '#38312e', dark: true },
    ],
    draw(ctx, c) {
      legs(ctx, [-25, -14, 13, 24], -32, 32, 8, c.body, '#3d3330');
      Sk.curve(ctx, [[-33, -56], [-38, -44], [-37, -28]], { lw: 2.5 });
      Sk.ellipse(ctx, -37, -26, 3, 4.5, { fill: c.spot || INK, lw: 1.5 });
      const b = Sk.rect(ctx, -35, -66, 70, 38, { fill: c.body, lw: 2.5, seg: 16, j: 1.2, tex: 1 });
      if (c.spot) {
        ctx.save(); ctx.clip(b);
        Sk.ellipse(ctx, -20, -56, 11, 9, { fill: c.spot, stroke: null });
        Sk.ellipse(ctx, 8, -44, 12, 8, { fill: c.spot, stroke: null });
        Sk.ellipse(ctx, 26, -62, 7, 6, { fill: c.spot, stroke: null });
        ctx.restore(); Sk.outline(ctx, b, 2.5);
      }
      Sk.ellipse(ctx, -6, -27, 7, 4, { fill: '#f1aeb0', lw: 1.8 });
      Sk.ellipse(ctx, 31, -70, 8, 3.6, { fill: c.head || c.body, lw: 1.8, rot: -0.3 });
      Sk.ellipse(ctx, 55, -70, 8, 3.6, { fill: c.head || c.body, lw: 1.8, rot: 0.3 });
      Sk.curve(ctx, [[37, -76], [35, -82], [38, -86]], { lw: 3, color: '#efe3c8', outline: 1 });
      Sk.curve(ctx, [[49, -76], [51, -82], [48, -86]], { lw: 3, color: '#efe3c8', outline: 1 });
      Sk.ellipse(ctx, 43, -64, 12, 14, { fill: c.head || c.body, lw: 2.3, tex: 0.6 });
      if (c.spot && !c.dark) Sk.ellipse(ctx, 38, -68, 4.5, 5.5, { fill: c.spot, stroke: null });
      if (c.dark) Sk.ellipse(ctx, 43, -70, 3, 6, { fill: '#f7f3ea', stroke: null });
      Sk.ellipse(ctx, 43, -53, 10, 7, { fill: '#f3b9b5', lw: 2.1 });
      Sk.dot(ctx, 39.5, -53, 1.3); Sk.dot(ctx, 46.5, -53, 1.3);
      if (c.dark) { eyeOnDark(ctx, 38, -65, 0.95); eyeOnDark(ctx, 48, -65, 0.95); }
      else { eye(ctx, 38, -65, 0.95); eye(ctx, 48, -65, 0.95); }
    },
  },
  horse: {
    w: 120, h: 116, ox: 46, oy: 110, speed: 20, hop: 1.5,
    variants: [
      { body: '#b0693a', mane: '#5b3420', blaze: true },
      { body: '#3d3532', mane: '#1f1a17', dark: true },
      { body: '#eee7dc', mane: '#c9bba7' },
      { body: '#d9b26a', mane: '#f6eedb', blaze: true },
    ],
    draw(ctx, c) {
      legs(ctx, [-24, -15, 14, 23], -46, 46, 7, c.body, '#3a302c');
      Sk.curve(ctx, [[-30, -60], [-40, -46], [-37, -24]], { lw: 8, color: c.mane, outline: 1.2 });
      Sk.poly(ctx, [[16, -62], [29, -94], [42, -89], [33, -52]], { fill: c.body, lw: 2.3, smooth: true, j: 0.6, seg: 8 });
      Sk.ellipse(ctx, 0, -56, 32, 15, { fill: c.body, lw: 2.5, tex: 1 });
      Sk.poly(ctx, [[34, -95], [36, -104], [40, -94]], { fill: c.body, lw: 1.8, j: 0.3, seg: 4 });
      Sk.ellipse(ctx, 46, -82, 16, 8, { fill: c.body, lw: 2.3, rot: 0.65, tex: 0.5 });
      Sk.ellipse(ctx, 55, -73, 6.5, 5.5, { fill: c.dark ? '#2a2422' : 'rgba(90,60,45,0.55)', lw: 2, rot: 0.6 });
      Sk.dot(ctx, 57.5, -72, 1.2);
      if (c.blaze) Sk.curve(ctx, [[47, -88], [53, -79]], { lw: 3, color: '#f6f1e8' });
      Sk.curve(ctx, [[33, -98], [28, -88], [23, -76], [17, -64]], { lw: 6.5, color: c.mane, outline: 1.1 });
      Sk.curve(ctx, [[36, -96], [41, -90]], { lw: 4, color: c.mane, outline: 1 });
      if (c.dark) eyeOnDark(ctx, 43, -85, 0.9); else eye(ctx, 43, -85, 0.9);
    },
  },
};

const ANIMAL_SPRITES = {};
function animalSprite(kind, vi, extra) {
  const key = kind + vi + (extra ? JSON.stringify(extra) : '');
  if (ANIMAL_SPRITES[key]) return ANIMAL_SPRITES[key];
  const A = ANIMALS[kind];
  const c = Object.assign({}, A.variants[vi % A.variants.length], extra || {});
  Sk.seed(kind.length * 97 + vi * 13);
  return (ANIMAL_SPRITES[key] = makeSprite(A.w, A.h, A.ox, A.oy, (x) => A.draw(x, c), 2.5));
}

/* ---------------- Овощи ---------------- */
function drawCarrot(ctx, x, y, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  for (const i of [-1, 0, 1]) Sk.curve(ctx, [[0, -10], [i * 4, -17], [i * 7, -24]], { lw: 3, color: PAL.leaf, outline: 0.8 });
  Sk.poly(ctx, [[-5.5, -10], [5.5, -10], [1.2, 15], [-1.2, 15]], { fill: '#ef8a32', lw: 1.8, smooth: true, seg: 4, j: 0.3, tex: 0.5 });
  for (const yy of [-3, 3, 8]) Sk.line(ctx, -3, yy, 0, yy + 1, { lw: 1, alpha: 0.6, seg: 4 });
  ctx.restore();
}
function drawCabbage(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  Sk.ellipse(ctx, -9, -6, 9, 6, { fill: PAL.leaf, lw: 1.8, rot: -0.4 });
  Sk.ellipse(ctx, 9, -6, 9, 6, { fill: PAL.leaf, lw: 1.8, rot: 0.4 });
  Sk.ellipse(ctx, 0, -11, 10, 9, { fill: '#b9dc8a', lw: 2, tex: 0.6 });
  Sk.curve(ctx, [[-4, -18], [0, -11], [5, -15]], { lw: 1.2, alpha: 0.5 });
  ctx.restore();
}
function drawBeet(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const i of [-1, 0, 1]) {
    Sk.ellipse(ctx, i * 6, -16, 4, 7, { fill: '#6f9c49', lw: 1.5, rot: i * 0.5 });
    Sk.line(ctx, 0, -6, i * 5, -13, { lw: 1.4, color: '#b33a5b', seg: 4 });
  }
  Sk.ellipse(ctx, 0, -3, 7, 6, { fill: '#8d3a6a', lw: 1.8, tex: 0.5 });
  ctx.restore();
}
function drawTomato(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  Sk.ellipse(ctx, 0, 0, 8, 7, { fill: '#e2483c', lw: 1.8, tex: 0.6 });
  Sk.poly(ctx, [[-4, -6], [0, -9], [4, -6], [0, -5]], { fill: PAL.leafD, lw: 1.2, seg: 3, j: 0.2 });
  Sk.dot(ctx, -3, -2, 1.5, 'rgba(255,255,255,0.6)');
  ctx.restore();
}
function drawHayIcon(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  Sk.rect(ctx, -14, -18, 28, 18, { fill: PAL.hay, lw: 1.8, seg: 7, tex: 1 });
  Sk.line(ctx, -6, -18, -6, 0, { lw: 1.6, color: '#9a6b3a', seg: 6 });
  Sk.line(ctx, 6, -18, 6, 0, { lw: 1.6, color: '#9a6b3a', seg: 6 });
  ctx.restore();
}
