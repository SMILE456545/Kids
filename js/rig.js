'use strict';
/* Перекладка (cut-out): героиня собирается из частей, конечности поворачиваются вокруг шарниров.
   Координаты — «пиксели рига» исходной картинки (вид сбоку: side.png, рост 602; спереди/сзади: рост 464).
   Числа для вида сбоку подобраны в tools/rig_preview.py. */
const RIGS = {
  girl: {
    side: {
      H: 602, root: [120, 602],
      parts: {
        torso: { img: 'torso_side', s: 1.0, tl: [0, 226], piv: [120, 452], sx: 0.9 },   // sx — туловище чуть уже
        head: { img: 'head_side_r', s: 1.14, tl: [-4, 20], piv: [146, 248] },   // шея плотно входит в воротник
        // cap — радиус «шапки сустава» (в пикселях картинки) = полуширина конечности на уровне шарнира
        arm: { img: 'arm', s: 1.36, tl: [78, 256], piv: [121.5, 286], cap: 21 },
        // согнутая в локте рука (кулак впереди) — ближняя рука, когда она что-то держит; плечо в (50,14) картинки
        armBent: { img: 'arm_bent', s: 1.2, tl: [61.5, 269.2], piv: [121.5, 286] },
        // на картинке ботинок смотрит носком влево — отражаем, чтобы носок смотрел туда же, куда лицо
        leg: { img: 'leg_side', s: 0.86, tl: [86, 445], piv: [122.6, 470.4], flip: true, cap: 29.5 },
      },
    },
    front: {
      H: 464, root: [121, 464],
      parts: {
        upper: { img: 'upper_front', s: 1, tl: [0, 0], piv: [121, 330] },
        // верх без рук ниже плеча и отдельные руки (tools/split_arms.py) — руки качаются при ходьбе
        body: { img: 'body_front_na', s: 1, tl: [0, 0], piv: [121, 330] },
        armL: { img: 'arm_front_l', s: 1, tl: [20, 203], piv: [70, 212] },
        armR: { img: 'arm_front_r', s: 1, tl: [165, 203], piv: [172, 212] },
        // те же руки, разрезанные по локтю (tools/split_elbows.py) — сгибаются, когда она держит вилы
        armLup: { img: 'arm_front_l_up', s: 1, tl: [20, 203], piv: [70, 212] },
        armLlo: { img: 'arm_front_l_lo', s: 1, tl: [20, 240], piv: [51.5, 259], cap: 17.5, hand: [-13.5, 63.3] },
        armRup: { img: 'arm_front_r_up', s: 1, tl: [165, 203], piv: [172, 212] },
        armRlo: { img: 'arm_front_r_lo', s: 1, tl: [165, 241], piv: [190.5, 259], cap: 16.5, hand: [11, 63.3] },
        legL: { img: 'leg_front_l', s: 1, tl: [28, 318], piv: [75, 322] },
        legR: { img: 'leg_front_r', s: 1, tl: [118, 318], piv: [163, 322] },
      },
    },
    back: {
      H: 461, root: [116, 461],
      parts: {
        upper: { img: 'upper_back', s: 1, tl: [0, 0], piv: [116, 330] },
        body: { img: 'body_back_na', s: 1, tl: [0, 0], piv: [116, 330] },
        armL: { img: 'arm_back_l', s: 1, tl: [21, 200], piv: [72, 210] },
        armR: { img: 'arm_back_r', s: 1, tl: [153, 200], piv: [160, 210] },
        armLup: { img: 'arm_back_l_up', s: 1, tl: [21, 200], piv: [72, 210] },
        armLlo: { img: 'arm_back_l_lo', s: 1, tl: [21, 238], piv: [52, 256], cap: 17, hand: [-9, 64] },
        armRup: { img: 'arm_back_r_up', s: 1, tl: [153, 200], piv: [160, 210] },
        armRlo: { img: 'arm_back_r_lo', s: 1, tl: [153, 238], piv: [181, 256], cap: 17, hand: [12.5, 64.3] },
        legL: { img: 'leg_back_l', s: 1, tl: [28, 318], piv: [75, 322] },
        legR: { img: 'leg_back_r', s: 1, tl: [118, 318], piv: [163, 322] },
      },
    },
  },
};
const RIG_FILES = ['torso_side', 'head_side_r', 'arm', 'leg_side', 'upper_front', 'leg_front_l', 'leg_front_r',
  'upper_back', 'leg_back_l', 'leg_back_r',
  'body_front_na', 'arm_front_l', 'arm_front_r', 'body_back_na', 'arm_back_l', 'arm_back_r', 'arm_bent',
  'arm_front_l_up', 'arm_front_l_lo', 'arm_front_r_up', 'arm_front_r_lo', 'arm_back_l_up', 'arm_back_l_lo', 'arm_back_r_up', 'arm_back_r_lo'];

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
  if (p.sx) ctx.scale(p.sx, 1);   // sx — сузить/расширить деталь по ширине (вокруг шарнира)
  ctx.drawImage(sp.c, (p.tl[0] - p.piv[0]) * k, (p.tl[1] - p.piv[1]) * k, sp.w, sp.h);
  ctx.restore();
}

