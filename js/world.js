'use strict';
/* Карта фермы: фон — пустая картинка assets/bg/farm.png (1672×941), поверх ходят живые животные и герой.
   Координаты мира = пиксели картинки. */
const WORLD = { W: 1672, H: 941 };

/* Двор внутри забора (ноги героя): многоугольник по часовой стрелке */
const YARD = [
  [545, 165], [1545, 165], [1578, 290], [1615, 500], [1638, 700], [1632, 786],
  [150, 786], [40, 712], [34, 560], [48, 385], [528, 385], [545, 240],
];
/* Препятствия внутри двора [x, y, w, h] (по ногам) */
const SOLID = [
  [640, 150, 415, 98],    // домик с клумбами и крыльцом
  [1070, 150, 120, 78],   // колодец
  [1248, 150, 300, 132],  // клетки с кроликами
  [1222, 282, 392, 256],  // огород за штакетником
  [1318, 555, 335, 212],  // теплица
  [548, 262, 290, 186],   // загон: овцы
  [882, 262, 300, 186],   // загон: козы
  [522, 476, 314, 218],   // загон: свиньи
  [874, 476, 330, 218],   // загон: куры
  [48, 408, 104, 28],     // стог сена у конюшни
  [168, 432, 84, 28],     // телега с сеном
  [436, 428, 84, 18],     // куча сена (справа от ворот конюшни)
];

/* Где гуляют животные (ноги); нижняя граница выше переднего забора — он нарисован в фоне */
const PENS = {
  sheep: [585, 312, 808, 388],
  goat: [915, 312, 1148, 388],
  pig: [560, 528, 800, 628],
  chicken: [1036, 548, 1140, 624],
};
/* Куча сена: подойти и взять охапку */
const HAY_PILE = { x: 478, y: 442 };
// левый верхний угол загона кур: внутри заборов x 903..1165, y 530..628 — курятник не задевает забор
const COOP = { x: 961, y: 620 };
const MUD = { x: 680, y: 585, w: 180 };   // лужа ≈ 2.8 м в ширину

const ZONES = [
  { id: 'barn', name: 'Конюшня', x: 348, y: 405, my: 262 },
  { id: 'sheep', name: 'Овечки', x: 692, y: 463 },
  { id: 'goat', name: 'Козлики', x: 1030, y: 463 },
  { id: 'pig', name: 'Свинки', x: 688, y: 714 },
  { id: 'chicken', name: 'Курятник', x: 1037, y: 714 },
  { id: 'rabbit', name: 'Зайчики', x: 1222, y: 235, mx: 1395, my: 125 },
  { id: 'garden', name: 'Огород', x: 1205, y: 410, mx: 1290, my: 300 },
  { id: 'greenhouse', name: 'Теплица', x: 1500, y: 780, my: 615 },
];

/* Единый масштаб персонажей: высота в мире (пиксели фона).
   Отсчёт — дверь домика ≈ 80 px; ребёнок ≈ 0.9 двери; животные по реальному росту (~0.63 px на см). */
const SIZE = { hero: 72, sheep: 56, goat: 62, pig: 46, chicken: 30, rabbit: 22, cow: 88, horse: 100, bale: 40, haystack: 85, cart: 84, haypile: 48, coop: 82, tree: 120, bush: 48 };

/* Сад: [картинка без плодов (assets/plants/plain), x, y основания, будущая версия с плодами (assets/plants)].
   Сейчас рисуются деревья и кусты без плодов; версии с плодами подключим позже (созревание урожая). */
const PLANTS = [
  ['tree_01', 112, 590, 'tree_apple'], ['tree_02', 238, 600, 'tree_pear'],
  ['tree_03', 102, 722, 'tree_cherry'], ['tree_07', 226, 732, 'tree_plum'],
  ['bush_01', 170, 782, 'bush_strawberry'], ['bush_02', 226, 784, 'bush_raspberry'],
  ['bush_06', 282, 782, 'bush_redcurrant'], ['bush_04', 338, 782, 'bush_blackcurrant'],
  ['bush_03', 588, 246, 'bush_blueberry'], ['bush_05', 1220, 205, 'bush_gooseberry'],
];
/* Все готовые фруктовые картинки — пока в запасе */
const FRUIT_PLANTS = ['tree_apple', 'tree_pear', 'tree_cherry', 'tree_orange', 'tree_peach', 'tree_lemon', 'tree_plum',
  'tree_pomegranate', 'tree_olive', 'tree_apricot', 'bush_strawberry', 'bush_raspberry', 'bush_blueberry',
  'bush_blackcurrant', 'bush_gooseberry', 'bush_redcurrant'];

