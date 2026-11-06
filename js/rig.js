'use strict';
/* Перекладка (cut-out): героиня собирается из частей, конечности поворачиваются вокруг шарниров.
   Координаты — «пиксели рига» исходной картинки (вид сбоку: side.png, рост 602; спереди/сзади: рост 464).
   Числа для вида сбоку подобраны в tools/rig_preview.py. */
const RIGS = {
  girl: {
    side: {
      H: 602, root: [120, 602],
      parts: {
        torso: { img: 'torso_side', s: 1.0, tl: [0, 226], piv: [120, 452] },
        head: { img: 'head_side_r', s: 1.14, tl: [4, 6], piv: [150, 236] },
        // cap — радиус «шапки сустава» (в пикселях картинки) = полуширина конечности на уровне шарнира
        arm: { img: 'arm', s: 1.36, tl: [78, 256], piv: [121.5, 286], cap: 21 },
        // на картинке ботинок смотрит носком влево — отражаем, чтобы носок смотрел туда же, куда лицо
        leg: { img: 'leg_side', s: 0.86, tl: [86, 445], piv: [122.6, 470.4], flip: true, cap: 29.5 },
      },
    },
    front: {
      H: 464, root: [121, 464],
      parts: {
        upper: { img: 'upper_front', s: 1, tl: [0, 0], piv: [121, 330] },
        legL: { img: 'leg_front_l', s: 1, tl: [28, 318], piv: [75, 322] },
        legR: { img: 'leg_front_r', s: 1, tl: [118, 318], piv: [163, 322] },
      },
    },
    back: {
      H: 461, root: [116, 461],
      parts: {
        upper: { img: 'upper_back', s: 1, tl: [0, 0], piv: [116, 330] },
        legL: { img: 'leg_back_l', s: 1, tl: [28, 318], piv: [75, 322] },
        legR: { img: 'leg_back_r', s: 1, tl: [118, 318], piv: [163, 322] },
      },
    },
  },
};
const RIG_FILES = ['torso_side', 'head_side_r', 'arm', 'leg_side', 'upper_front', 'leg_front_l', 'leg_front_r',
  'upper_back', 'leg_back_l', 'leg_back_r'];

function rigReady(gender) { return gender === 'girl' && RIG_FILES.every((f) => IMG['girl/rig/' + f]); }

/* Шапка сустава: верх конечности обрезается по кругу (центр — шарнир, радиус — полуширина конечности),
   круг заполнен текстурой самой конечности (отражённой от линии шарнира) и обведён контуром.
   Круг одинаков при любом повороте — поэтому шов между конечностью и телом не виден. */
function cappedImage(im, px, py, r) {
  const c = document.createElement('canvas');
  c.width = im.width; c.height = Math.max(im.height, Math.ceil(py + r));
  const x = c.getContext('2d');
  x.save(); x.beginPath(); x.rect(0, py, c.width, c.height - py); x.clip(); x.drawImage(im, 0, 0); x.restore();
  x.save(); x.beginPath(); x.arc(px, py, r, Math.PI, 2 * Math.PI); x.closePath(); x.clip();
  x.translate(0, 2 * py); x.scale(1, -1); x.drawImage(im, 0, 0);       // текстура ниже шарнира, отражённая вверх
  x.restore();
  const lw = Math.max(2, r * 0.13);
  x.beginPath(); x.arc(px, py, r - lw / 2, Math.PI * 1.02, Math.PI * 1.98);
  x.strokeStyle = 'rgba(58,40,34,0.95)'; x.lineWidth = lw; x.lineCap = 'round'; x.stroke();
  return c;
}

