'use strict';
/* Карта фермы — единственная, из js/map_data.js (MAP_FILE). */
const MAP = JSON.parse(JSON.stringify(MAP_FILE));
try { localStorage.removeItem('farm.map'); } catch (e) {}   // старые черновики редактора больше не нужны
const WORLD = { get W() { return MAP.W; }, get H() { return MAP.H; } };

/* Единый масштаб персонажей: высота в мире (пиксели фона).
   Отсчёт — дверь домика ≈ 80 px; ребёнок ≈ 0.9 двери; животные по реальному росту (~0.63 px на см). */
const SIZE = { hero: 72, sheep: 56, goat: 62, pig: 46, chicken: 30, rabbit: 22, cow: 66, horse: 100, bale: 40, haystack: 85, cart: 84, haypile: 48, coop: 82, tree: 120, bush: 48 };

/* Все готовые фруктовые картинки — пока в запасе (созревание урожая добавим позже) */
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

/* ---------- объекты карты ---------- */
const isAnimal = (o) => o.key.startsWith('animals/');
const animalKind = (o) => o.key.slice(8).split('_')[0];
function objH(o) { return isAnimal(o) ? (SIZE[animalKind(o)] || 50) : o.h; }
function objSprite(o) { return IMG[o.key] ? imgSprite(o.key, Math.max(4, Math.round(objH(o)))) : null; }
/* Основание, через которое нельзя пройти [x, y, w, h] */
/* Ширина: своя (o.w — картинку можно растянуть/сжать по ширине) или по пропорциям картинки */
function objW(o) { const s = objSprite(o); return o.w || (s ? s.w : 20); }
function objSolid(o) {
  const s = objSprite(o); if (!s) return null;
  const k = objH(o) / 120, w = objW(o);
  if (o.tag === 'gate') return [o.x - w / 2, o.y - 12, w, 16];
  return o.key.includes('tree') ? [o.x - 16 * k, o.y - 14 * k, 32 * k, 16 * k] : [o.x - w * 0.42, o.y - 14, w * 0.84, 16];
}
/* Калитки: насколько открыта (0 — закрыта, 1 — открыта). В файл карты не сохраняется. */
const GATE_OPEN = new WeakMap();
/* Сколько ещё можно есть/пить из корыта (секунд еды на всех животных); 0 — пусто. Опустевшее корыто сообщает игре через window.onTroughEmpty */
const TROUGH_LEVEL = new WeakMap();
/* Выкопанные лопатой объекты карты (трава, сорняки) — не рисуются до нового дня */
const DUG = new WeakSet();
const isWeed = (o) => o.tag === 'weed' || /^nature\/(grass_|leafy_bush)/.test(o.key);
const TROUGH_FULL_TIME = 110;                       // ~3 раза дольше прежнего: с 3 животными корыто пустеет примерно за 4–5 минут
const PILE_EAT = 0.07;                              // сколько горки съедает одно животное за секунду (горка = 1)
/* Хочет ли дверь быть открытой (меняется нажатием) и её пара створок */
const GATE_WANT = new WeakMap(), GATE_GROUP = new WeakMap();
/* Рамка объекта в его собственных координатах (до поворота) */
function objBox(o) {
  const s = objSprite(o); if (!s) return [-10, -10, 10, 10];
  const w = objW(o);
  return o.layer === 'ground' ? [-w / 2, -s.h / 2, w / 2, s.h / 2] : [-w / 2, -s.h, w / 2, 0];
}
/* Мягкая тень на земле под стоящим объектом (o.shadow) */
function objShadow(ctx, o) { const w = objW(o); Sk.shadow(ctx, o.x, o.y - 1, w * 0.46, w * 0.14, 0.28); }
/* Объекты с запасной картинкой (o.alt): например амбар с вилами в сене / без вил — включается ALT_ON */
const ALT_ON = new WeakMap();
function drawObj(ctx, o) {
  if (DUG.has(o)) return;
  // ALT_ON: true — показать o.alt; строка — показать эту картинку (например корыто, полное овощей)
  const ak = ALT_ON.get(o), altKey = typeof ak === 'string' ? ak : ak && o.alt;
  const alt = altKey && IMG[altKey];
  const s = alt ? imgSprite(altKey, Math.max(4, Math.round(objH(o)))) : objSprite(o); if (!s) return;
  if (o.shadow) objShadow(ctx, o);
  ctx.save(); ctx.translate(o.x, o.y);
  if (o.rot) ctx.rotate(o.rot * Math.PI / 180);
  if (o.flip) ctx.scale(-1, 1);
  const b = objBox(o);
  const op = o.tag === 'gate' ? GATE_OPEN.get(o) || 0 : 0;
  if (op) {   // створка поворачивается на петлях наружу, к нам: сжимаем к краю с петлями (у отражённой — к правому),
              // свободный край уходит вниз — створка выходит вперёд, а не внутрь здания
    ctx.translate(b[0], b[3]); ctx.scale(1 - 0.75 * op, 1); ctx.transform(1, 0.35 * op, 0, 1, 0, 0); ctx.translate(-b[0], -b[3]);
  }
  ctx.drawImage(s.c, b[0], b[1], b[2] - b[0], s.h);
  ctx.restore();
}
function mapImageKeys() {
  return [MAP.bg && MAP.bg.key, MAP.grass && MAP.grass.key, ...MAP.objects.map((o) => o.key), ...MAP.objects.map((o) => o.alt)].filter(Boolean);
}