function inRect(x, y, r) { return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]; }
function inPoly(x, y, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function walkable(x, y) {
  if (!inPoly(x, y, YARD)) return false;
  for (const r of SOLID) if (inRect(x, y, r)) return false;
  return true;
}

/* Лужа для свинок (картинка assets/items/mud_puddle.png) — кладём на копию фона один раз, под животных */
function groundWithMud(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const spr = imgSprite('items/mud_puddle', MUD.w * IMG['items/mud_puddle'].height / IMG['items/mud_puddle'].width);
  g.imageSmoothingQuality = 'high';
  g.drawImage(spr.c, MUD.x - spr.w / 2, MUD.y - spr.h / 2, spr.w, spr.h);
  return c;
}
function buildWorld() {
  const ground = groundWithMud(IMG['bg/farm']);
  const sprites = [];
  const animals = [];
  // куча сена, из которой героиня берёт охапки для животных
  {
    const spr = imgSprite('items/hay_pile', SIZE.haypile);
    const { x, y } = HAY_PILE;
    sprites.push({ y, b: [x - spr.w / 2, y - spr.h, x + spr.w / 2, y], draw: (c) => blit(c, spr, x, y) });
  }
  // курятник в левом верхнем углу загона кур
  {
    const spr = imgSprite('items/chicken_coop', SIZE.coop);
    const { x, y } = COOP;
    sprites.push({ y, b: [x - spr.w / 2, y - spr.h, x + spr.w / 2, y], draw: (c) => blit(c, spr, x, y) });
  }
  // стог сена и телега с сеном у конюшни
  for (const [file, x, y, h] of [['hay_stack', 100, 434, SIZE.haystack], ['hay_cart', 210, 458, SIZE.cart]]) {
    const spr = imgSprite('items/' + file, h);
    sprites.push({ y, b: [x - spr.w / 2, y - spr.h, x + spr.w / 2, y], draw: (c) => blit(c, spr, x, y) });
  }
  // фруктовые деревья и ягодные кусты; ствол/куст — препятствие у основания
  for (const [file, x, y] of PLANTS) {
    const tree = file.startsWith('tree');
    const spr = imgSprite('plants/plain/' + file, tree ? SIZE.tree : SIZE.bush);
    sprites.push({ y, b: [x - spr.w / 2, y - spr.h, x + spr.w / 2, y], draw: (c) => blit(c, spr, x, y) });
    SOLID.push(tree ? [x - 16, y - 14, 32, 16] : [x - spr.w * 0.42, y - 14, spr.w * 0.84, 16]);
  }
  // кролики в клетках: рисуем зверька, а поверх — сетку (клетки нарисованы в фоне)
  const HUTCH = [[1287, 172, 98, 58, 'rabbit_white'], [1433, 172, 98, 58, 'rabbit_brown']];
  HUTCH.forEach(([hx, hy, hw, hh, file], i) => {
    const rab = imgSprite('animals/' + file, SIZE.rabbit);
    sprites.push({
      y: hy + hh, b: [hx, hy, hx + hw, hy + hh],
      draw(ctx, t) {
        ctx.save(); ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.clip();
        const cyc = (t * 0.5 + i * 0.4) % 1, hop = cyc < 0.15 ? Math.sin(cyc / 0.15 * Math.PI) * 4 : 0;
        const right = Math.floor(t * 0.2 + i) % 2 === 0;
        blit(ctx, rab, hx + hw * (right ? 0.4 : 0.6), hy + hh - 6 - hop, !right);
        ctx.strokeStyle = 'rgba(225,225,215,0.75)'; ctx.lineWidth = 1;
        for (let x = hx + 4; x < hx + hw; x += 8) { ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x, hy + hh); ctx.stroke(); }
        for (let y = hy + 4; y < hy + hh; y += 8) { ctx.beginPath(); ctx.moveTo(hx, y); ctx.lineTo(hx + hw, y); ctx.stroke(); }
        ctx.restore();
      },
    });
  });
  const add = (kind, file) => animals.push(new Animal(kind, imgSprite('animals/' + file, SIZE[kind]), PENS[kind]));
  for (const v of ['sheep_white', 'sheep_cream', 'sheep_grey']) add('sheep', v);
  for (const v of ['goat_brown', 'goat_white', 'goat_black']) add('goat', v);
  for (const v of ['pig_pink_dirty', 'pig_spotted', 'pig_tan_dirty']) add('pig', v);
  for (const v of ['chicken_brown', 'chicken_white', 'chicken_black', 'chicken_buff', 'chicken_white']) add('chicken', v);
  return { ground, sprites, animals, blocked: (x, y) => !(walkable(x - 10, y) && walkable(x + 10, y) && walkable(x, y - 4) && walkable(x, y + 3)) };
}
/* ---------- животное, гуляющее по загону ---------- */
const MOVE = { sheep: [16, 1.8], goat: [24, 2.2], pig: [13, 1.5], chicken: [28, 1.8] };

/* Покадровая анимация (assets/anim, точки опоры в anchors.js): стойка и ходьба сбоку/спереди/сзади.
   Все кадры одного животного в одном масштабе: рост берётся по кадру «сбоку». */