/* Где кисть руки (в пикселях рига, относительно шарнира плеча) — чтобы вложить в неё предмет */
const RIG_HAND = { arm: [-12.9, 146.4], arm_bent: [8.4, 111.6], arm_front_l: [-32, 110.3], arm_front_r: [29.5, 110.3], arm_back_l: [-27.5, 122.5], arm_back_r: [33.5, 110.3] };
function rigHand(p, ang, dy, k) {
  const [hx, hy] = RIG_HAND[p.img], a = ang * Math.PI / 180;
  return [(p.piv[0] + hx * Math.cos(a) - hy * Math.sin(a)) * k, (p.piv[1] + dy + hx * Math.sin(a) + hy * Math.cos(a)) * k];
}

/* Рука из двух частей (плечо up + предплечье lo): a1 — поворот плеча, a2 — поворот предплечья (оба от вертикали).
   Возвращает { hand, drawUp, drawLo } — кисть (для предмета) и рисование частей по отдельности (для порядка слоёв). */
function bentArm(ctx, g, up, lo, k, a1, a2) {
  const rot = (v, a) => { const r = a * Math.PI / 180; return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)]; };
  const er = [lo.piv[0] - up.piv[0], lo.piv[1] - up.piv[1]], e = rot(er, a1), hd = rot(lo.hand, a2);
  return {
    hand: [(up.piv[0] + e[0] + hd[0]) * k, (up.piv[1] + e[1] + hd[1]) * k],
    drawUp: () => rigDraw(ctx, g, up, k, a1, 0, 0),
    drawLo: () => rigDraw(ctx, g, lo, k, a2, e[0] - er[0], e[1] - er[1]),
  };
}

/* Героиня из частей. o: { h, t, walk, dir, face: side|down|up, hold }
   hold(ctx, top, low, view) — рисует предмет, который она держит ДВУМЯ руками: top — кисть ближе к рабочему
   концу (зубьям), low — вторая кисть на черенке. Черенок проходит через обе кисти.
   Вызывается до ближней руки, так что кисть ложится поверх черенка. Сбоку предмет рисуется «лицом вправо». */