/* Фон-картинка с мягкими краями там, где вокруг неё трава */
let _bgCache = null;
function bgCanvas() {
  const b = MAP.bg, im = b && IMG[b.key]; if (!im) return null;
  const k = b.scale || 1;   // картинка может быть крупнее мира (для чёткости): scale 0.5 = в 2 раза больше
  const sides = [b.x > 0, b.y > 0, b.x + im.width * k < MAP.W, b.y + im.height * k < MAP.H];
  const ck = b.key + sides.join();
  if (_bgCache && _bgCache.ck === ck) return _bgCache.c;
  // без мягких краёв рисуем саму картинку — не тратим память на копию
  if (!sides.some(Boolean)) { _bgCache = { ck, c: im }; return im; }
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const F = 60 / k, W = im.width, H = im.height;
  const fade = (x0, y0, x1, y1) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };
  if (sides[0]) fade(0, 0, F, 0);
  if (sides[1]) fade(0, 0, 0, F);
  if (sides[2]) fade(W, 0, W - F, 0);
  if (sides[3]) fade(0, H, 0, H - F);
  _bgCache = { ck, c };
  return c;
}
let _grassPat = null;
function paintGround(ctx) {                         // трава, картинка фермы и всё, что лежит на земле
  const gr = MAP.grass, gi = gr && IMG[gr.key];
  if (gi) {
    if (!_grassPat || _grassPat.im !== gi) _grassPat = { im: gi, p: ctx.createPattern(gi, 'repeat') };
    const k = gr.size / gi.width;
    if (_grassPat.p.setTransform) _grassPat.p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    ctx.fillStyle = _grassPat.p; ctx.fillRect(0, 0, MAP.W, MAP.H);
  }
  const bg = bgCanvas();
  if (bg) { const k = MAP.bg.scale || 1; ctx.drawImage(bg, MAP.bg.x, MAP.bg.y, bg.width * k, bg.height * k); }
  for (const o of MAP.objects) if (o.layer === 'ground') drawObj(ctx, o);
}
/* Земля не меняется — рисуем её один раз в готовую картинку нужного размера и потом только копируем.
   Перерисовка — если поменялся масштаб экрана или вид лежащего на земле (выкопали траву и т.п.). */
let _groundCache = null;
function groundKey() { let k = ''; for (const o of MAP.objects) if (o.layer === 'ground') k += (DUG.has(o) ? 1 : 0) + String(ALT_ON.get(o) || '') + ','; return k; }
function drawGround(ctx, vx0, vy0, vx1, vy1, scale) {
  const f = Math.min(2, Math.max(0.5, Math.ceil((scale || 1) * 4) / 4)), key = groundKey();   // ступеньками по 0.25 — при плавном приближении кэш не пересобирается каждый кадр
  if (!_groundCache || _groundCache.f !== f || _groundCache.key !== key) {
    const c = _groundCache && _groundCache.f === f ? _groundCache.c : document.createElement('canvas');
    c.width = Math.ceil(MAP.W * f); c.height = Math.ceil(MAP.H * f);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.setTransform(f, 0, 0, f, 0, 0);
    paintGround(g);
    _groundCache = { c, f, key };
  }
  const x0 = Math.max(0, vx0), y0 = Math.max(0, vy0), x1 = Math.min(MAP.W, vx1), y1 = Math.min(MAP.H, vy1);
  if (x1 <= x0 || y1 <= y0) return;
  const f2 = _groundCache.f;
  ctx.drawImage(_groundCache.c, x0 * f2, y0 * f2, (x1 - x0) * f2, (y1 - y0) * f2, x0, y0, x1 - x0, y1 - y0);
}

