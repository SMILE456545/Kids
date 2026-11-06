'use strict';
/* Загрузка готовых картинок из assets/ и подготовка спрайтов нужного размера. */
const IMG = {};
const GIRL_FRAMES = ['front', 'three_quarter', 'side', 'back', 'walk_front', 'walk_a', 'walk_side', 'walk_b',
  'emo_smile', 'emo_talk', 'emo_surprised', 'emo_laugh', 'pose_wave', 'pose_point'];

function loadImages(keys) {
  return Promise.all(keys.map((k) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[k] = im; res(true); };
    im.onerror = () => res(false);
    im.src = 'assets/' + k + '.png';
  })));
}

/* Спрайт с якорем «ноги посередине снизу», высотой h в единицах мира.
   Картинка уменьшается по шагам ×0.5, чтобы не было ряби. */
const _imgCache = {};
function imgSprite(key, h, ss = 2.5) {
  const ck = key + '@' + h;
  if (_imgCache[ck]) return _imgCache[ck];
  const im = IMG[key];
  if (!im) return null;
  const w = h * im.width / im.height;
  const TW = Math.max(1, Math.round(w * ss)), TH = Math.max(1, Math.round(h * ss));
  let src = im, cw = im.width, ch = im.height;
  while (cw / 2 > TW && ch / 2 > TH) {
    const c = document.createElement('canvas');
    c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, c.width, c.height);
    src = c; cw = c.width; ch = c.height;
  }
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, TW, TH);
  return (_imgCache[ck] = { c, w, h, ox: w / 2, oy: h });
}

function heroHasImages(gender) { return !!IMG[gender + '/front']; }

/* Кадр героя по направлению и фазе ходьбы. dir: 1 вправо, -1 влево; face: side|down|up */
function heroFrame(gender, walk, face, t) {
  const f = Math.floor(t * 7) % 4;
  if (!walk) return { key: face === 'up' ? 'back' : face === 'down' ? 'front' : 'three_quarter', flip: false };
  if (face === 'up') return { key: 'back', flip: f >= 2 };
  if (face === 'down') return { key: f % 2 ? 'front' : 'walk_front', flip: f >= 2 };
  return { key: f % 2 ? 'side' : 'walk_side', flip: false };
}

function drawHero(ctx, x, y, o) {
  const g = o.gender;
  if (typeof rigReady === 'function' && rigReady(g)) { drawRigHero(ctx, x, y, { ...o, h: o.h || 108 }); return; }
  if (!heroHasImages(g)) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1.3, 1.3);
    drawKid(ctx, 0, 0, o);
    ctx.restore();
    return;
  }
  const fr = heroFrame(g, o.walk, o.face, o.t);
  const h = o.h || 108, k = h / 108;
  const spr = imgSprite(g + '/' + fr.key, h);
  const bob = (o.walk ? Math.abs(Math.sin(o.t * 14)) * 2.5 : Math.sin(o.t * 2.4) * 0.8) * k;
  const sway = o.walk && o.face === 'up' ? Math.sin(o.t * 7) * 0.04 : 0;
  Sk.shadow(ctx, x, y, 20 * k, 6 * k, 0.22);
  let flip = o.dir < 0;
  if (o.face === 'up' || o.face === 'down') flip = fr.flip;
  ctx.save(); ctx.translate(x, y - bob); ctx.rotate(sway);
  blit(ctx, spr, 0, 0, flip);
  ctx.restore();
}