function drawRigHero(ctx, x, y, o) {
  const g = o.gender + '/rig/', t = o.t, h = o.h;
  // wave — машет рукой (всегда лицом к нам): правая на экране рука поднята, кисть качается из стороны в сторону
  const view = o.wave ? 'front' : o.face === 'up' ? 'back' : o.face === 'down' ? 'front' : 'side';
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
    // без предмета руки прямые и качаются; с предметом обе согнуты в локтях, кулаки у живота —
    // вилы прижаты к туловищу: черенок идёт круто вверх-вперёд от ближнего кулака
    const armFar = o.hold ? 8 + arm * 0.1 : arm, armNear = o.hold ? -18 + arm * 0.1 : -arm;
    // holdOne — предмет в одной руке (ковш): ближняя согнута, дальняя прямая и качается как обычно
    const nearArm = o.hold ? P.armBent : P.arm, farArm = o.hold && !o.holdOne ? P.armBent : P.arm;
    rigDraw(ctx, g, farArm, k, o.holdOne ? arm : armFar, 0, bob, 0.12);     // дальняя рука — в противофазе к ближней
    rigDraw(ctx, g, P.leg, k, -leg, -8, 0, 0.12);         // дальняя нога
    rigDraw(ctx, g, P.torso, k, 0, 0, bob);
    rigDraw(ctx, g, P.leg, k, leg, 6, 0);                 // ближняя нога
    rigDraw(ctx, g, P.head, k, nod, 0, bob);
    if (o.hold) {
      const top = rigHand(nearArm, armNear, bob, k), A = -40 * Math.PI / 180;   // наклон черенка: зубья с сеном впереди, не перед лицом
      o.hold(ctx, top, [top[0] - Math.cos(A) * 20 * k, top[1] - Math.sin(A) * 20 * k], 'side');
    }
    rigDraw(ctx, g, nearArm, k, armNear, 0, bob);           // ближняя рука идёт назад, когда ближняя нога вперёд
  } else {
    // спереди/сзади: ноги поочерёдно приподнимаются, верх подпрыгивает
    let lL = 0, lR = 0, bob = 0, tilt = 0, arm = 0;
    if (o.walk) {
      lL = -Math.max(0, s) * 22; lR = -Math.max(0, -s) * 22;
      bob = -Math.abs(s) * 8; tilt = s * 2;
      arm = s * 9;                                   // руки качаются в такт шагам, как маятник
    } else { bob = Math.sin(t * 2.4) * 2; arm = Math.sin(t * 1.2) * 1.5; }
    // со спины предмет в руках — перед ней: его (и предплечья) рисуем раньше ног, иначе он ложится поверх ног
    const legs = () => { ctx.save(); ctx.setTransform(legsM); rigDraw(ctx, g, P.legL, k, 0, 0, lL); rigDraw(ctx, g, P.legR, k, 0, 0, lR); ctx.restore(); };
    const legsM = ctx.getTransform();
    const backHold = o.hold && view === 'back';
    if (!backHold) legs();
    // туловище и руки наклоняются вместе (общий шарнир у пояса), руки ещё и качаются у плеча
    ctx.save();
    ctx.translate(P.body.piv[0] * k, (P.body.piv[1] + bob) * k); ctx.rotate(tilt * Math.PI / 180); ctx.translate(-P.body.piv[0] * k, -P.body.piv[1] * k);
    if (o.hold && o.holdOne) {
      // предмет в одной руке: спереди — в правой на экране (это её левая), со спины — в той же её руке (слева на экране);
      // эта рука согнута, кисть перед собой; другая рука прямая и качается
      const w = arm * 0.2;
      if (view === 'front') {
        const Rr = bentArm(ctx, g, P.armRup, P.armRlo, k, -10 + w, 60 + w);
        rigDraw(ctx, g, P.body, k, 0, 0, 0);
        rigDraw(ctx, g, P.armL, k, arm, 0, 0);
        Rr.drawUp(); o.hold(ctx, Rr.hand, Rr.hand, 'front'); Rr.drawLo();
      } else {
        const L = bentArm(ctx, g, P.armLup, P.armLlo, k, 10 + w, -60 + w);
        o.hold(ctx, L.hand, L.hand, 'back'); L.drawLo();
        legs();
        rigDraw(ctx, g, P.body, k, 0, 0, 0);
        rigDraw(ctx, g, P.armR, k, arm, 0, 0);
        L.drawUp();
      }
    } else if (o.hold) {
      // с предметом обе руки согнуты в локтях: предплечья перед животом, кулаки на черенке
      const w = arm * 0.2;
      if (view === 'front') {
        const L = bentArm(ctx, g, P.armLup, P.armLlo, k, 10 + w, -100 + w), Rr = bentArm(ctx, g, P.armRup, P.armRlo, k, -10 + w, 80 + w);
        rigDraw(ctx, g, P.body, k, 0, 0, 0);
        o.hold(ctx, L.hand, Rr.hand, 'front');           // левая (на экране) кисть выше — зубья вверх-влево
        L.drawUp(); Rr.drawUp(); L.drawLo(); Rr.drawLo();
      } else {
        // со спины кисти и вилы перед ней — их закрывает тело; видны плечи, локти и зубья над плечом
        const L = bentArm(ctx, g, P.armLup, P.armLlo, k, 10 + w, -80 + w), Rr = bentArm(ctx, g, P.armRup, P.armRlo, k, -10 + w, 100 + w);
        o.hold(ctx, Rr.hand, L.hand, 'back');
        L.drawLo(); Rr.drawLo();
        legs();
        rigDraw(ctx, g, P.body, k, 0, 0, 0);
        L.drawUp(); Rr.drawUp();
      }
    } else if (o.wave && view === 'front') {
      // плечо поднято вверх-вбок, предплечье смотрит вверх и качается (машет); вторая рука спокойно висит
      const wv = Math.sin(t * 11) * 24, up = Math.min(1, o.wave);               // o.wave 0..1 — рука поднимается/опускается плавно
      const Rr = bentArm(ctx, g, P.armRup, P.armRlo, k, -105 * up, (-150 + wv) * up);   // локоть в сторону, кисть вверх — сбоку от головы
      rigDraw(ctx, g, P.body, k, 0, 0, 0);
      rigDraw(ctx, g, P.armL, k, arm, 0, 0);
      Rr.drawUp(); Rr.drawLo();
    } else {
      rigDraw(ctx, g, P.body, k, 0, 0, 0);
      rigDraw(ctx, g, P.armL, k, arm, 0, 0);
      rigDraw(ctx, g, P.armR, k, arm, 0, 0);
    }
    ctx.restore();
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

/* ---------- Овечка из деталей (assets/animal_parts/sheep2) во всех видах: сбоку, спереди, сзади ----------
   Положения подобраны в tools/sheep2_preview.py (tools/sheep2_rig.json). Сбоку детали смотрят влево. */
const SHEEP2 = {"side":{"H":250,"root":[130,250],"order":["leg0","leg1","torso","leg2","leg3","head"],"parts":{"leg0":{"img":"leg_side_back","s":0.66,"tl":[163,180],"piv":[185,190]},"leg1":{"img":"leg_side_front","s":0.66,"tl":[92,180],"piv":[109,190]},"torso":{"img":"torso_side","s":1.0,"tl":[45,70]},"leg2":{"img":"leg_side_back","s":0.66,"tl":[150,183],"piv":[172,193]},"leg3":{"img":"leg_side_front","s":0.66,"tl":[74,183],"piv":[91,193]},"head":{"img":"head_side","s":0.72,"tl":[0,30],"piv":[70,120]}}},"front":{"H":250,"root":[100,250],"order":["leg0","leg1","torso","head"],"parts":{"leg0":{"img":"leg_front","s":0.62,"tl":[55,172],"piv":[72,178]},"leg1":{"img":"leg_front","s":0.62,"tl":[112,172],"piv":[129,178]},"torso":{"img":"torso_front","s":1.0,"tl":[37,70]},"head":{"img":"head_front","s":0.72,"tl":[28,15],"piv":[100,110]}}},"back":{"H":250,"root":[100,250],"order":["leg0","leg1","head","torso"],"parts":{"leg0":{"img":"leg_back","s":0.62,"tl":[55,174],"piv":[72,180]},"leg1":{"img":"leg_back","s":0.62,"tl":[112,174],"piv":[129,180]},"head":{"img":"head_back","s":0.72,"tl":[37,22],"piv":[100,110]},"torso":{"img":"torso_back","s":1.0,"tl":[39,70]}}}};
for (const v of Object.values(SHEEP2)) for (const p of Object.values(v.parts)) if (!p.piv) p.piv = p.tl.slice();   // у неподвижных деталей опора — угол
const SHEEP2_TOP = 18;
const GOAT2 = {"side":{"H":250,"root":[125,250],"order":["leg0","leg1","leg2","leg3","torso","head"],"parts":{"leg0":{"img":"leg_side","s":0.8,"tl":[158,168],"piv":[180,178]},"leg1":{"img":"leg_side","s":0.8,"tl":[80,168],"piv":[102,178]},"torso":{"img":"torso_side","s":1.0,"tl":[45,70]},"leg2":{"img":"leg_side","s":0.8,"tl":[146,171],"piv":[168,181]},"leg3":{"img":"leg_side","s":0.8,"tl":[66,171],"piv":[88,181]},"head":{"img":"head_side","s":0.72,"tl":[0,10],"piv":[75,105]}}},"front":{"H":250,"root":[100,250],"order":["leg0","leg1","torso","head"],"parts":{"leg0":{"img":"leg_front","s":0.8,"tl":[55,172],"piv":[73,178]},"leg1":{"img":"leg_front","s":0.8,"tl":[110,172],"piv":[128,178],"flip":true},"torso":{"img":"torso_front","s":1.0,"tl":[41,60]},"head":{"img":"head_front","s":0.72,"tl":[28,-5],"piv":[100,100]}}},"back":{"H":250,"root":[100,250],"order":["leg0","leg1","torso","head"],"parts":{"leg0":{"img":"leg_back","s":0.8,"tl":[55,172],"piv":[73,178]},"leg1":{"img":"leg_back","s":0.8,"tl":[110,172],"piv":[128,178],"flip":true},"torso":{"img":"torso_back","s":1.0,"tl":[43,62]},"head":{"img":"head_back","s":0.72,"tl":[35,-2],"piv":[100,100]}}}};
for (const v of Object.values(GOAT2)) for (const p of Object.values(v.parts)) if (!p.piv) p.piv = p.tl.slice();
const PIG2 = {"side":{"H":250,"root":[125,250],"order":["leg0","leg1","leg2","leg3","torso","head"],"parts":{"leg0":{"img":"leg_side","s":0.42,"tl":[150,190],"piv":[167,198]},"leg1":{"img":"leg_side","s":0.42,"tl":[70,190],"piv":[87,198]},"leg2":{"img":"leg_side","s":0.42,"tl":[165,195],"piv":[182,203]},"leg3":{"img":"leg_side","s":0.42,"tl":[85,195],"piv":[102,203]},"torso":{"img":"torso_side","s":0.85,"tl":[40,80],"piv":[142,88]},"head":{"img":"head_side","s":0.62,"tl":[0,72],"piv":[80,150]}}},"front":{"H":250,"root":[100,250],"order":["leg0","leg1","torso","head"],"parts":{"leg0":{"img":"leg_front","s":0.42,"tl":[58,195],"piv":[78,203]},"leg1":{"img":"leg_front","s":0.42,"tl":[104,195],"piv":[124,203],"flip":true},"torso":{"img":"torso_front","s":0.85,"tl":[9,80],"piv":[101,88]},"head":{"img":"head_front","s":0.62,"tl":[13,70],"piv":[100,78]}}},"back":{"H":250,"root":[100,250],"order":["leg0","leg1","head","torso"],"parts":{"leg0":{"img":"leg_back","s":0.42,"tl":[58,195],"piv":[76,203]},"leg1":{"img":"leg_back","s":0.42,"tl":[104,195],"piv":[122,203],"flip":true},"head":{"img":"head_back","s":0.62,"tl":[26,62],"piv":[101,70]},"torso":{"img":"torso_back","s":0.85,"tl":[18,82],"piv":[100,90]}}}};
const CHICKEN2 = {"side":{"H":250,"root":[115,250],"order":["leg0","leg1","torso","wing","head"],"parts":{"leg0":{"img":"leg_side","s":0.5,"tl":[110,194],"piv":[138,202]},"leg1":{"img":"leg_side","s":0.5,"tl":[80,196],"piv":[108,204]},"torso":{"img":"torso_side","s":0.78,"tl":[40,48],"piv":[130,56]},"wing":{"img":"wing","s":0.55,"tl":[95,94],"piv":[100,101]},"head":{"img":"head_side","s":0.55,"tl":[0,-24],"piv":[70,116]}}},"front":{"H":250,"root":[100,250],"order":["leg0","leg1","torso","head"],"parts":{"leg0":{"img":"leg_front","s":0.5,"tl":[52,194],"piv":[79,202]},"leg1":{"img":"leg_front","s":0.5,"tl":[96,194],"piv":[123,202],"flip":true},"torso":{"img":"torso_front","s":0.78,"tl":[18,48],"piv":[100,56]},"head":{"img":"head_front","s":0.55,"tl":[33,-24],"piv":[101,-16]}}},"back":{"H":250,"root":[100,250],"order":["leg0","leg1","torso","head"],"parts":{"leg0":{"img":"leg_front","s":0.5,"tl":[52,194],"piv":[79,202]},"leg1":{"img":"leg_front","s":0.5,"tl":[96,194],"piv":[123,202],"flip":true},"torso":{"img":"torso_back","s":0.78,"tl":[27,51],"piv":[100,59]},"head":{"img":"head_back","s":0.55,"tl":[45,-22],"piv":[101,-14]}}}};
const COW2 = {"side":{"H":250,"root":[135,250],"order":["leg0","leg1","tail","torso","leg2","leg3","head"],"parts":{"leg0":{"img":"leg_side","s":0.5,"tl":[198.8,155.0],"piv":[221.5,165.0],"shade":0.06},"leg1":{"img":"leg_side","s":0.5,"tl":[70.8,155.0],"piv":[93.5,165.0],"shade":0.06},"leg2":{"img":"leg_side","s":0.5,"tl":[187.8,158.0],"piv":[210.5,168.0]},"leg3":{"img":"leg_side","s":0.5,"tl":[59.8,158.0],"piv":[82.5,168.0]},"tail":{"img":"tail_side","s":0.42,"tl":[174,84],"piv":[222,88],"flip":true},"torso":{"img":"torso_side","s":0.62,"tl":[40,64]},"head":{"img":"head_side","s":0.44,"tl":[-20,46],"piv":[62,124]}}},"front":{"H":250,"root":[100,250],"order":["torso","leg0","leg1","head"],"parts":{"leg0":{"img":"leg_front","s":0.5,"tl":[20.8,158.0],"piv":[43.5,168.0]},"leg1":{"img":"leg_front","s":0.5,"tl":[132.8,158.0],"piv":[155.5,168.0],"flip":true},"torso":{"img":"torso_front","s":0.62,"tl":[13,67]},"head":{"img":"head_front","s":0.44,"tl":[29,33],"piv":[100,100],"sx":1.25}},"sx":0.8},"back":{"H":250,"root":[100,250],"order":["head","torso","leg0","leg1","tail"],"parts":{"leg0":{"img":"leg_back","s":0.5,"tl":[26.8,158.0],"piv":[49.5,168.0]},"leg1":{"img":"leg_back","s":0.5,"tl":[128.8,158.0],"piv":[151.5,168.0],"flip":true},"head":{"img":"head_back","s":0.44,"tl":[31,35],"piv":[100,90],"sx":1.25},"torso":{"img":"torso_back","s":0.62,"tl":[15,61]},"tail":{"img":"tail","s":0.4,"tl":[88,72],"piv":[96,76]}},"sx":0.8}};
for (const R of [PIG2, CHICKEN2, COW2]) for (const v of Object.values(R)) for (const p of Object.values(v.parts)) if (!p.piv) p.piv = p.tl.slice();
SHEEP2.back.order = ['leg0', 'leg1', 'torso', 'head'];   // со спины затылок поверх спины (без шва)
const RIG2 = { sheep: { R: SHEEP2, dir: 'sheep2', top: SHEEP2_TOP }, goat: { R: GOAT2, dir: 'goat2', top: 0 }, pig: { R: PIG2, dir: 'pig2', top: 65 }, chicken: { R: CHICKEN2, dir: 'chicken2', top: -24 }, cow: { R: COW2, dir: 'cow2', top: 14 } };                               // верх головы в пикселях рига (рост = H - верх)
function rig2Files(kind) { const A = RIG2[kind], s = new Set(); for (const v of Object.values(A.R)) for (const p of Object.values(v.parts)) s.add('animal_parts/' + A.dir + '/' + p.img); return [...s]; }
function sheep2Files() { return Object.keys(RIG2).flatMap(rig2Files); }
function rig2Ready(kind) { return !!RIG2[kind] && rig2Files(kind).every((f) => IMG[f]); }
function sheep2Ready() { return rig2Ready('sheep'); }
/* o: { h, t, walk, view: side|front|back, dir (1 — вправо), graze 0..1 (голова к траве / в корыто) } */
function drawSheep2(ctx, x, y, o) {
  const A = RIG2[o.kind || 'sheep'], R = A.R[o.view], P = R.parts, k = o.h / (R.H - A.top), pre = 'animal_parts/' + A.dir + '/';
  const bird = o.kind === 'chicken', speed = bird ? 2.6 : 1.6;
  const cyc = o.t * 2 * Math.PI * speed, s = Math.sin(cyc), g = o.graze || 0;
  const legs = R.order.filter((n) => n.startsWith('leg'));
  ctx.save();
  ctx.translate(x, y);
  if (o.view === 'side' && o.dir > 0) ctx.scale(-1, 1);
  if (R.sx) ctx.scale(R.sx, 1);                       // sx — сузить вид по ширине (коровка спереди/сзади ×0.8; голова — sx 1.25, чтобы осталась прежней ширины)
  ctx.translate(-R.root[0] * k, -R.root[1] * k);
  if (o.view === 'side') {
    let bob = 0, nod = 0, la = [0, 0, 0, 0];
    if (o.walk) {
      const a = bird ? 28 : 24;
      la = legs.length === 4 ? [a * s, -a * s, -a * s, a * s] : [a * s, -a * s];   // четыре — диагональными парами, две — по очереди
      bob = -Math.abs(Math.cos(cyc)) * (bird ? 8 : 6); nod = Math.sin(cyc * 2) * (bird ? 5 : 2);
    } else bob = Math.sin(o.t * 2.2) * 1.5;
    for (const n of R.order) {
      if (n.startsWith('leg')) { const i = legs.indexOf(n); rigDraw(ctx, pre, P[n], k, la[i], 0, bob * 0.3, i < legs.length / 2 ? 0.15 : 0); }
      else if (n === 'head') rigDraw(ctx, pre, P.head, k, nod - (bird ? 50 : 38) * g, 0, bob + (bird ? 30 : 14) * g);   // наклон к земле / клюёт
      else if (n === 'tail') rigDraw(ctx, pre, P.tail, k, Math.sin(o.t * (o.walk ? 4 : 1.8)) * (o.walk ? 5 : 3.5), 0, bob);   // хвост покачивается
      else if (n === 'wing') rigDraw(ctx, pre, P.wing, k, o.walk ? Math.sin(cyc * 2) * 6 : 0, 0, bob);
      else rigDraw(ctx, pre, P[n], k, 0, 0, bob);
    }
  } else {
    let lift = [0, 0], bob = 0, tilt = 0;
    if (o.walk) { lift = [-Math.max(0, s) * 14, -Math.max(0, -s) * 14]; bob = -Math.abs(s) * 6; tilt = s * 3; }
    else bob = Math.sin(o.t * 2.2) * 1.5;
    const T = P.torso, cx = T.tl[0] + 60, cy = T.tl[1] + 120;                // наклон туловища вокруг его низа
    // детали — в порядке R.order (у коровки ноги поверх туловища); ноги не наклоняются вместе с туловищем
    for (const n of R.order) {
      if (n.startsWith('leg')) { rigDraw(ctx, pre, P[n], k, 0, 0, lift[legs.indexOf(n)]); continue; }
      ctx.save(); ctx.translate(cx * k, (cy + bob) * k); ctx.rotate(tilt * Math.PI / 180); ctx.translate(-cx * k, -cy * k);
      if (n === 'tail') rigDraw(ctx, pre, P.tail, k, Math.sin(o.t * (o.walk ? 4 : 1.8)) * 5, 0, 0);   // хвост машет из стороны в сторону
      else rigDraw(ctx, pre, P[n], k, 0, 0, n === 'head' ? (o.kind === 'pig' ? 8 : o.view === 'back' ? 22 : 34) * g : 0);   // у свинки голова почти не опускается — иначе виден верх туловища
      ctx.restore();
    }
  }
  ctx.restore();
}