/* Части, заранее уменьшенные под нужный размер (ступенчато, без ряби); shade — затемнение дальних частей */
const _rigCache = {};
function rigPart(prefix, p, k, shade) {
  const key = prefix + p.img + '@' + k.toFixed(4) + (shade || '');
  if (_rigCache[key]) return _rigCache[key];
  let im = IMG[prefix + p.img];
  if (p.cap) im = cappedImage(im, (p.piv[0] - p.tl[0]) / p.s, (p.piv[1] - p.tl[1]) / p.s, p.cap);
  const SS = 2.5;
  const w = im.width * p.s * k, h = im.height * p.s * k;
  const TW = Math.max(1, Math.round(w * SS)), TH = Math.max(1, Math.round(h * SS));
  let src = im, cw = im.width, ch = im.height;
  while (cw / 2 > TW && ch / 2 > TH) {
    const c = document.createElement('canvas'); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    src = c; cw = c.width; ch = c.height;
  }
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, TW, TH);
  if (shade) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(40,30,40,${shade})`; x.fillRect(0, 0, TW, TH); }
  return (_rigCache[key] = { c, w, h });
}

/* Рисует часть p с поворотом ang (градусы) вокруг её шарнира, со сдвигом dx,dy (в пикселях рига) */
function rigDraw(ctx, prefix, p, k, ang, dx, dy, shade) {
  const sp = rigPart(prefix, p, k, shade);
  ctx.save();
  ctx.translate((p.piv[0] + dx) * k, (p.piv[1] + dy) * k);
  if (ang) ctx.rotate(ang * Math.PI / 180);
  if (p.flip) ctx.scale(-1, 1);   // зеркально вокруг шарнира
  ctx.drawImage(sp.c, (p.tl[0] - p.piv[0]) * k, (p.tl[1] - p.piv[1]) * k, sp.w, sp.h);
  ctx.restore();
}

/* Героиня из частей. o: { h, t, walk, dir, face: side|down|up } */
function drawRigHero(ctx, x, y, o) {
  const g = o.gender + '/rig/', t = o.t, h = o.h;
  const view = o.face === 'up' ? 'back' : o.face === 'down' ? 'front' : 'side';
  const R = RIGS[o.gender][view], P = R.parts, k = h / R.H;
  const cyc = t * 2 * Math.PI * 1.9;               // ~2 шага в секунду
  const s = Math.sin(cyc);
  Sk.shadow(ctx, x, y, h * 0.2, h * 0.06, 0.22);
  ctx.save();
  ctx.translate(x, y);
  if (view === 'side' && o.dir < 0) ctx.scale(-1, 1);
  ctx.translate(-R.root[0] * k, -R.root[1] * k);

  if (view === 'side') {
    let leg = 0, arm = 0, bob = 0, nod = 0;
    if (o.walk) {
      leg = 24 * s; arm = 26 * s;
      bob = -Math.abs(Math.cos(cyc)) * 9;           // тело выше, когда ноги проходят друг под другом
      nod = Math.sin(cyc * 2) * 1.5;
    } else {
      bob = Math.sin(t * 2.4) * 2.5;               // дыхание
      arm = Math.sin(t * 1.2) * 3;
      nod = Math.sin(t * 0.9) * 1.5;
    }
    rigDraw(ctx, g, P.arm, k, arm, 0, bob, 0.12);        // дальняя рука — в противофазе к ближней
    rigDraw(ctx, g, P.leg, k, -leg, -8, 0, 0.12);         // дальняя нога
    rigDraw(ctx, g, P.torso, k, 0, 0, bob);
    rigDraw(ctx, g, P.leg, k, leg, 6, 0);                 // ближняя нога
    rigDraw(ctx, g, P.head, k, nod, 0, bob);
    rigDraw(ctx, g, P.arm, k, -arm, 0, bob);              // ближняя рука идёт назад, когда ближняя нога вперёд
  } else {
    // спереди/сзади: ноги поочерёдно приподнимаются, верх подпрыгивает
    let lL = 0, lR = 0, bob = 0, tilt = 0;
    if (o.walk) {
      lL = -Math.max(0, s) * 22; lR = -Math.max(0, -s) * 22;
      bob = -Math.abs(s) * 8; tilt = s * 2;
    } else bob = Math.sin(t * 2.4) * 2;
    rigDraw(ctx, g, P.legL, k, 0, 0, lL);
    rigDraw(ctx, g, P.legR, k, 0, 0, lR);
    rigDraw(ctx, g, P.upper, k, tilt, 0, bob);
  }
  ctx.restore();
}

/* ---------- Животные из деталей (вид сбоку, мордой влево; числа — из tools/animal_rig_preview.py) ---------- */
const ANIMAL_RIGS = {
  sheep: {
    H: 330, root: [215, 330],
    body: { img: 'sheep_body_side', s: 1, tl: [95, 52], piv: [215, 150] },
    head: { img: 'sheep_head_side', s: 1, tl: [0, 0], piv: [150, 150] },
    leg: { img: 'sheep_leg_side', s: 1, top: [31, 27], cap: 26.5 },
    hips: [[268, 198], [178, 198], [292, 205], [150, 205]],   // дальняя задняя, дальняя передняя, ближняя задняя, ближняя передняя
  },
  goat: {
    H: 350, root: [215, 340],
    body: { img: 'goat_body_side', s: 1, tl: [98, 70], piv: [215, 160] },
    head: { img: 'goat_head_side', s: 1, tl: [0, -10], piv: [160, 150] },
    leg: { img: 'goat_leg_side', s: 1, top: [33.5, 28.5], cap: 28.5 },
    hips: [[270, 212], [175, 212], [296, 218], [150, 218]],
  },
};
function animalRigFiles() {
  const out = [];
  for (const k of Object.keys(ANIMAL_RIGS)) { const R = ANIMAL_RIGS[k]; out.push(R.body.img, R.head.img, R.leg.img); }
  return out.map((f) => 'animal_parts/' + f);
}
function animalRigReady(kind) {
  const R = ANIMAL_RIGS[kind];
  return !!R && [R.body.img, R.head.img, R.leg.img].every((f) => IMG['animal_parts/' + f]);
}
/* o: { h, t, walk, dir (1 — вправо), graze 0..1 } */
function drawAnimalRig(ctx, kind, x, y, o) {
  const R = ANIMAL_RIGS[kind], k = o.h / R.H, pre = 'animal_parts/';
  const cyc = o.t * 2 * Math.PI * 1.6, s = Math.sin(cyc);
  let legs = [0, 0, 0, 0], bob = 0, head = 0;
  if (o.walk) {
    const a = 20;
    legs = [a * s, -a * s, -a * s, a * s];          // диагональные пары шагают вместе
    bob = -Math.abs(Math.cos(cyc)) * 5;
    head = Math.sin(cyc * 2) * 2;
  } else {
    bob = Math.sin(o.t * 2.2) * 1.5;               // дыхание
    head = -34 * (o.graze || 0);                   // наклон к траве
  }
  ctx.save();
  ctx.translate(x, y);
  if (o.dir > 0) ctx.scale(-1, 1);                 // детали нарисованы мордой влево
  ctx.translate(-R.root[0] * k, -R.root[1] * k);
  R.hips.forEach((hip, i) => {
    const p = { img: R.leg.img, s: 1, tl: [hip[0] - R.leg.top[0], hip[1] - R.leg.top[1]], piv: hip, cap: R.leg.cap };
    rigDraw(ctx, pre, p, k, legs[i], 0, bob * 0.3, i < 2 ? 0.14 : 0);
  });
  rigDraw(ctx, pre, R.body, k, 0, 0, bob);
  rigDraw(ctx, pre, R.head, k, head, 0, bob);
  ctx.restore();
}