/* ---------- сборка мира для игры ---------- */
function buildWorld() {
  const sprites = [], animals = [], solids = MAP.solid.slice(), gates = [], forks = [], foods = [], buckets = [], troughs = [], shovels = [];
  const tagged = (t) => MAP.objects.find((o) => o.tag === t);
  const hay = tagged('haypile');
  for (const o of MAP.objects) {
    if (o.tag === 'gate') { gates.push(o); GATE_OPEN.set(o, 0); GATE_WANT.set(o, false); }
    if (o.tag === 'food_grain' || o.tag === 'food_carrots') {
      // p — где брать: у стоящего предмета — его основание, у лежащего (теплица) — нижний край, у входа
      const f = { o, food: o.tag.slice(5), out: false, p: o.layer === 'ground' ? { x: o.x, y: o.y + o.h / 2 + 4 } : { x: o.x, y: o.y } };
      foods.push(f);
      if (o.tag === 'food_grain' && o.layer === 'stand') {
        // бочка с зерном: пока ковш внутри — картинка «бочка с ковшом» (корпус того же размера, ручка торчит вверх)
        const s = objSprite(o);
        if (s) {
          sprites.push({ y: o.y, b: [o.x - s.w, o.y - s.h * 1.4, o.x + s.w, o.y + s.h * 0.6], draw: (c) => {
            const alt = !f.out && IMG['items/barrel_scoop_full'] && imgSprite('items/barrel_scoop_full', Math.round(objH(o) * 50 / 44));
            if (alt) { if (o.shadow) objShadow(c, o); blit(c, alt, o.x, o.y, o.flip); } else drawObj(c, o);
          } });
          if (o.solid) { const r = objSolid(o); if (r) solids.push(r); }
          continue;
        }
      }
    }
    else if (o.solid) { const r = objSolid(o); if (r) solids.push(r); }
    if (o.layer !== 'stand') continue;
    // корыто: относится к ближайшему загону (месту из MAP.zones) — туда и кладут корм
    if (o.tag === 'trough' || o.tag === 'trough_water' || o.tag === 'trough_split') {
      let best = null, bd = 1e9;
      for (const z of MAP.zones) { const d = Math.hypot(z.x - o.x, z.y - o.y); if (d < bd) { bd = d; best = z; } }
      if (best) troughs.push({ o, zone: best.id, water: o.tag === 'trough_water', split: o.tag === 'trough_split' });   // split — с перегородкой: вода и корм
    }
    if (o.tag === 'shovel') {      // лопата: воткнута в землю; пока в руках — на месте её нет
      const s = objSprite(o); if (!s) continue;
      const b = { o, taken: false }; shovels.push(b);
      sprites.push({ y: o.y, b: [o.x - s.w, o.y - s.h * 1.2, o.x + s.w, o.y + s.h * 0.6], draw: (c) => { if (!b.taken) drawObj(c, o); } });
      continue;
    }
    if (o.tag === 'bucket') {      // ведро: пока его несут, на месте его нет
      const s = objSprite(o); if (!s) continue;
      const b = { o, taken: false }; buckets.push(b);
      sprites.push({ y: o.y, b: [o.x - s.w, o.y - s.h * 1.2, o.x + s.w, o.y + s.h * 0.6], draw: (c) => { if (!b.taken) drawObj(c, o); } });
      continue;
    }
    if (o.tag === 'pitchfork') {   // вилы: можно взять в руки — пока они в руках, на земле их нет
      const s = objSprite(o); if (!s) continue;
      // hide — вилы уже нарисованы на картинке амбара (barn.alt — та же картинка без вил, когда их взяли)
      const f = { o, taken: false, barn: MAP.objects.find((b) => b.alt && b.tag === 'haypile') || null };
      if (f.barn) ALT_ON.set(f.barn, false);
      forks.push(f);
      sprites.push({ y: o.y, b: [o.x - s.w, o.y - s.h * 1.2, o.x + s.w, o.y + s.h * 0.6], draw: (c) => { if (!f.taken && !o.hide) drawObj(c, o); } });
      continue;
    }
    if (isAnimal(o) && o.area) {
      const spr = objSprite(o);
      if (spr) animals.push(new Animal(animalKind(o), spr, o.area, o.x, o.y));
      continue;
    }
    const s = objSprite(o); if (!s) continue;
    sprites.push({ y: o.y, b: [o.x - s.w, o.y - s.h * 1.2, o.x + s.w, o.y + s.h * 0.6], draw: (c) => drawObj(c, o) });
  }
  // кролики в клетках: рисуем зверька, а поверх — сетку (клетки нарисованы в фоне)
  const hutchSprites = [];
  (MAP.hutches || []).forEach(([hx, hy, hw, hh, file], i) => {
    const rab = imgSprite('animals/' + file, SIZE.rabbit);
    if (!rab) return;
    hutchSprites.push({
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
  sprites.push(...hutchSprites);
  for (const a of animals) { a.troughs = troughs.filter((t) => t.zone === a.kind); a.mates = animals.filter((m) => m.kind === a.kind); }   // корыта и соседи по загону
  const walkable = (x, y) => {
    if (x < 0 || y < 0 || x > MAP.W || y > MAP.H) return false;
    if (!MAP.walk.some((P) => inPoly(x, y, P))) return false;
    for (const r of solids) if (inRect(x, y, r)) return false;
    for (const g of gates) if (GATE_OPEN.get(g) < 0.5 && inRect(x, y, objSolid(g) || [0, 0, 0, 0])) return false;
    return true;
  };
  // створки, стоящие рядом на одной линии, — одна дверь: открываются и закрываются вместе
  for (const g of gates) GATE_GROUP.set(g, gates.filter((h) => Math.abs(h.y - g.y) < 8 && Math.abs(h.x - g.x) < (objW(h) + objW(g)) / 2 + 8));
  // дверь открывается и закрывается только по нажатию (toggleGate), здесь — плавное движение створок
  const updateGates = (dt) => {
    for (const g of gates) {
      const v = GATE_OPEN.get(g) + (GATE_WANT.get(g) ? dt * 3 : -dt * 2.5);
      GATE_OPEN.set(g, Math.max(0, Math.min(1, v)));
    }
  };
  const gateAt = (x, y) => {   // дверь под точкой нажатия (с небольшим запасом)
    for (const g of gates) {
      const b = objBox(g);
      if (x >= g.x + b[0] - 8 && x <= g.x + b[2] + 8 && y >= g.y + b[1] - 8 && y <= g.y + b[3] + 10) return g;
    }
    return null;
  };
  const toggleGate = (g, open) => {
    const v = open ?? !GATE_WANT.get(g);
    for (const h of GATE_GROUP.get(g) || [g]) GATE_WANT.set(h, v);
  };
  return {
    sprites, animals, solids, hutchSprites, gates, updateGates, gateAt, toggleGate, forks, foods, buckets, troughs, shovels,
    homeDoor: gates.find((g) => g.home) || null,
    // откуда берут сено: у стоящей кучи — её основание; у лежащего объекта (амбар с сеном) — низ, чуть выше края
    hay: hay ? (hay.layer === 'ground' ? { x: hay.x, y: hay.y + hay.h / 2 - 18 } : { x: hay.x, y: hay.y }) : null,
    // точка за закрытой дверью (внутри амбара и т.п.) — до неё не дотянуться, пока дверь не открыта
    behindClosedDoor: (x, y) => gates.find((g) => GATE_OPEN.get(g) < 0.5 && y < g.y && g.y - y < 140 && Math.abs(x - g.x) < objW(g) / 2 + 40) || null,
    blocked: (x, y) => !(walkable(x - 10, y) && walkable(x + 10, y) && walkable(x, y - 4) && walkable(x, y + 3)),
  };
}
/* Животные не залезают друг на друга: близко стоящих (в одном загоне) мягко расталкиваем.
   Глубина (y) считается вдвое «короче» — на экране она сжата. Едящее у корыта не двигаем — уступает другое. */
/* На каком расстоянии соседи по загону не налезают друг на друга (y считается ×2.2) */
function sepNeed(a, b) { return ((SIZE[a.kind] || 50) + (SIZE[b.kind] || 50)) / 2 * (a.kind === 'cow' ? 1.25 : 0.85); }   // коровка длиннее, чем высокая
function separateAnimals(list, dt) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.kind !== b.kind) continue;
    const need = sepNeed(a, b);
    let dx = b.x - a.x, dy = (b.y - a.y) * 2.2;
    let d = Math.hypot(dx, dy);
    if (d >= need) continue;
    if (d < 0.01) { dx = Math.random() - 0.5; dy = 0.3; d = Math.hypot(dx, dy); }
    const push = Math.min(need - d, 60 * dt) , ux = dx / d, uy = dy / d / 2.2;
    const wa = a.eating ? 0 : b.eating ? 1 : 0.5, wb = 1 - wa;
    a.x -= ux * push * wa; a.y -= uy * push * wa; b.x += ux * push * wb; b.y += uy * push * wb;
    for (const m of [a, b]) { const r = m.area; m.x = Math.min(Math.max(m.x, r[0]), r[2]); m.y = Math.min(Math.max(m.y, r[1]), r[3]); if (!m.eating) m.keepOffTroughs(); }
  }
}
/* ---------- животное, гуляющее по загону ---------- */
const MOVE = { sheep: [16, 1.8], goat: [24, 2.2], pig: [13, 1.5], chicken: [28, 1.8], cow: [10, 1.2], horse: [18, 1.4], rabbit: [26, 3] };

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
/* Тень животного (эллипс под ногами) не заходит на корыто: прямоугольник корыта на земле и проверка эллипса */
function troughRect(o) { const w = objW(o); return [o.x - w / 2, o.y - o.h * 0.95, o.x + w / 2, o.y]; }
function shadowHits(x, y, rx, ry, R) {
  const px = Math.min(Math.max(x, R[0]), R[2]), py = Math.min(Math.max(y, R[1]), R[3]);
  return ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2 < 1;
}
class Animal {
  constructor(kind, spr, area, x, y) {
    this.kind = kind; this.spr = spr; this.area = area;
    this.anim = ANIM_KINDS.includes(kind) ? buildAnim(kind) : null;
    if (this.anim) this.spr = this.anim.idle.side;
    this.view = 'side';
    [this.speed, this.hopA] = MOVE[kind] || [15, 1.5];
    this.x = x; this.y = y;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.state = 'idle'; this.timer = Math.random() * 3; this.ph = Math.random() * 6;
    this.stuck = 0;
  }
  get srx() { return (SIZE[this.kind] || 50) * 0.42; }   // полуоси тени (как в draw)
  get sry() { return (SIZE[this.kind] || 50) * 0.1; }
  offTrough(x, y) { return !(this.troughs || []).some((t) => shadowHits(x, y, this.srx, this.sry, troughRect(t.o))); }
  /* Куда пойти погулять: свободное место, подальше от соседей и их целей, и чтобы путь не шёл сквозь соседа */
  pickSpot() {
    const a = this.area, mates = (this.mates || []).filter((m) => m !== this);
    let best = null, bs = -1;
    for (let i = 0; i < 14; i++) {
      const x = a[0] + Math.random() * (a[2] - a[0]), y = a[1] + Math.random() * (a[3] - a[1]);
      if (!this.offTrough(x, y)) continue;
      let sc = 1e9;
      for (const m of mates) {
        sc = Math.min(sc, Math.hypot(x - m.x, (y - m.y) * 2.2));
        if (m.state === 'walk') sc = Math.min(sc, Math.hypot(x - m.tx, (y - m.ty) * 2.2));
        // расстояние от соседа до отрезка пути (y ×2.2) — путь сквозь соседа плохой
        const vx = x - this.x, vy = (y - this.y) * 2.2, wx = m.x - this.x, wy = (m.y - this.y) * 2.2, L = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / L));
        sc = Math.min(sc, Math.hypot(wx - vx * t, wy - vy * t) * 1.2);
      }
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (!best) best = [this.x, this.y];
    [this.tx, this.ty] = best; this.state = 'walk'; this.lastD = undefined; this.stuck = 0;
  }
  /* вытолкнуть тень с корыта — в ближайшую сторону */
  keepOffTroughs() {
    const rx = this.srx, ry = this.sry;
    for (const t of this.troughs || []) {
      const R = troughRect(t.o);
      if (!shadowHits(this.x, this.y, rx, ry, R)) continue;
      const opt = [[R[0] - rx - 0.5 - this.x, 0], [R[2] + rx + 0.5 - this.x, 0], [0, R[1] - ry - 0.5 - this.y], [0, R[3] + ry + 0.5 - this.y]];
      opt.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
      this.x += opt[0][0]; this.y += opt[0][1];
    }
  }
  /* Подойти к корыту сбоку (со стороны середины загона) так, чтобы голова была над корытом */
  goTrough(tr) {
    // встать вплотную сбоку так, чтобы голова оказалась над корытом (опущенная голова «в корыте»)
    // у корыта несколько мест вдоль его длины — занимаем свободное, чтобы не залезать друг на друга
    const o = tr.o, side = o.x > (this.area[0] + this.area[2]) / 2 ? -1 : 1, h = SIZE[this.kind] || 50;
    const slots = this.kind === 'chicken' ? [0.1, 0.4, 0.7] : [0.02, 0.8];
    const others = (this.mates || []).filter((m) => m !== this && (m.goal === tr || m.eating === tr));
    const free = slots.map((_, i) => i).filter((i) => !others.some((m) => m.slot === i));
    if (!free.length) return false;                    // все места заняты — пусть погуляет
    this.slot = free[Math.floor(Math.random() * free.length)];
    this.tx = o.x + side * (objW(o) / 2 + this.srx + 1); this.ty = o.y - o.h * slots[this.slot];   // тень — вплотную к корыту, но не на нём
    this.goal = tr; this.state = 'walk';
    return true;
  }
  update(dt) {
    this.timer -= dt;
    if (this.eating && this.eating.pile) {          // ест горку угощения — она становится всё меньше
      const p = this.eating.pile;
      this.view = 'side'; this.dir = p.x > this.x ? 1 : -1;
      if (p.amt <= 0 || this.timer <= 0) { this.eating = null; this.timer = 1 + Math.random() * 2; return; }
      p.amt = Math.max(0, p.amt - dt * PILE_EAT);
      if (window.onAnimalEat) window.onAnimalEat(this.kind, dt);
      return;
    }
    if (this.eating) {                               // ест или пьёт у корыта
      const tr = this.eating, lv = TROUGH_LEVEL.get(tr.o) || 0;
      this.view = 'side'; this.dir = tr.o.x > this.x ? 1 : -1;
      if (lv <= 0 || this.timer <= 0) { this.eating = null; this.timer = 1 + Math.random() * 3; return; }
      const left = lv - dt; TROUGH_LEVEL.set(tr.o, Math.max(0, left));
      if (window.onAnimalEat) window.onAnimalEat(this.kind, dt);   // сытость растёт, пока животное ест или пьёт
      if (left <= 0 && window.onTroughEmpty) window.onTroughEmpty(tr);
      return;
    }
    if (this.state === 'idle') {
      if (this.timer <= 0) {
        // в корыте есть еда или вода — чаще идут туда
        // в загоне лежит горка угощения — почти всегда идут есть её
        const piles = (window.pilesOf ? window.pilesOf(this.kind) : []).filter((p) => p.amt > 0);
        if (piles.length && Math.random() < 0.85) {
          const p = piles[Math.floor(Math.random() * piles.length)], side = this.x < p.x ? -1 : 1;
          this.tx = p.x + side * (SIZE[this.kind] * 0.55); this.ty = p.y + (Math.random() - 0.5) * 6;
          this.goal = { pile: p }; this.state = 'walk'; return;
        }
        const full = (this.troughs || []).filter((t) => (TROUGH_LEVEL.get(t.o) || 0) > 0);
        if (full.length && Math.random() < 0.7 && this.goTrough(full[Math.floor(Math.random() * full.length)])) return;
        this.goal = null;
        this.pickSpot();
        if (this.feed && Math.random() < 0.75) {    // в загоне лежит корм — чаще идут есть
          this.tx = this.feed.x + (Math.random() - 0.5) * 34; this.ty = this.feed.y + (Math.random() - 0.5) * 12;
        }
        this.state = 'walk';
      }
    } else {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d < 3) {
        this.state = 'idle'; this.timer = 1.5 + Math.random() * 4; this.lastD = undefined; this.stuck = 0;
        if (this.goal && this.goal.pile) { if (this.goal.pile.amt > 0) { this.eating = this.goal; this.timer = 3 + Math.random() * 3; } }
        else if (this.goal && (TROUGH_LEVEL.get(this.goal.o) || 0) > 0) { this.eating = this.goal; this.timer = 4 + Math.random() * 4; }
        this.goal = null;
        return;
      }
      const sp = this.speed * dt;
      // не продвигается к цели (упёрлось в корыто или в соседа — расталкивание возвращает назад):
      // раз в секунду сверяем, насколько приблизилось (уже после расталкивания); мало — уходим в свободное место
      this.stuck += dt;
      if (this.lastD === undefined) { this.lastD = d; this.stuck = 0; }
      else if (this.stuck >= 1) {
        const prog = this.lastD - d; this.lastD = d; this.stuck = 0;
        if (prog < this.speed * 0.35) { this.goal = null; this.pickSpot(); this.lastD = undefined; return; }
      }
      // сосед впереди — обходим его сбоку, а не идём лоб в лоб
      let ux = dx / d, uy = dy / d;
      for (const m of this.mates || []) {
        if (m === this) continue;
        const vx = m.x - this.x, vy = (m.y - this.y) * 2.2, dist = Math.hypot(vx, vy), need = sepNeed(this, m) * 1.4;
        if (dist > need || dist < 0.01 || ux * vx + uy * vy * 2.2 <= 0) continue;
        const side = ux * vy - uy * vx > 0 ? -1 : 1, w = 1 - dist / need;   // в сторону от соседа
        const px = -uy * side, py = ux * side;
        ux += px * w * 1.5; uy += py * w * 1.5 / 2.2;
      }
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      const step = Math.min(sp, d);
      this.x += ux * step; this.y += uy * step;
      const r = this.area; this.x = Math.min(Math.max(this.x, r[0]), r[2]); this.y = Math.min(Math.max(this.y, r[1]), r[3]);
      this.keepOffTroughs();
      if (Math.abs(dx) > 2) this.dir = dx > 0 ? 1 : -1;
      // куда смотрит: боком, к нам (вниз) или от нас (вверх)
      this.view = Math.abs(dx) >= Math.abs(dy) * 0.8 ? 'side' : dy > 0 ? 'front' : 'back';
    }
  }
  get b() { const s = this.spr; return [this.x - s.w, this.y - s.h, this.x + s.w, this.y + 4]; }
  draw(ctx, t) {
    // животные из деталей (овечка, козлик, свинка, курочка) — во всех видах
    if (typeof rig2Ready === 'function' && rig2Ready(this.kind)) {
      const walk = this.state === 'walk', h = SIZE[this.kind];
      Sk.shadow(ctx, this.x, this.y, h * 0.42, h * 0.1, 0.22);
      const graze = this.eating ? 0.75 + 0.25 * Math.sin(t * 6 + this.ph) : walk ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.7 + this.ph)), 1.5);
      drawSheep2(ctx, this.x, this.y, { kind: this.kind, h, t: t + this.ph, walk, view: this.view, dir: this.dir, graze });
      return;
    }
    if (this.anim) {
      const walk = this.state === 'walk';
      const seq = this.anim.walk[this.view];
      const spr = walk ? seq[Math.floor(t * 7 + this.ph * 3) % seq.length] : this.anim.idle[this.view];
      Sk.shadow(ctx, this.x, this.y, spr.w * 0.36, spr.w * 0.09, 0.22);
      // овечка — из новых деталей во всех трёх видах
      if (typeof rig2Ready === 'function' && rig2Ready(this.kind)) {
        const graze = this.eating ? 0.75 + 0.25 * Math.sin(t * 6 + this.ph) : walk ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.7 + this.ph)), 1.5);
        drawSheep2(ctx, this.x, this.y, { kind: this.kind, h: SIZE[this.kind], t: t + this.ph, walk, view: this.view, dir: this.dir, graze });
        return;
      }
      // сбоку — перекладка из деталей: ноги шагают, стоя иногда щиплет траву
      if (this.view === 'side' && typeof animalRigReady === 'function' && animalRigReady(this.kind)) {
        const graze = this.eating ? 0.75 + 0.25 * Math.sin(t * 6 + this.ph) : walk ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.7 + this.ph)), 1.5);
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