const ANIM_KINDS = ['sheep', 'goat'];
function animFiles() { return typeof ANIM_ANCHORS === 'undefined' ? [] : Object.keys(ANIM_ANCHORS).map((n) => 'anim/' + n); }
function buildAnim(kind) {
  if (typeof ANIM_ANCHORS === 'undefined' || !ANIM_ANCHORS[kind + '_side'] || !IMG['anim/' + kind + '_side']) return null;
  const k = SIZE[kind] / ANIM_ANCHORS[kind + '_side'][1];
  const fr = (name) => {
    const [cx, h] = ANIM_ANCHORS[name], im = IMG['anim/' + name];
    const base = imgSprite('anim/' + name, h * k);
    return { ...base, ox: cx * base.w / im.width };          // опора — центр тела, а не центр рамки
  };
  const seq = (pre) => { const out = []; for (let i = 0; ANIM_ANCHORS[pre + '_' + i]; i++) out.push(fr(pre + '_' + i)); return out; };
  return {
    idle: { side: fr(kind + '_side'), front: fr(kind + '_front'), back: fr(kind + '_back') },
    walk: { side: seq(kind + '_walk_side'), front: seq(kind + '_walk_front'), back: seq(kind + '_walk_back') },
  };
}
class Animal {
  constructor(kind, spr, area) {
    this.kind = kind; this.spr = spr; this.area = area;
    this.anim = ANIM_KINDS.includes(kind) ? buildAnim(kind) : null;
    if (this.anim) this.spr = this.anim.idle.side;
    this.view = 'side';
    [this.speed, this.hopA] = MOVE[kind];
    this.x = area[0] + Math.random() * (area[2] - area[0]);
    this.y = area[1] + Math.random() * (area[3] - area[1]);
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.state = 'idle'; this.timer = Math.random() * 3; this.ph = Math.random() * 6;
  }
  update(dt) {
    this.timer -= dt;
    if (this.state === 'idle') {
      if (this.timer <= 0) {
        const a = this.area;
        this.tx = a[0] + Math.random() * (a[2] - a[0]);
        this.ty = a[1] + Math.random() * (a[3] - a[1]);
        // свинки любят грязь: чаще идут в лужу
        if (this.kind === 'pig' && Math.random() < 0.6) {
          const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.32;
          this.tx = MUD.x + Math.cos(ang) * MUD.w * r;
          this.ty = MUD.y + Math.sin(ang) * MUD.w * 0.18 * r / 0.32 + 6;
        }
        this.state = 'walk';
      }
    } else {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d < 3) { this.state = 'idle'; this.timer = 1.5 + Math.random() * 4; return; }
      const sp = this.speed * dt;
      this.x += dx / d * Math.min(sp, d); this.y += dy / d * Math.min(sp, d);
      if (Math.abs(dx) > 2) this.dir = dx > 0 ? 1 : -1;
      // куда смотрит: боком, к нам (вниз) или от нас (вверх)
      this.view = Math.abs(dx) >= Math.abs(dy) * 0.8 ? 'side' : dy > 0 ? 'front' : 'back';
    }
  }
  get b() { const s = this.spr; return [this.x - s.w, this.y - s.h, this.x + s.w, this.y + 4]; }
  draw(ctx, t) {
    if (this.anim) {
      const walk = this.state === 'walk';
      const seq = this.anim.walk[this.view];
      const spr = walk ? seq[Math.floor(t * 7 + this.ph * 3) % seq.length] : this.anim.idle[this.view];
      Sk.shadow(ctx, this.x, this.y, spr.w * 0.36, spr.w * 0.09, 0.22);
      // сбоку — перекладка из деталей: ноги шагают, стоя иногда щиплет траву
      if (this.view === 'side' && typeof animalRigReady === 'function' && animalRigReady(this.kind)) {
        const graze = walk ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.7 + this.ph)), 1.5);
        drawAnimalRig(ctx, this.kind, this.x, this.y, { h: SIZE[this.kind], t: t + this.ph, walk, dir: this.dir, graze });
        return;
      }
      const sy = walk ? 1 : 1 + Math.sin(t * 2.2 + this.ph) * 0.015;   // стоя — дышит
      blit(ctx, spr, this.x, this.y, this.view === 'side' && this.dir < 0, 1, sy);
      return;
    }
    const s = this.spr;
    Sk.shadow(ctx, this.x, this.y, s.w * 0.38, s.w * 0.1, 0.22);
    let hop = 0, rot = 0;
    const sy = 1 + Math.sin(t * 2.2 + this.ph) * 0.015;
    if (this.state === 'walk') hop = Math.abs(Math.sin(t * 9 + this.ph)) * this.hopA;
    else if (this.kind === 'chicken' && Math.sin(t * 3 + this.ph) > 0.75) rot = 0.3;
    ctx.save(); ctx.translate(this.x, this.y - hop); ctx.rotate(rot * this.dir);
    blit(ctx, s, 0, 0, this.dir < 0, 1, sy);
    ctx.restore();
  }
}
