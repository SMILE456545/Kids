'use strict';
/* Этап 1: стартовый экран, выбор героя, прогулка по ферме, обучающие подсказки. */

/* Задания: покормить каждое животное своим кормом. zone — место у загона (MAP.zones), там кормят. */
const TASKS = [
  { id: 'sheep', zone: 'sheep', food: 'hay', get who() { return trd('who', this.zone); }, icon: 'assets/animals/sheep_white.png' },
  { id: 'goat', zone: 'goat', food: 'hay', get who() { return trd('who', this.zone); }, icon: 'assets/animals/goat_brown.png' },
  { id: 'cow', zone: 'cow', food: 'carrots', get who() { return trd('who', this.zone); }, icon: 'assets/animal_parts/cow2/head_front.png' },
  { id: 'chicken', zone: 'chicken', food: 'grain', get who() { return trd('who', this.zone); }, icon: 'assets/animals/chicken_brown.png' },
  // напоить: воду носят ведром из колодца
  { id: 'sheep_w', zone: 'sheep', food: 'water', get who() { return trd('who', this.zone); }, icon: 'assets/animals/sheep_white.png' },
  { id: 'goat_w', zone: 'goat', food: 'water', get who() { return trd('who', this.zone); }, icon: 'assets/animals/goat_brown.png' },
  { id: 'cow_w', zone: 'cow', food: 'water', get who() { return trd('who', this.zone); }, icon: 'assets/animal_parts/cow2/head_front.png' },
  { id: 'chicken_w', zone: 'chicken', food: 'water', get who() { return trd('who', this.zone); }, icon: 'assets/animals/chicken_brown.png' },
];
/* Корм: как называется и как выглядит в руках / в загоне */
const FOOD = {
  hay: { get acc() { return trd('food', 'hay'); }, badge: '🌾', img: 'items/hay_pile' },
  carrots: { get acc() { return trd('food', 'carrots'); }, badge: '🥕', img: 'items/bucket_carrots' },
  water: { get acc() { return trd('food', 'water'); }, badge: '💧', img: 'items/bucket_water_full' },
  grain: { get acc() { return trd('food', 'grain'); }, badge: '🌽', img: 'items/grain_bag' },
  fruit: { get acc() { return trd('food', 'fruit'); }, badge: '🍎', img: null },
  fruits: { get acc() { return trd('food', 'fruits'); }, badge: '🍎', img: null },
  greens: { get acc() { return trd('food', 'greens'); }, badge: '🌿', img: null },       // выкопанные лопатой трава и сорняки     // ведро с подобранными фруктами
  berries: { get acc() { return trd('food', 'berries'); }, badge: '🍓', img: 'items/bucket_berries' },     // ведро с подобранными ягодами
};
/* Фрукты и ягоды с деревьев/кустов (картинки plants/<вид>): как назвать и каким значком нарисовать в руке */
const FRUIT = {
  tree_apple: '🍎', tree_pear: '🍐', tree_cherry: '🍒', tree_orange: '🍊', tree_peach: '🍑', tree_lemon: '🍋', tree_plum: '🫐', tree_apricot: '🍑',
  tree_pomegranate: '🍎', tree_olive: '🫒', bush_strawberry: '🍓', bush_raspberry: '🍓', bush_blueberry: '🫐',
  bush_blackcurrant: '🫐', bush_gooseberry: '🍈', bush_redcurrant: '🍒',
};
// [0] — название на текущем языке (js/i18n.js), [1] — значок
for (const k of Object.keys(FRUIT)) { const badge = FRUIT[k]; FRUIT[k] = { get 0() { return trd('fruit', k); }, 1: badge }; }
/* Кто что ест из угощений, которые кидают в загон горкой (veg — овощи из ведра, fruit — фрукты, berry — ягоды) */
const TREATS = { cow: ['veg', 'fruit', 'berry', 'greens'], goat: ['veg', 'fruit', 'berry', 'greens'], sheep: ['veg', 'fruit', 'greens'], chicken: ['berry', 'veg', 'greens'] };
const PEN_WHO = new Proxy({}, { get: (_, k) => trd('who', k) });
const TREAT_NAME = new Proxy({}, { get: (_, k) => trd('treat', k) });
const PILE_IMG = { veg: 'items/pile_veg', fruit: 'items/pile_fruit', berry: 'items/pile_berries', greens: 'items/weed' };
/* Что выпадает из теплицы (картинки assets/garden) */
const DROP_VEG = ['tomato', 'cucumber', 'carrot', 'potatoes_two', 'cabbage'];
const ANIMAL_NAME = new Proxy({}, { get: (_, k) => trd('one', k) });

(async function () {
  const $ = (id) => document.getElementById(id);
  const cv = $('game'), ctx = cv.getContext('2d');
  const touch = matchMedia('(pointer: coarse)').matches;

  // ---------- сохранение ----------
  const save = { gender: null, done: [], introDone: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem('farm.v1') || '{}')); } catch (e) {}
  const persist = () => { try { localStorage.setItem('farm.v1', JSON.stringify(save)); } catch (e) {} };
  save.gender = 'girl';                                 // герой один — Айлин (выбор героя убран)

  // ---------- шрифт и мир ----------
  try { await Promise.race([document.fonts.load('20px Pangolin'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  const ANIMAL_FILES = ['horse_chestnut', 'cow_holstein', 'sheep_white', 'sheep_cream', 'sheep_grey', 'sheep_brown',
    'goat_white', 'goat_brown', 'goat_black', 'pig_pink_dirty', 'pig_spotted', 'pig_tan_dirty', 'pig_pink',
    'chicken_white', 'chicken_brown', 'chicken_black', 'chicken_buff', 'rabbit_white', 'rabbit_grey', 'rabbit_brown'];
  await loadImages([
    ...mapImageKeys(),
    ...ANIMAL_FILES.map((f) => 'animals/' + f),
    ...['hay_bale', 'hay_stack', 'hay_cart', 'hay_pile', 'pitchfork', 'pitchfork_hay', 'grain_barrel', 'barrel_scoop_full', 'scoop_empty', 'scoop_full', 'bucket_empty', 'bucket_full', 'bucket_water_full', 'veg_pile', 'trough', 'trough_veg', 'trough_hay', 'trough_water', 'trough_split_water', 'trough_split_grain', 'trough_split_both', 'pile_veg', 'pile_fruit', 'pile_berries', 'weed', 'shovel', ...DROP_VEG.map((k) => '../garden/' + k),
      ...Object.keys(FRUIT).map((k) => '../fruits/' + k), 'mud_puddle', 'chicken_coop', 'straw', 'wheelbarrow', 'grain_bag', 'bucket_carrots', 'bucket_berries', 'watering_can'].map((f) => 'items/' + f),
    ...GIRL_FRAMES.map((f) => 'girl/' + f), 'fx/glove_point', 'fx/glove_thumb',
    ...RIG_FILES.map((f) => 'girl/rig/' + f),
    ...animFiles(),
    ...animalRigFiles(),
    ...(typeof sheep2Files === 'function' ? sheep2Files() : []),
    ...GIRL_FRAMES.map((f) => 'boy/' + f),
  ]);
  let W = buildWorld();
  $('loading').hidden = true;

  // ---------- задания: покормить животных ----------
  if (!Array.isArray(save.done)) save.done = [];
  const qlist = $('qlist');
  const zoneOf = (t) => MAP.zones.find((z) => z.id === t.zone);
  const tasksOn = () => TASKS.filter(zoneOf);            // задание есть, только если на карте есть место загона
  /* Панель слева сверху: по одному животному и шкала сытости (0..1).
     Сытость медленно падает сама и растёт, пока животные едят или пьют (из корыта или горку угощения). */
  const FED_KINDS = ['sheep', 'goat', 'cow', 'chicken'];
  const FED_DOWN = 1 / 420, FED_UP = 0.012;          // пустеет за ~7 минут; одно жующее животное прибавляет 1.2% в секунду
  if (!save.fed) save.fed = { sheep: 0.35, goat: 0.35, cow: 0.35, chicken: 0.35 };
  if (save.fed.cow == null) save.fed.cow = 0.35;   // старые сохранения: вместо свинок теперь коровки
  function buildQuest() {
    qlist.textContent = '';
    for (const k of FED_KINDS) {
      const name = trd('who', k);
      if (!MAP.zones.some((z) => z.id === k)) continue;
      const li = document.createElement('li'); li.className = 'fed'; li.dataset.id = k; li.title = name;
      li.innerHTML = `<img src="assets/animal_parts/${k}2/head_front.png" alt="${name}"><span class="bar"><i></i></span>`;
      qlist.appendChild(li);
    }
  }
  buildQuest();
  onLang(() => { buildQuest(); refreshQuest(); });
  function refreshQuest() {
    for (const li of qlist.children) {
      const v = Math.max(0, Math.min(1, save.fed[li.dataset.id] ?? 0)), i = li.querySelector('.bar i');
      i.style.width = Math.round(v * 100) + '%';
      i.style.background = v > 0.6 ? '#7cc142' : v > 0.3 ? '#f2c12e' : '#ef5a4c';
      li.classList.toggle('low', v < 0.25);
    }
  }
  window.onAnimalEat = (kind, dt) => { if (save.fed[kind] != null) save.fed[kind] = Math.min(1, save.fed[kind] + dt * FED_UP); };
  let fedNext = 0;
  function updateFed(dt) {
    for (const [k] of FED_KINDS) if (save.fed[k] != null) save.fed[k] = Math.max(0, save.fed[k] - dt * FED_DOWN);
    if (T >= fedNext) { fedNext = T + 0.5; refreshQuest(); if ((T | 0) % 10 === 0) persist(); }
  }

  // ---------- состояние ----------
  let mode = 'title';
  const player = { x: MAP.start.x, y: MAP.start.y, dir: 1, face: 'down', walk: false, target: null, stuck: 0 };
  const cam = { x: 900, y: 500 };
  const view = { scale: 1, dpr: 1, w: 0, h: 0, zoom: 1 };
  const vscale = () => view.scale * view.zoom;
  const keys = new Set();
  let tapFx = null, T = 0;

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth; view.h = window.innerHeight;
    cv.width = Math.round(view.w * view.dpr); cv.height = Math.round(view.h * view.dpr);
    // вся ферма по высоте, но не мельче, чем нужно; на широком экране — чуть ближе
    view.scale = Math.max(Math.max(view.w / WORLD.W, view.h / WORLD.H), Math.min(view.h / 800, view.w / 900));
    view.zoomT = clampZoom(view.zoomT); view.zoom = clampZoom(view.zoom);
  }
  /* Приближение камеры: от «вся ферма на экране» до 2.4× ближе. zoomT — куда плавно идёт zoom; запоминается. */
  function clampZoom(z) { const min = Math.max(view.w / WORLD.W, view.h / WORLD.H) / view.scale; return Math.min(2.4, Math.max(min, z || 1)); }
  try { view.zoomT = view.zoom = +localStorage.getItem('farm.zoom') || 1; } catch (e) { view.zoomT = 1; }
  function setZoom(z) { view.zoomT = clampZoom(z); try { localStorage.setItem('farm.zoom', view.zoomT.toFixed(3)); } catch (e) {} }
  addEventListener('resize', resize); resize();

  // ---------- диалоги ----------
  const Dlg = {
    q: [], cur: '', shown: 0, done: null, active: false,
    say(lines, done) {
      if (this.active) { this.q.push(...lines); const prev = this.done; this.done = () => { prev && prev(); done && done(); }; return; }
      this.q = lines.slice(); this.done = done; this.active = true; $('dialog').hidden = false; this.next(true);
    },
    next(first) {
      if (!first && this.shown < this.cur.length) { this.shown = this.cur.length; $('dlgText').textContent = this.cur; return; }
      if (!this.q.length) { this.active = false; $('dialog').hidden = true; const d = this.done; this.done = null; d && d(); return; }
      this.cur = this.q.shift(); this.shown = 0; $('dlgText').textContent = '';
    },
    update(dt) {
      if (this.active && this.shown < this.cur.length) {
        this.shown = Math.min(this.cur.length, this.shown + dt * 40);
        $('dlgText').textContent = this.cur.slice(0, Math.floor(this.shown));
      }
    },
    get talking() { return this.active && this.shown < this.cur.length; },
  };
  $('dialog').addEventListener('pointerdown', (e) => { e.stopPropagation(); Dlg.next(); });

  function toast(text, ms = 2200) { helperSay(text, Math.max(2.5, ms / 1000 + 0.6)); }   // все сообщения — от помощника

  // ---------- экраны ----------
  function show(m) {
    mode = m;
    document.body.classList.toggle('menu', m === 'title');
    $('title').hidden = m !== 'title';
    $('hud').hidden = m !== 'play';
    if (m !== 'play') { Dlg.active = false; Dlg.q = []; $('dialog').hidden = true; }
  }
  /* Айлин машет рукой: с T = from, sec секунд (только с пустыми руками и стоя); waveAmt — 0..1, рука поднимается и опускается плавно */
  function waveHello(sec, delay = 0) { player.waveFrom = T + delay; player.waveTo = T + delay + sec; }
  function waveAmt() {
    if (player.tool || player.carry || player.walk || player.home || T < (player.waveFrom ?? -99) || T > (player.waveTo ?? -99)) return 0;
    return Math.min(1, (T - player.waveFrom) / 0.25, (player.waveTo - T) / 0.25);
  }
  function startPlay() {
    show('play');
    waveHello(2.4, 1.3);                                  // после перехода с главного экрана — здоровается
    $('dlgName').textContent = tr('hero');
    refreshQuest();
    if (!save.introDone) {
      player.x = MAP.start.x; player.y = MAP.start.y; player.dir = 1; player.face = 'down';
      save.introDone = true; save.tut = 0; persist();     // обучение ведёт помощник (helperHint)
    }
  }
  /* Переход с главного экрана: куст-столбик идёт от левого края к правому; справа от него ещё главный экран,
     слева — уже игра. Главный экран обрезается по середине куста. */
  function wipeTitle(next) {
    const title = $('title'), bush = $('wipeBush');
    next();                                            // игра уже под главным экраном
    title.hidden = false; title.classList.add('wipe'); title.style.clipPath = 'inset(0 0 0 0)';
    bush.hidden = false;
    const t0 = performance.now(), DUR = 1400;
    (function step(now) {
      const W = innerWidth, bw = bush.getBoundingClientRect().width || innerHeight * 0.26;
      const p = Math.min(1, (now - t0) / DUR), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // плавно разгоняется и тормозит
      const cx = -bw / 2 + e * (W + bw);               // середина куста: от -половины до правого края + половина
      bush.style.transform = `translateX(${cx - bw / 2}px)`;
      title.style.clipPath = `inset(0 0 0 ${Math.max(0, cx)}px)`;
      if (p < 1) return requestAnimationFrame(step);
      bush.hidden = true; bush.style.transform = '';
      title.classList.remove('wipe'); title.style.clipPath = ''; title.hidden = mode !== 'title';
      $('btnPlay').classList.remove('go');
    })(t0);
  }
  $('btnPlay').onclick = () => {
    const btn = $('btnPlay');
    if (btn.classList.contains('go')) return;
    // кнопка вырастает и исчезает, потом проходит куст
    btn.classList.add('go');
    clearTimeout(startPlay.h);
    startPlay.h = setTimeout(() => { if (mode === 'title') wipeTitle(startPlay); else btn.classList.remove('go'); }, 600);
  };
  $('btnSettings').onclick = () => { $('settings').hidden = false; };
  $('setResume').onclick = () => { $('settings').hidden = true; };
  $('setFull').onclick = () => {
    $('settings').hidden = true;
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
    else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement);
  };

  $('setReset').onclick = () => {
    $('settings').hidden = true;
    save.done = []; save.introDone = false; save.tut = 0; save.walked = false; save.fed = { sheep: 0.35, goat: 0.35, cow: 0.35, chicken: 0.35 }; persist(); fed.clear(); refreshQuest(); for (const tr of W.troughs) ALT_ON.set(tr.o, false); TROUGH_IN.clear();
    startPlay();
  };

  // ---------- управление ----------
  function toWorld(px, py) { return [cam.x + px / vscale(), cam.y + py / vscale()]; }
  // ---------- приближение: колёсико мыши, два пальца (щипок), кнопки «+» / «−», клавиши + / − ----------
  cv.addEventListener('wheel', (e) => { if (mode !== 'play') return; e.preventDefault(); setZoom(view.zoomT * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  const touches = new Map(); let pinch = null;
  cv.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {                            // второй палец — это щипок, а не «иди сюда»
      const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.zoomT };
      if (T - (lastTap.t || -9) < 0.4) { player.target = lastTap.prev; tapFx = null; }
    }
  }, true);
  addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size >= 2) { const [a, b] = [...touches.values()]; setZoom(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); }
  });
  const untouch = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  addEventListener('pointerup', untouch); addEventListener('pointercancel', untouch);
  const lastTap = { t: -9, prev: null };
  $('btnZoomIn').onclick = () => setZoom(view.zoomT * 1.25);
  $('btnZoomOut').onclick = () => setZoom(view.zoomT / 1.25);
  addEventListener('keydown', (e) => {
    if (mode !== 'play') return;
    if (e.key === '+' || e.key === '=') setZoom(view.zoomT * 1.25);
    else if (e.key === '-' || e.key === '_') setZoom(view.zoomT / 1.25);
  });
  cv.addEventListener('pointerdown', (e) => {
    if (mode !== 'play') return;
    if (pinch || touches.size > 1) return;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    // героиня дома: нажали на дом или надпись — выходит
    if (player.home) { if (onHouse(wx, wy)) wakeUp(); return; }
    if (player.busy) return;
    player.after = null;
    // нажали прямо на ЗАКРЫТУЮ дверь/калитку — сначала она (иначе её перехватывали действия у загона)
    const door = W.gateAt(wx, wy);
    const useGate = () => {
      if (doorNear(door)) useDoor(door);
      else { player.target = [door.x, door.y + 40]; player.stuck = 0; player.after = door; tapFx = { x: door.x, y: door.y + 40, t: 0 }; }
    };
    if (door && !GATE_WANT.get(door)) { useGate(); return; }
    // куча сена / вилы / корыта: нажали на них или на значок над ними, стоя рядом
    const A = nextAct();
    if (A && (Math.hypot(wx - A.x, wy - (A.y - 20)) < 50 || Math.hypot(wx - A.x, wy - (A.y - 75)) < 24)) { A.run(); return; }
    // нажали на саму Айлин — она машет нам рукой
    if (Math.abs(wx - player.x) < 16 && wy > player.y - SIZE.hero && wy < player.y + 4) { player.target = null; waveHello(2.2); return; }
    // открытая дверь: рядом — закрыть, далеко — подойти
    if (door) { useGate(); return; }
    lastTap.t = T; lastTap.prev = player.target;
    player.target = [wx, wy]; player.stuck = 0;
    tapFx = { x: wx, y: wy, t: 0 };
  });
  addEventListener('keydown', (e) => {
    if (mode !== 'play') return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (player.home) { wakeUp(); return; }
      if (player.busy) return;
      const door = W.gates.filter(doorNear).sort((a, b) => Math.hypot(player.x - a.x, player.y - a.y) - Math.hypot(player.x - b.x, player.y - b.y))[0];
      const A = nextAct();
      if (Dlg.active) Dlg.next();
      else if (door && !GATE_WANT.get(door) && (!A || A.sym === '?')) useDoor(door);   // закрытая калитка рядом важнее подсказки
      else if (A) A.run(); else if (door) useDoor(door);
      return;
    }
    if (player.home || player.busy) return;
    keys.add(e.key.toLowerCase());
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // ---------- кнопки A / B / C ----------
  const nearestDoor = () => W.gates.filter(doorNear).sort((a, b) => Math.hypot(player.x - a.x, player.y - a.y) - Math.hypot(player.x - b.x, player.y - b.y))[0];
  // A — взять предмет / корм, покормить, положить в корыто (всё, что сейчас показывает «+»)
  function btnTake() {
    if (Dlg.active) { Dlg.next(); return; }
    if (player.home) { wakeUp(); return; }
    if (player.busy) return;
    const A = nextAct();
    if (A) A.run(); else sayOver(tr('nothingToTake'), 2.4);
  }
  // B — выбросить то, что в руках (корм высыпается); инструмент возвращается на своё место
  function btnDrop() {
    if (player.home || player.busy) return;
    if (player.carry) {
      player.carry = null; player.fruit = null; player.fruitImg = null; player.fruitKind = null;
      sayOver(tr('dropped'), 1.6);
      return;
    }
    if (player.tool) {
      const A = nextAct();
      if (A && A.sym === '↓') { A.run(); return; }      // рядом место инструмента — вернуть
      sayOver(tr('cantDropTool', TOOL_NAME[player.tool], TOOL_HOME[player.tool]), 3);
      return;
    }
    sayOver(tr('handsEmpty'), 1.6);
  }
  // C — открыть / закрыть дверь или калитку рядом
  function btnDoor() {
    if (player.home) { wakeUp(); return; }
    if (player.busy) return;
    const door = nearestDoor();
    if (door) useDoor(door); else sayOver(tr('noDoor'), 2.4);
  }
  for (const [id, fn] of [['btnA', btnTake], ['btnB', btnDrop], ['btnC', btnDoor]]) {
    $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (mode === 'play') fn(); });
  }
  // на клавиатуре: Z / X / C (я / ч / с)
  addEventListener('keydown', (e) => {
    if (mode !== 'play' || e.repeat) return;
    const k = e.key.toLowerCase(), fn = { z: btnTake, 'я': btnTake, x: btnDrop, 'ч': btnDrop, c: btnDoor, 'с': btnDoor }[k];
    if (!fn) return;
    const b = $(fn === btnTake ? 'btnA' : fn === btnDrop ? 'btnB' : 'btnC'); b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 120);
    fn();
  });

  // ---------- джойстик: венок на месте, цветок тянется за пальцем (не дальше края), Маша идёт туда ----------
  const joy = { id: null, x: 0, y: 0 };
  {
    const el = $('joy'), knob = $('joyKnob');
    const move = (e) => {
      const r = el.getBoundingClientRect(), R = r.width * 0.3;          // насколько цветок может отойти от середины
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      joy.x = dx / R; joy.y = dy / R;
    };
    const end = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; el.classList.remove('on'); knob.style.transform = ''; };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); joy.id = e.pointerId; el.setPointerCapture(e.pointerId); el.classList.add('on'); move(e); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) move(e); });
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
  addEventListener('blur', () => keys.clear());

  // ---------- сено ----------
  let nearHay = false, nearFork = null;
  const girlW = (a, b) => (save.gender !== 'boy' ? a : b);
  function takeHay() {
    if (player.tool === 'scoop') { sayOver(tr('hayNotScoop'), 3); return; }
    if (!player.tool) { toast(tr('hayNeedFork')); return; }
    if (player.carry === 'hay') { toast(tr('hayAlready')); return; }
    player.carry = 'hay';
    toast(tr('gotHay'));
  }
  /* Что сделать у кучи сена и вил (одна кнопка): взять вилы → набрать сено → воткнуть вилы обратно */
  function nextAct() {
    const f = nearFork, H = W.hay;
    const at = (o) => (H && nearHay && Math.hypot(o.x - H.x, o.y - H.y) < 50 ? H : o);   // вилы в куче — значок над кучей
    // вилы и сено в амбаре: пока двери закрыты — не достать
    // — нажатие (или пробел) сначала открывает двери
    const shut = (o) => W.behindClosedDoor(o.x, o.y), open = (o) => ({ ...at(o), sym: '🚪', run: () => useDoor(shut(o)) });
    if (f && !f.taken) return shut(f.o) ? open(f.o) : { ...at(f.o), sym: '+', run: useFork };
    if (player.tool === 'fork' && nearHay && player.carry !== 'hay') return shut(H) ? open(H) : { ...H, sym: '+', run: takeHay };
    if (f && f.taken) return shut(f.o) ? open(f.o) : { ...at(f.o), sym: '↓', run: useFork };
    if (nearHay) return shut(H) ? open(H) : { ...H, sym: '?', run: takeHay };
    // загон рядом и в руках корм: покормить (или подсказать, что этот корм им не подходит)
    // корыто рядом и что-то в руках — положить туда (любое: сено, овощи, зерно, воду)
    if (player.carry) {
      let best = null, bd = 52;
      for (const tr of W.troughs) { const d = Math.hypot(player.x - tr.o.x, player.y - (tr.o.y - 8)); if (d < bd) { bd = d; best = tr; } }
      if (best) {
        // класть можно только то, что едят/пьют животные этого загона
        const zt = tasksOn().filter((t) => t.zone === best.zone), eats = [...new Set(zt.map((t) => t.food))];
        const m = { x: best.o.x, y: best.o.y - best.o.h - 14 + 75 };
        if (!zt.length || eats.includes(player.carry)) return { ...m, sym: '+', run: () => fillTrough(best) };
        return { ...m, sym: '?', run: () => sayOver(tr('notEat', zt[0].who, eats.map((f) => FOOD[f].acc).join(tr('or'))), 3) };
      }
    }
    // загон без корыт: корм кладут у калитки
    const pens = nearPens().filter((t) => !W.troughs.some((tr) => tr.zone === t.zone));
    if (pens.length && player.carry) {
      const pen = pens.find((t) => t.food === player.carry) || pens[0], sp = taskSpot(pen), m = { x: sp.mx, y: sp.my + 75 };
      if (player.carry === pen.food) return { ...m, sym: '+', run: () => feed(pen) };
      const other = tasksOn().some((t) => t.zone === pen.zone && t.food === player.carry && !save.done.includes(t.id));
      return { ...m, sym: '?', run: () => sayOver(other ? tr('otherTrough', pen.food === 'water', FOOD[player.carry].acc)
        : tr('penWants', pen.who, pens.map((t) => FOOD[t.food].acc).join(tr('and')), FOOD[player.carry].acc), 3) };
    }
    const busy = () => sayOver(tr(player.tool === 'fork' ? 'busyFork' : player.tool === 'scoop' ? 'busyScoop' : player.tool === 'shovel' ? 'busyShovel' : 'busy'), 2.4);
    // бочки, ведро, колодец стоят рядом — действует то, к чему героиня ближе
    const cands = [];
    const add = (o, r, f) => { const d = Math.hypot(player.x - o.x, player.y - o.y); if (d < r) { const a = f(); if (a) cands.push({ d, a: { ...o, ...a } }); } };
    for (const fs of W.foods) add(fs.p, fs.o.layer === 'ground' ? 80 : 65, () => {
      // источник за закрытыми дверями (теплица) — нажатие сначала открывает двери
      const shutG = fs.o.layer === 'ground' && W.behindClosedDoor(fs.p.x, fs.p.y - 20);
      if (shutG) return { sym: '🚪', run: () => useDoor(shutG) };
      if (fs.food === 'grain') {        // бочка с зерном: взять ковш → зачерпнуть → вернуть ковш
        if (player.tool === 'scoop' && player.toolFrom === fs) {
          if (player.carry !== 'grain') return { sym: '+', run: () => { player.carry = 'grain'; toast(tr('gotGrain')); } };
          return { sym: '↓', run: () => { fs.out = false; player.tool = null; player.toolFrom = null; player.carry = null; } };
        }
        if (player.tool) return { sym: '?', run: busy };
        if (player.carry) return { sym: '?', run: () => sayOver(tr('handsBusy'), 2.4) };
        if (!fs.out) return { sym: '+', run: () => { fs.out = true; player.tool = 'scoop'; player.toolFrom = fs; toast(tr('gotScoop')); } };
        return null;
      }
      // бочка с овощами: набрать овощи в ведро
      if (player.tool === 'bucket' && !player.carry) return { sym: '+', run: () => { player.carry = 'carrots'; toast(tr('gotVeg')); } };
      if (player.tool === 'bucket' && player.carry === 'water') return { sym: '?', run: () => sayOver(tr('bucketHasWater'), 2.6) };
      if (!player.tool) return { sym: '?', run: () => sayOver(tr('vegInBucket'), 2.8) };
      if (player.tool !== 'bucket') return { sym: '?', run: busy };
      return null;
    });
    // ведро: взять пустое / поставить обратно
    for (const bk of W.buckets) add(bk.o, 55, () => {
      if (!bk.taken && !player.tool && !player.carry) return { sym: '+', run: () => { bk.taken = true; player.tool = 'bucket'; player.toolFrom = bk; toast(tr('gotBucket')); } };
      if (bk.taken && player.toolFrom === bk) return { sym: '↓', run: () => { bk.taken = false; player.tool = null; player.toolFrom = null; player.carry = null; } };
      return null;
    });
    // колодец: набрать воды в ведро
    if (MAP.well) add(MAP.well, 80, () => {
      if (player.tool === 'bucket' && !player.carry) return { sym: '+', run: () => { player.carry = 'water'; toast(tr('gotWater')); } };
      if (!player.tool) return { sym: '?', run: () => sayOver(tr('needBucket'), 3) };
      if (player.tool !== 'bucket') return { sym: '?', run: busy };
      return null;
    });
    // фруктовое дерево / ягодный куст: сорвать один фрукт (руки должны быть свободны)
    for (const o of MAP.objects) {
      const kind = o.key.startsWith('plants/') && o.key.slice(7);
      if (!kind || !FRUIT[kind]) continue;
      add({ x: o.x, y: o.y }, kind.startsWith('tree') ? 60 : 48, () => {
        if (player.tool || player.carry) return null;
        return { sym: '+', run: () => {
          player.carry = 'fruit'; player.fruit = FRUIT[kind]; player.fruitKind = kind; player.fruitImg = IMG['items/../fruits/' + kind] ? 'items/../fruits/' + kind : null;
          toast(tr('picked', FRUIT[kind][1], FRUIT[kind][0]));
        } };
      });
    }
    // лопата: взять / воткнуть обратно
    for (const sh of W.shovels) add(sh.o, 55, () => {
      if (!sh.taken && !player.tool && !player.carry) return { sym: '+', run: () => { sh.taken = true; player.tool = 'shovel'; player.toolFrom = sh; toast(tr('gotShovel')); } };
      if (sh.taken && player.toolFrom === sh) return { sym: '↓', run: () => { sh.taken = false; player.tool = null; player.toolFrom = null; player.carry = null; } };
      return null;
    });
    // сорняк или трава — выкопать лопатой (зелень остаётся на лопате)
    const dig = (w, remove) => add({ x: w.x, y: w.y }, 38, () => {
      if (player.tool !== 'shovel') return null;
      if (player.carry && player.carry !== 'greens') return null;
      return { sym: '+', run: () => { remove(); player.carry = 'greens'; toast(tr('dugWeed')); } };
    });
    for (const o of MAP.objects) if (isWeed(o) && !DUG.has(o)) dig(o, () => DUG.add(o));
    for (const w of WEEDS) dig(w, () => WEEDS.splice(WEEDS.indexOf(w), 1));
    // упавший плод на земле — подобрать в ведро
    for (const d of DROPS) {
      if (T - d.t0 < DROP_FLY) continue;
      add({ x: d.x1, y: d.y1 }, 40, () => {
        if (player.tool !== 'bucket') return { sym: '?', run: () => sayOver(tr('pickInBucket'), 2.8) };
        if (player.carry && player.carry !== d.kind) return { sym: '?', run: () => sayOver(tr('bucketHas', FOOD[player.carry].acc), 2.6) };
        return { sym: '+', run: () => {
          DROPS.splice(DROPS.indexOf(d), 1); player.carry = d.kind;
          toast(tr('pickedUp', FOOD[d.kind].badge));
        } };
      });
    }
    // у калитки загона с овощами / фруктом / ягодами — кинуть горкой в загон
    const treat = player.carry === 'greens' ? 'greens' : player.carry === 'carrots' ? 'veg' : player.carry === 'fruits' ? 'fruit' : player.carry === 'berries' ? 'berry'
      : player.carry === 'fruit' ? (player.fruitKind || '').startsWith('bush') ? 'berry' : 'fruit' : null;
    // из ведра — только находясь внутри загона (кидает прямо перед собой); фрукт в руке и траву с лопаты — через забор у калитки
    const inPen = (z) => player.x > z.x - 110 && player.x < z.x + 95 && player.y > z.y - 100 && player.y < z.y - 8;
    if (treat && player.tool === 'bucket') for (const z of MAP.zones) {
      if (!TREATS[z.id] || z.off) continue;
      if (inPen(z)) add({ x: player.x, y: player.y }, 1, () => {
        if (!TREATS[z.id].includes(treat)) return { sym: '?', run: () => sayOver(tr('notEatTreat', PEN_WHO[z.id], TREATS[z.id].map((k) => TREAT_NAME[k]).join(', ')), 3) };
        return { sym: '+', run: () => throwPile(z, treat, { x: player.x + (player.face === 'side' ? player.dir * 22 : 0), y: player.y + (player.face === 'down' ? 14 : player.face === 'up' ? -14 : 2) }) };
      });
      else add({ x: z.x, y: z.y }, 70, () => ({ sym: '?', run: () => sayOver(tr('enterPenFirst'), 2.6) }));
    }
    if (treat && player.tool !== 'bucket') for (const z of MAP.zones) {
      if (!TREATS[z.id] || z.off) continue;
      add({ x: z.x, y: z.y }, 70, () => {
        if (!TREATS[z.id].includes(treat)) return { sym: '?', run: () => sayOver(tr('notEatTreat', PEN_WHO[z.id], TREATS[z.id].map((k) => TREAT_NAME[k]).join(', ')), 3) };
        return { sym: '+', run: () => throwPile(z, treat) };
      });
    }
    // фрукт в руках и рядом животное — угостить
    if (player.carry === 'fruit') for (const a of W.animals) add({ x: a.x, y: a.y }, 55, () => ({ sym: '+', run: () => {
      toast(tr('ateFruit', player.fruit[1], ANIMAL_NAME[a.kind] || tr('animal'), player.fruit[0], a.kind === 'goat' || a.kind === 'rabbit'));
      a.happy = T + 2.5; player.carry = null; player.fruit = null;
    } }));
    if (cands.length) return cands.sort((a, b) => a.d - b.d)[0].a;
    // фрукт в руках и рядом ничего нет — съесть самой (значок над героиней)
    if (player.carry === 'fruit') return { x: player.x, y: player.y - SIZE.hero - 4 + 75, sym: '😋', run: () => {
      toast(tr('youAte', player.fruit[1], player.fruit[0])); sayOver(tr('yummy'), 2);
      player.carry = null; player.fruit = null;
    } };
    return null;
  }
  // ---------- кормление ----------
  const TROUGH_FULL = { hay: 'items/trough_hay', carrots: 'items/trough_veg', water: 'items/trough_water' };   // картинки полного корыта
  const fed = new Map();                               // id задания → где лежит корм в загоне
  // куда класть корм для задания: в корыто загона (еда / вода / с перегородкой) или, если корыт нет, к калитке
  const troughFor = (t) => {
    const isW = t.food === 'water';
    return W.troughs.find((x) => x.zone === t.zone && (x.split || x.water === isW)) || (!isW && W.troughs.find((x) => x.zone === t.zone && !x.water)) || null;
  };
  const taskSpot = (t) => {
    const tr = troughFor(t);
    if (tr) return { x: tr.o.x, y: tr.o.y - 8, r: 52, mx: tr.o.x, my: tr.o.y - tr.o.h - 14 };   // подойти к самому корыту
    const z = zoneOf(t);
    return { x: z.x, y: z.y, r: 85, mx: z.mx ?? z.x, my: z.my ?? z.y - SIZE.hero - 28 };
  };
  const nearPens = () => tasksOn().filter((t) => { const sp = taskSpot(t); return !save.done.includes(t.id) && Math.hypot(player.x - sp.x, player.y - sp.y) < sp.r; });
  const nearFood = () => W.foods.find((f) => Math.hypot(player.x - f.o.x, player.y - f.o.y) < 65);
  /* Новые сорняки сами вырастают на проходимой земле (не больше 6 сразу) */
  const WEEDS = [];
  let weedNext = 8;
  function updateWeeds() {
    if (T < weedNext) return;
    weedNext = T + 15 + Math.random() * 15;
    if (WEEDS.length >= 6) return;
    for (let i = 0; i < 30; i++) {
      const x = 60 + Math.random() * (MAP.W - 120), y = 120 + Math.random() * (MAP.H - 180);
      if (W.blocked(x, y) || Math.hypot(x - player.x, y - player.y) < 60) continue;
      if (MAP.zones.some((z) => Math.abs(x - z.x) < 130 && y < z.y && y > z.y - 150)) continue;   // не в загонах
      WEEDS.push({ x, y, t0: T }); return;
    }
  }
  function drawWeeds(list) {
    for (const w of WEEDS) list.push({ y: w.y, draw: (c) => {
      const s = imgSprite('items/weed', 22); if (!s) return;
      const k = Math.min(1, (T - w.t0) / 0.8);          // прорастает: растёт из земли
      c.drawImage(s.c, w.x - s.w * k / 2, w.y - s.h * k, s.w * k, s.h * k);
    } });
  }
  /* Плоды сами падают с деревьев, кустов и из теплицы: подскок вверх, падение на землю рядом; подбирают ведром */
  const DROPS = [], DROP_FLY = 0.9, DROP_MAX = 10;
  let dropNext = 4;
  function dropSources() {
    const out = [];
    for (const o of MAP.objects) {
      const k = o.key.startsWith('plants/') && o.key.slice(7);
      if (k && FRUIT[k]) out.push({ o, kind: k.startsWith('bush') ? 'berries' : 'fruits', img: 'items/../fruits/' + k });
      else if (o.tag === 'food_carrots' && o.layer === 'ground') out.push({ o, kind: 'carrots', veg: true });   // теплица
    }
    return out;
  }
  function updateDrops() {
    if (T < dropNext) return;
    dropNext = T + 5 + Math.random() * 7;
    if (DROPS.length >= DROP_MAX) return;
    const src = dropSources(); if (!src.length) return;
    const s = src[Math.floor(Math.random() * src.length)], o = s.o;
    let x0, y0, x1, y1;
    if (s.veg) {                                  // из теплицы — выкатывается из входа на землю перед ней
      x0 = o.x; y0 = o.y + o.h / 2 - 20; x1 = o.x + (Math.random() - 0.5) * 70; y1 = o.y + o.h / 2 + 14 + Math.random() * 16;
    } else {
      const h = o.h || 60; x0 = o.x + (Math.random() - 0.5) * h * 0.4; y0 = o.y - h * 0.55;
      x1 = o.x + (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 18); y1 = o.y + 6 + Math.random() * 12;
    }
    const img = s.veg ? 'items/../garden/' + DROP_VEG[Math.floor(Math.random() * DROP_VEG.length)] : s.img;
    DROPS.push({ x0, y0, x1, y1, t0: T, kind: s.kind, img });
  }
  function drawDrops(list) {
    for (const d of DROPS) list.push({ y: d.y1, draw: (c) => {
      const u = Math.min(1, (T - d.t0) / DROP_FLY);
      const x = d.x0 + (d.x1 - d.x0) * u;
      // подскок вверх, потом падение; в конце маленький отскок от земли
      const y = d.y0 + (d.y1 - d.y0) * u * u - 26 * Math.sin(Math.PI * Math.min(1, u * 1.15)) - (u >= 1 ? Math.max(0, 3 * Math.sin((T - d.t0 - DROP_FLY) * 14) * Math.exp(-(T - d.t0 - DROP_FLY) * 6)) : 0);
      const s = imgSprite(d.img, 13); if (!s) return;
      if (u >= 1) Sk.shadow(c, x, d.y1, s.w * 0.4, s.w * 0.12, 0.2);
      c.drawImage(s.c, x - s.w / 2, y - s.h, s.w, s.h);
    } });
  }
  /* Горки угощений в загонах: zone id → [{ x, y, kind }] (до 3 штук на загон, исчезают в новый день) */
  const PILES = new Map();
  function throwPile(z, kind, at) {
    const list = PILES.get(z.id) || [];
    const spot = at ? { x: at.x, y: at.y, kind, amt: 1 } : { x: z.x + (Math.random() - 0.5) * 120, y: z.y - 55 - Math.random() * 50, kind, amt: 1 };
    list.push(spot); if (list.length > 3) list.shift(); PILES.set(z.id, list);   // животные сами идут к горке (pilesOf)
    // овощи для коровок засчитывают их задание
    const t = tasksOn().find((x) => x.zone === z.id && x.food === player.carry && !save.done.includes(x.id));
    const name = ANIMAL_NAME[z.id];
    player.carry = null; player.fruit = null; player.fruitImg = null; player.fruitKind = null;
    if (player.tool === 'bucket') { /* ведро остаётся в руках пустым */ }
    if (t) completeTask(t); else toast(tr('putTreat', kind === 'veg' ? '🥕' : kind === 'berry' ? '🍓' : kind === 'greens' ? '🌿' : '🍎', at, TREAT_NAME[kind]));
  }
  window.pilesOf = (kind) => PILES.get(kind) || [];
  function drawPiles(list, c) {
    for (const [z, ps] of PILES) {
      for (let i = ps.length - 1; i >= 0; i--) if (ps[i].amt <= 0) ps.splice(i, 1);     // съели — горки нет
      for (const p of ps) list.push({ y: p.y, draw: (cc) => {
        const s = imgSprite(PILE_IMG[p.kind], 30); if (!s) return;
        const k = 0.3 + 0.7 * Math.sqrt(p.amt);                  // чем меньше осталось, тем меньше горка
        Sk.shadow(cc, p.x, p.y - 1, s.w * 0.42 * k, s.w * 0.1 * k, 0.22);
        cc.drawImage(s.c, p.x - s.w * k / 2, p.y - s.h * k, s.w * k, s.h * k);
      } });
    }
  }
  /* Положить то, что в руках, в корыто. Задание засчитывается, если этот корм нужен животным этого загона. */
  const TROUGH_IN = new Map();                         // корыто → что в нём ({ water, food } у корыта с перегородкой)
  window.onTroughEmpty = (tr) => {                       // животные всё съели/выпили — корыто снова пустое
    const i = W.troughs.indexOf(tr);
    ALT_ON.set(tr.o, false); TROUGH_IN.delete(tr); fed.delete('tr' + i);
  };
  function fillTrough(tr) {
    const what = player.carry; player.carry = null;
    const o = tr.o, i = W.troughs.indexOf(tr);
    TROUGH_LEVEL.set(o, TROUGH_FULL_TIME);
    fed.delete('tr' + i);
    if (tr.split) {                                    // с перегородкой: вода — в одну половину, корм — в другую
      const c = TROUGH_IN.get(tr) || {}; if (what === 'water') c.water = true; else c.food = what; TROUGH_IN.set(tr, c);
      ALT_ON.set(o, c.water && c.food ? 'items/trough_split_both' : c.water ? 'items/trough_split_water' : 'items/trough_split_grain');
    } else {
      TROUGH_IN.set(tr, what);
      if (TROUGH_FULL[what] && IMG[TROUGH_FULL[what]]) ALT_ON.set(o, TROUGH_FULL[what]);
      else { ALT_ON.set(o, false); fed.set('tr' + i, { x: o.x, y: o.y + 0.5, food: what, inTrough: { cy: o.y - o.h * 0.52, h: o.h } }); }   // зерно — россыпью
    }
    const t = tasksOn().find((x) => x.zone === tr.zone && x.food === what && !save.done.includes(x.id));
    if (t) completeTask(t);
    else toast(tr('putTrough', FOOD[what].badge));
  }
  function completeTask(t) {
    save.done.push(t.id); persist(); refreshQuest();
    thumbsUp(player.x, player.y - 20); waveHello(1.8, 0.3);
    toast(tr('taskDone', FOOD[t.food].badge, t.who, t.food === 'water'));
    if (tasksOn().every((x) => save.done.includes(x.id))) {
      help.allDoneAt = T;
    }
  }
  function feed(t) {
    const z = zoneOf(t);
    // еда — в корыто загона (если оно есть), вода — в поилку рядом с ним
    const tr = troughFor(t);
    const spot = { x: z.x + (Math.random() - 0.5) * 30, y: z.y - 70, food: player.carry };
    if (tr && tr.split) {
      // корыто с перегородкой: картинка по тому, что в нём уже есть (вода / корм / и то и другое)
      const zt = tasksOn().filter((x) => x.zone === t.zone), has = (f) => f === t.food || zt.some((x) => x.food === f && save.done.includes(x.id));
      const w = has('water'), g = zt.some((x) => x.food !== 'water' && (x.id === t.id || save.done.includes(x.id)));
      ALT_ON.set(tr.o, w && g ? 'items/trough_split_both' : w ? 'items/trough_split_water' : 'items/trough_split_grain');
      spot.none = true; spot.x = tr.o.x; spot.y = tr.o.y + 0.5;
    } else if (tr) {
      const th = tr.o.h;
      if (t.food === 'water' && !tr.water) { spot.x = tr.o.x - objW(tr.o) - 6; spot.y = tr.o.y - 2; }   // нет корыта для воды — маленькая поилка
      else if (TROUGH_FULL[t.food] && IMG[TROUGH_FULL[t.food]]) { ALT_ON.set(tr.o, TROUGH_FULL[t.food]); spot.none = true; }   // корыто, полное сена / овощей
      else { spot.x = tr.o.x; spot.y = tr.o.y + 0.5; spot.inTrough = { cy: tr.o.y - th * 0.52, h: th }; }
    } else if (t.food === 'water') { spot.x = z.x + 40; spot.y = z.y - 62; }
    fed.set(t.id, spot);
    for (const a of W.animals) if (a.kind === t.zone) a.feed = { x: spot.x, y: spot.y + 6 };   // животные идут к еде
    player.carry = null;
    save.done.push(t.id); persist(); refreshQuest();
    toast(tr('taskDone', FOOD[t.food].badge, t.who, t.food === 'water'));
    if (tasksOn().every((x) => save.done.includes(x.id))) {
      help.allDoneAt = T;
    }
  }
  // вилы: взять или вернуть на то же место (если сено на вилах — оно возвращается в кучу)
  function useFork() {
    const f = nearFork; if (!f) return;
    if (!f.taken) {
      if (player.tool) return;
      f.taken = true; player.tool = 'fork'; player.toolFrom = f; if (f.barn) ALT_ON.set(f.barn, true);
      toast(tr('gotFork'));
    } else if (player.toolFrom === f) {
      f.taken = false; player.tool = null; player.toolFrom = null; player.carry = null; if (f.barn) ALT_ON.set(f.barn, false);
      toast(tr('forkBack'));
    }
  }
  /* Вилы в кисти героини (вызывает риг): точка хвата на черенке — в кисти, зубья вверх.
     На картинке вил: черенок вверху справа, зубья внизу слева; хват (128,67), зубья (45,165), направление 130°. */
  const FORK_H = 40, FORK_GRIP = [128, 67], FORK_TINE = [45, 165];
  function holdFork(c, top, low, view) {
    const spr = imgSprite('items/pitchfork', FORK_H), im = IMG['items/pitchfork']; if (!spr || !im) return;
    const sc = spr.h / im.height;
    const [hx, hy] = top;
    const hayIm = player.carry === 'hay' && IMG['items/pitchfork_hay'];
    // черенок проходит через обе кисти: направление «нижняя кисть → верхняя» = направление к зубьям
    const dxh = top[0] - low[0], dyh = top[1] - low[1];
    const rot = Math.hypot(dxh, dyh) > 2 ? Math.atan2(dyh, dxh) - Math.atan2(FORK_TINE[1] - FORK_GRIP[1], FORK_TINE[0] - FORK_GRIP[0])
      : { side: 184, front: 129, back: 149 }[view] * Math.PI / 180;
    if (hayIm) {
      // вилы с наколотым сеном — отдельная картинка: черенок там в 5.32 раза крупнее и повёрнут на 2.7°,
      // хват (761,328) — та же точка черенка, что и FORK_GRIP у пустых вил
      const k2 = sc / 5.32, hs = imgSprite('items/pitchfork_hay', Math.round(hayIm.height * k2)); if (!hs) return;
      c.save(); c.translate(hx, hy); c.rotate(rot - 2.7 * Math.PI / 180);
      c.drawImage(hs.c, -761 * k2, -328 * k2, hs.w, hs.h);
      c.restore();
      return;
    }
    c.save(); c.translate(hx, hy); c.rotate(rot); c.scale(sc, sc);
    c.drawImage(spr.c, -FORK_GRIP[0], -FORK_GRIP[1], im.width, im.height);
    c.restore();
    if (player.carry === 'hay') {          // охапка на зубьях, стоит ровно
      const hay = imgSprite('items/hay_pile', 17); if (!hay) return;
      const dx = (FORK_TINE[0] - FORK_GRIP[0]) * sc, dy = (FORK_TINE[1] - FORK_GRIP[1]) * sc;
      const px = hx + dx * Math.cos(rot) - dy * Math.sin(rot), py = hy + dx * Math.sin(rot) + dy * Math.cos(rot);
      c.drawImage(hay.c, px - hay.w / 2, py - hay.h * 0.8, hay.w, hay.h);
    }
  }
  /* Ковш в руках (вызывает риг): хват (600,135) на ручке — в кисти, черпак (230,500) вперёд; с зерном — полный ковш */
  const SCOOP_H = 17, SCOOP_GRIP = [600, 135];
  function holdScoop(c, top, low, view) {
    const key = player.carry === 'grain' ? 'items/scoop_full' : 'items/scoop_empty';
    const spr = imgSprite(key, SCOOP_H), im = IMG[key]; if (!spr || !im) return;
    const sc = spr.h / im.height;
    // черпак: сбоку — вперёд, чуть вверх; спереди — к нам и в сторону; со спины — почти не виден
    const rot = { side: -150, front: 30, back: -120 }[view] * Math.PI / 180;   // спереди и со спины черпак смотрит внутрь, к другой руке
    c.save(); c.translate(top[0], top[1]); c.rotate(rot);
    c.drawImage(spr.c, -SCOOP_GRIP[0] * sc, -SCOOP_GRIP[1] * sc, spr.w, spr.h);
    c.restore();
  }
  /* Лопата в руках — как вилы: хват на черенке (118,72), штык (40,170); с выкопанной травой — пучок на штыке */
  const SHOVEL_GRIP = [118, 72], SHOVEL_TIP = [40, 170];
  function holdShovel(c, top, low, view) {
    const spr = imgSprite('items/shovel', 36), im = IMG['items/shovel']; if (!spr || !im) return;
    const sc = spr.h / im.height, dxh = top[0] - low[0], dyh = top[1] - low[1];
    const rot = Math.hypot(dxh, dyh) > 2 ? Math.atan2(dyh, dxh) - Math.atan2(SHOVEL_TIP[1] - SHOVEL_GRIP[1], SHOVEL_TIP[0] - SHOVEL_GRIP[0]) : Math.PI;
    c.save(); c.translate(top[0], top[1]); c.rotate(rot);
    c.drawImage(spr.c, -SHOVEL_GRIP[0] * sc, -SHOVEL_GRIP[1] * sc, spr.w, spr.h);
    c.restore();
    if (player.carry === 'greens') {
      const g = imgSprite('items/weed', 14); if (!g) return;
      const dx = (SHOVEL_TIP[0] - SHOVEL_GRIP[0]) * sc * 0.8, dy = (SHOVEL_TIP[1] - SHOVEL_GRIP[1]) * sc * 0.8;
      const px = top[0] + dx * Math.cos(rot) - dy * Math.sin(rot), py = top[1] + dx * Math.sin(rot) + dy * Math.cos(rot);
      c.drawImage(g.c, px - g.w / 2, py - g.h * 0.8, g.w, g.h);
    }
  }
  /* Ведро в руках: держит за край обеими руками перед собой; картинка по содержимому.
     rim — где на картинке край ведра (доля высоты), h — высота, чтобы ширина ведра была одна и та же */
  const BUCKET = { empty: { key: 'items/bucket_empty', h: 20, rim: 0.06 }, carrots: { key: 'items/bucket_full', h: 27, rim: 0.4 }, water: { key: 'items/bucket_water_full', h: 20, rim: 0.05 },
    berries: { key: 'items/bucket_berries', h: 26, rim: 0.4 } };   // ведро, полное ягод (горка нарисована в картинке)
  function holdBucket(c, top, low, view) {
    const b = BUCKET[player.carry] || BUCKET.empty, spr = imgSprite(b.key, b.h); if (!spr) return;
    const x = (top[0] + low[0]) / 2, y = Math.max(top[1], low[1]) - 1;
    const pile = player.carry === 'fruits' ? 'items/pile_fruit' : null;
    const ps = pile && imgSprite(pile, 11);
    if (ps) c.drawImage(ps.c, x - ps.w / 2, y - spr.h * b.rim - ps.h * 0.55, ps.w, ps.h);   // горка над краем ведра
    c.drawImage(spr.c, x - spr.w / 2, y - spr.h * b.rim, spr.w, spr.h);
  }
  /* Запасной вариант (герой без перекладки): вилы рядом с героем.
     Вилы в руках: зубья вверх и вперёд; если на них сено — охапка на зубьях.
     front: рисуем перед героем (сбоку и спереди) или за ним (вид со спины). */
  function drawFork(c, t, front) {
    const f = player.face, d = player.dir;
    if (front !== (f !== 'up')) return;
    const spr = imgSprite('items/pitchfork', FORK_H); if (!spr) return;
    const bob = player.walk ? Math.abs(Math.sin(t * 14)) * 1.8 : 0;
    // точка хвата и наклон для каждого вида (картинка: зубья внизу слева, черенок вверху справа)
    // на картинке зубья смотрят вниз-влево (135°); поворачиваем так, чтобы зубья были вверху
    const pose = f === 'side' ? { x: d * 17, y: -31, a: Math.PI, m: d }       // сбоку — наклонены вперёд, сено перед лицом
      : f === 'down' ? { x: -16, y: -32, a: Math.PI * 0.64, m: 1 } : { x: 16, y: -36, a: Math.PI * 0.86, m: 1 };
    c.save();
    c.translate(player.x + pose.x, player.y + pose.y - bob);
    c.rotate(pose.a); c.scale(pose.m, 1);
    c.drawImage(spr.c, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    if (player.carry === 'hay') {          // охапка на зубьях, всегда стоит ровно
      const hay = imgSprite('items/hay_pile', 18);
      c.translate(-spr.w * 0.3, spr.h * 0.3); c.scale(pose.m, 1); c.rotate(-pose.a);
      if (hay) c.drawImage(hay.c, -hay.w / 2, -hay.h * 0.75, hay.w, hay.h);
    }
    c.restore();
  }

  // ---------- двери и отдых дома ----------
  const timers = [];
  const later = (sec, fn) => timers.push({ at: T + sec, fn });
  let say = null;                                   // облачко над героем: { text, until }
  const sayOver = (text, sec = 2.6) => helperSay(text, sec + 0.6);
  const doorNear = (g) => Math.hypot(player.x - g.x, player.y - (g.y + 30)) < 95;
  function useDoor(g) {
    if (g.home) { goRest(g); return; }
    // не закрывать, пока героиня стоит в проёме — иначе застрянет в закрытой калитке
    const inDoorway = GATE_WANT.get(g) && (GATE_GROUP.get(g) || [g]).some((h) => {
      const r = objSolid(h); return r && inRect(player.x, player.y, [r[0] - 12, r[1] - 14, r[2] + 24, r[3] + 26]);
    });
    if (inDoorway) { sayOver(tr('awayFromDoor'), 1.8); return; }
    W.toggleGate(g);
  }
  let restWalk = null;
  function goRest(g) {
    player.busy = true; player.after = null; keys.clear();
    sayOver(tr('timeToRest'), 2.4);
    later(1.1, () => { player.target = [g.x, g.y + 38]; player.stuck = 0; restWalk = g; });
  }
  function restArrived() {                          // дошла до двери: открыть, зайти, закрыть
    const g = restWalk; restWalk = null;
    player.face = 'up';
    W.toggleGate(g, true);
    later(0.5, () => { player.home = true; player.busy = false; say = null; });
    later(1.1, () => W.toggleGate(g, false));
  }
  function wakeUp() {
    const g = W.homeDoor; if (!g || player.busy) return;
    player.busy = true;
    W.toggleGate(g, true);
    later(0.5, () => {
      player.home = false; player.x = g.x; player.y = g.y + 42; player.face = 'down'; player.target = null;
      sayOver(tr('rested'), 2.8);
      // новый день: животные снова голодные
      if (save.done.length || TROUGH_IN.size) { save.done = []; persist(); refreshQuest(); fed.clear(); for (const a of W.animals) a.feed = null; for (const tr of W.troughs) { ALT_ON.set(tr.o, false); TROUGH_LEVEL.set(tr.o, 0); } TROUGH_IN.clear(); PILES.clear(); help.allDoneAt = null; for (const o of MAP.objects) DUG.delete(o); }
    });
    later(1.1, () => { W.toggleGate(g, false); player.busy = false; });
  }
  function onHouse(wx, wy) {                        // нажали на дом, его дверь или надпись над ним
    const g = W.homeDoor; if (!g) return false;
    return Math.abs(wx - g.x) < 160 && wy > g.y - 190 && wy < g.y + 40;
  }
  /* Облачко с текстом в экранных пикселях (не зависит от приближения) над точкой мира */
  function bubbleAt(text, wx, wy, t) {
    const s = vscale(), d = view.dpr;
    let sx = (wx - cam.x) * s; const sy = (wy - cam.y) * s;
    ctx.save(); ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.font = '18px Pangolin, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 26, h = 36, r = 14;
    const x = Math.max(8, Math.min(view.w - w - 8, sx - w / 2)), y = Math.max(8, sy - h - 12 + Math.sin(t * 3) * 1.5);   // не вылезать за экран
    sx = Math.max(x + 18, Math.min(x + w - 18, sx));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(sx + 8, y + h); ctx.lineTo(sx, y + h + 11); ctx.lineTo(sx - 8, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    ctx.fillStyle = '#fff8e7'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText(text, sx, y + h / 2 + 1);
    ctx.restore();
  }


  // ---------- столкновения ----------
  function blocked(x, y) {
    return W.blocked(x, y);
  }

  function updatePlayer(dt) {
    if (player.home) { player.walk = false; return; }
    if (player.after && doorNear(player.after)) { const g = player.after; player.after = null; player.target = null; useDoor(g); }
    if (restWalk && !player.target) restArrived();
    let vx = 0, vy = 0;
    if (keys.has('arrowleft') || keys.has('a') || keys.has('ф')) vx -= 1;
    if (keys.has('arrowright') || keys.has('d') || keys.has('в')) vx += 1;
    if (keys.has('arrowup') || keys.has('w') || keys.has('ц')) vy -= 1;
    if (keys.has('arrowdown') || keys.has('s') || keys.has('ы')) vy += 1;
    let pace = 1;
    if (vx || vy) { player.target = null; const d = Math.hypot(vx, vy); vx /= d; vy /= d; }
    else if (joy.id !== null && Math.hypot(joy.x, joy.y) > 0.2) {      // джойстик: чем дальше цветок, тем быстрее (до обычного шага)
      player.target = null; const d = Math.hypot(joy.x, joy.y); vx = joy.x / d; vy = joy.y / d; pace = Math.min(1, 0.45 + d * 0.7);
    }
    else if (player.target) {
      const dx = player.target[0] - player.x, dy = player.target[1] - player.y, d = Math.hypot(dx, dy);
      if (d < 5) player.target = null; else { vx = dx / d; vy = dy / d; }
    }
    const sp = 150 * dt * pace;
    const ox = player.x, oy = player.y;
    if (vx && !blocked(player.x + vx * sp, player.y)) player.x += vx * sp;
    if (vy && !blocked(player.x, player.y + vy * sp)) player.y += vy * sp;
    const moved = Math.hypot(player.x - ox, player.y - oy);
    player.walk = moved > 0.2;
    if (player.walk) { player.waveFrom = -99; player.stillFor = 0; }
    else if ((player.stillFor = (player.stillFor || 0) + dt) > 12) { player.stillFor = -20; waveHello(2); }   // долго стоит — помашет
    if (Math.abs(vx) > 0.15) player.dir = vx > 0 ? 1 : -1;
    if (player.walk) {
      const mx = player.x - ox, my = player.y - oy;
      player.face = Math.abs(mx) >= Math.abs(my) * 0.7 ? 'side' : my > 0 ? 'down' : 'up';
    }
    if (player.target && moved < sp * 0.15) { player.stuck += dt; if (player.stuck > 0.25) player.target = null; } else player.stuck = 0;
  }

  function checkZones() {
    nearHay = !!W.hay && Math.hypot(player.x - W.hay.x, player.y - W.hay.y) < 80;
    // вилы рядом: лежащие — взять; свои — положить обратно
    nearFork = null;
    for (const f of W.forks) if (Math.hypot(player.x - f.o.x, player.y - f.o.y) < 70 && (!f.taken ? !player.tool : player.toolFrom === f)) nearFork = f;

  }

  // ---------- помощник: голова в кружке справа сверху подсказывает, что делать сейчас ----------
  const help = { text: '', target: null, shownAt: -99, next: 0, say: null, allDoneAt: null };
  /* Разовая реплика (событие, подсказка «нельзя»): показывается сразу и держится sec секунд, потом снова текущая подсказка */
  function helperSay(text, sec = 3) { if (!helperOn) return; help.say = { text, until: T + sec }; help.text = text; showHelp(); }
  /* Помощника можно выключить в настройках: пропадают Айлин с подсказками и перчатка-указатель (запоминается) */
  let helperOn = true;
  try { helperOn = localStorage.getItem('farm.helper') !== 'off'; } catch (e) {}
  function applyHelper() {
    $('helper').hidden = !helperOn;
    $('setHelper').textContent = tr(helperOn ? 'helperOn' : 'helperOff');
    if (!helperOn) { help.target = null; help.text = ''; help.say = null; $('helperMsg').classList.add('hide'); }
  }
  $('setHelper').onclick = () => { helperOn = !helperOn; try { localStorage.setItem('farm.helper', helperOn ? 'on' : 'off'); } catch (e) {} applyHelper(); };
  applyHelper();
  onLang(() => { applyHelper(); help.text = ''; help.say = null; help.next = 0; });   // сменили язык — подсказка заново на новом языке
  const tapWord = () => tr(touch ? 'tapFinger' : 'tapMouse');
  const TOOL_NAME = new Proxy({}, { get: (_, k) => trd('tool', k) });
  const TOOL_HOME = new Proxy({}, { get: (_, k) => trd('toolHome', k) });
  /* Что подсказать сейчас: { text, target } — target — куда указать стрелкой */
  function helperHint() {
    const fork = W.forks[0], bucket = W.buckets[0], grain = W.foods.find((f) => f.food === 'grain');
    const veg = W.foods.find((f) => f.food === 'carrots' && f.o.layer === 'stand') || W.foods.find((f) => f.food === 'carrots');
    const at = (o) => o && { x: o.x, y: o.y };
    const spotOf = (t) => { const tr = troughFor(t); return tr ? { x: tr.o.x, y: tr.o.y } : at(zoneOf(t)); };
    if (player.home) return { text: tr('hResting') };
    // 1) научиться ходить
    if (!save.walked) return { text: tr('hHello', touch, tapWord()) };
    const todo = tasksOn().filter((t) => !save.done.includes(t.id));
    // 2) в руках что-то нужное — нести к корыту
    if (player.carry && player.carry !== 'fruit') {
      const t = todo.find((x) => x.food === player.carry);
      if (t) {
        const z = zoneOf(t), gate = W.gates.find((g) => Math.abs(g.x - z.x) < 70 && Math.abs(g.y - (z.y + 30)) < 40 && !GATE_WANT.get(g));
        if (gate && player.y > gate.y - 10) return { text: tr('hOpenGate'), target: { x: gate.x, y: gate.y - 10 } };
        return { text: tr('hBring', FOOD[t.food].acc, t.who), target: spotOf(t) };
      }
      if (['fruits', 'berries', 'greens', 'carrots'].includes(player.carry)) return { text: tr('hTreat'), target: at(zoneOf(todo[0] || TASKS[0])) };
    }
    if (player.carry === 'fruit') return { text: tr('hFruit') };
    // 3) все сыты
    if (!todo.length) {
      // все сыты — не гоним домой, а предлагаем, чем ещё заняться; про отдых — только через несколько минут
      if (help.allDoneAt == null) help.allDoneAt = T;
      if (T - help.allDoneAt > 240) return { text: tr('hRest') };
      const IDLE = tr('hIdle');
      return { text: IDLE[Math.floor((T - help.allDoneAt) / 25) % IDLE.length] };
    }
    // 4) что делать дальше — по первому невыполненному заданию
    const t = todo[0], need = t.food;
    const wrong = player.tool && !((need === 'hay' && player.tool === 'fork') || (need === 'grain' && player.tool === 'scoop') || ((need === 'water' || need === 'carrots') && player.tool === 'bucket'));
    if (wrong && !player.carry) {
      const home = player.tool === 'fork' ? fork && at(fork.o) : player.tool === 'bucket' ? bucket && at(bucket.o) : player.tool === 'scoop' ? grain && at(grain.o) : W.shovels[0] && at(W.shovels[0].o);
      return { text: tr('hToolBack', TOOL_NAME[player.tool], TOOL_HOME[player.tool]), target: home };
    }
    const who = t.who.toLowerCase();
    if (need === 'hay') {
      if (player.tool !== 'fork') {
        const shut = fork && W.behindClosedDoor(fork.o.x, fork.o.y);
        if (shut) return { text: tr('hHayDoors', t.who), target: { x: shut.x, y: shut.y - 30 } };
        return { text: tr('hHayFork', t.who), target: fork && at(fork.o) };
      }
      return { text: tr('hHayTake'), target: W.hay };
    }
    if (need === 'grain') {
      if (player.tool !== 'scoop') return { text: tr('hGrainScoop', t.who), target: grain && at(grain.o) };
      return { text: tr('hGrainTake'), target: grain && at(grain.o) };
    }
    // вода и овощи — ведром
    if (player.tool !== 'bucket') return { text: tr('hBucket', t.who, need === 'water'), target: bucket && at(bucket.o) };
    if (need === 'water') return { text: tr('hWater'), target: MAP.well };
    return { text: tr('hVeg'), target: veg && at(veg.o) };
  }
  function updateHelper() {
    if (!helperOn) return;
    if (T < help.next) return;
    help.next = T + 0.4;
    if (!save.walked && player.walk) { save.walked = true; persist(); }
    const h = helperHint();
    // указатель переехал на новое место, а героиня была у прежнего — шаг сделан: там «палец вверх»
    const old = help.target, nt = h.target || null;
    if (old && (!nt || Math.hypot(nt.x - old.x, nt.y - old.y) > 20) && Math.hypot(player.x - old.x, player.y - old.y) < 130) thumbsUp(old.x, old.y);
    help.target = nt;
    if (help.say && T < help.say.until) { /* пока держится разовая реплика */ }
    else if (h.text !== help.text) { help.say = null; help.text = h.text; showHelp(); }
    else if (T - help.shownAt > 9 && !$('helperMsg').classList.contains('hide')) $('helperMsg').classList.add('hide');   // через 9 с облачко прячется
  }
  function showHelp() {
    $('helperText').textContent = help.text;
    $('helperMsg').classList.remove('hide');
    const f = $('helperFace'); f.classList.remove('talk'); void f.offsetWidth; f.classList.add('talk');
    help.shownAt = T;
    // «говорит»: рот открывается и закрывается пару секунд
    clearInterval(showHelp.h); let n = 0;
    showHelp.h = setInterval(() => { n++; $('helperImg').src = n % 2 && n < 14 ? 'assets/girl/head_talk.png' : 'assets/girl/head_smile.png'; if (n >= 14) clearInterval(showHelp.h); }, 160);
  }
  $('helperFace').onclick = (e) => { e.stopPropagation(); if ($('helperMsg').classList.contains('hide')) showHelp(); else $('helperMsg').classList.add('hide'); };
  $('helperMsg').onclick = (e) => { e.stopPropagation(); $('helperMsg').classList.add('hide'); };
  /* Стрелка над целью подсказки */
  /* Куда идти — перчатка с указательным пальцем (кончик пальца над местом, покачивается) */
  function drawHelpArrow(p, t) {
    if (T < thumb.until) return;                       // сначала «палец вверх», потом снова указатель
    const im = IMG['fx/glove_point'], H = 34, tipY = p.y - 52 + Math.sin(t * 5) * 6;
    if (!im) return;
    const W2 = H * im.width / im.height;
    ctx.save(); ctx.globalAlpha = 0.97;
    ctx.drawImage(im, p.x - W2 * 0.25, tipY - H, W2, H);   // кончик пальца — на 1/4 ширины снизу
    ctx.restore();
  }
  /* «Палец вверх» — шаг или задание выполнено: выпрыгивает, держится и тает */
  const thumb = { x: 0, y: 0, at: -99, until: -99 };
  function thumbsUp(x, y) {
    if (T - thumb.at < 1) return;                      // не чаще раза в секунду
    thumb.x = x; thumb.y = y; thumb.at = T; thumb.until = T + 1.4;
  }
  function drawThumb() {
    const a = T - thumb.at; if (a < 0 || T > thumb.until) return;
    const im = IMG['fx/glove_thumb']; if (!im) return;
    const pop = a < 0.25 ? 0.4 + 0.8 * (a / 0.25) : a < 0.4 ? 1.2 - (a - 0.25) / 0.15 * 0.2 : 1;   // вырос — чуть больше — обычный
    const H = 36 * pop, W2 = H * im.width / im.height, fade = Math.min(1, (thumb.until - T) / 0.35);
    ctx.save(); ctx.globalAlpha = fade;
    ctx.drawImage(im, thumb.x - W2 / 2, thumb.y - 62 - a * 8 - H / 2, W2, H);
    ctx.restore();
  }

  // ---------- рендер ----------
  function updateCamera(dt, follow) {
    const vw = view.w / vscale(), vh = view.h / vscale();
    let tx = follow.x - vw / 2, ty = follow.y - vh / 2 - 30;
    tx = vw >= WORLD.W ? (WORLD.W - vw) / 2 : Math.max(0, Math.min(WORLD.W - vw, tx));
    ty = vh >= WORLD.H ? (WORLD.H - vh) / 2 : Math.max(0, Math.min(WORLD.H - vh, ty));
    const k = dt > 0.5 ? 1 : 1 - Math.pow(0.0015, dt);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }

  function drawMarker(z, t, visited, sym) {
    const x = z.mx ?? z.x, y = (z.my ?? z.y - SIZE.hero - 28) + Math.sin(t * 3 + z.x) * 3;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x, (z.my ?? z.y - SIZE.hero - 28) + 26, 8, 2.5, 0, 0, 7); ctx.fill();
    // значок в масштабе персонажей
    ctx.translate(x, y); ctx.scale(0.65, 0.65); ctx.translate(-x, -y);
    ctx.beginPath(); ctx.arc(x, y, 21, 0, 7);
    ctx.fillStyle = visited ? '#ffffff' : '#ffd23f'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 7, y + 17); ctx.lineTo(x, y + 30); ctx.lineTo(x + 7, y + 17); ctx.fillStyle = visited ? '#fff' : '#ffd23f'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 18.5, 0, 7); ctx.fill();
    ctx.fillStyle = INK; ctx.font = 'bold 26px Pangolin, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(sym || (visited ? '?' : '!'), x, y + 1);
    ctx.restore();
  }

  function render(t) {
    const s = vscale() * view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#a8cb7c'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
    const vx0 = cam.x - 60, vy0 = cam.y - 60, vx1 = cam.x + view.w / vscale() + 60, vy1 = cam.y + view.h / vscale() + 300;
    drawGround(ctx, cam.x - 2, cam.y - 2, cam.x + view.w / vscale() + 2, cam.y + view.h / vscale() + 2, s);
    const vis = (b) => b[2] > vx0 && b[0] < vx1 && b[3] > vy0 && b[1] < vy1;

    if (tapFx && mode === 'play') {
      const a = 1 - tapFx.t / 0.6;
      if (a > 0) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(tapFx.x, tapFx.y, 10 + tapFx.t * 40, (10 + tapFx.t * 40) * 0.45, 0, 0, 7); ctx.stroke(); }
    }

    const list = [];
    {
      for (const sp of W.sprites) if (vis(sp.b)) list.push(sp);
      // животное, которое ест из корыта, рисуем ПОВЕРХ корыта — голова видна внутри, а не проваливается под него
      const keyed = [];
      for (const a of W.animals) {
        if (!vis(a.b)) continue;
        // стоит рядом с корытом (голова над ним) — рисуем поверх корыта, чтобы голова не уходила под него
        let y = a.y;
        for (const tr of a.troughs || []) {
          const o = tr.o, h = SIZE[a.kind] || 50;
          if (Math.abs(a.x - o.x) < h * 1.15 && a.y > o.y - o.h - 10 && a.y < o.y + 4) y = Math.max(y, o.y + 1);
        }
        keyed.push({ a, y });
      }
      // между собой животные всегда по тени: чья тень ниже — тот впереди (даже если соседа подняли «к корыту»)
      keyed.sort((p, q) => p.a.y - q.a.y);
      const lastOf = {};                                  // только внутри своего загона (соседи по загону)
      for (const p of keyed) { const prev = lastOf[p.a.kind]; if (prev !== undefined) p.y = Math.max(p.y, prev + 0.001); lastOf[p.a.kind] = p.y; }
      for (const { a, y } of keyed) list.push(y === a.y ? a : { y, draw: (c, tt) => a.draw(c, tt) });
      for (const f of fed.values()) list.push({ y: f.y, draw: (c) => drawFeed(c, f) });
      drawPiles(list);
      drawDrops(list);
      drawWeeds(list);
    }
    if (mode === 'play' && !player.home) list.push({ y: player.y, draw: (c) => {
      if (player.tool) {
        const ho = { gender: save.gender, t, walk: player.walk, dir: player.dir, face: player.face, h: SIZE.hero };
        if (typeof rigReady === 'function' && rigReady(save.gender)) { drawHero(c, player.x, player.y, { ...ho, hold: player.tool === 'scoop' ? holdScoop : player.tool === 'bucket' ? holdBucket : player.tool === 'shovel' ? holdShovel : holdFork, holdOne: player.tool === 'scoop' }); return; }
        drawFork(c, t, false); drawHero(c, player.x, player.y, ho); drawFork(c, t, true);
        return;
      }
      // корм в руках (ведро, мешок): спиной к нам — за героиней, иначе — перед ней
      const hay = player.carry && FOOD[player.carry].img ? imgSprite(FOOD[player.carry].img, player.carry === 'hay' ? 17 : 20) : null;
      const bob = player.walk ? Math.abs(Math.sin(t * 14)) * 1.8 : 0;
      const hx = player.x + (player.face === 'side' ? player.dir * 9 : 0), hy = player.y - 22 - bob;
      if (hay && player.face === 'up') blit(c, hay, hx, hy - 6);
      drawHero(c, player.x, player.y, { gender: save.gender, t, walk: player.walk, dir: player.dir, face: player.face, h: SIZE.hero, wave: waveAmt() });
      if (hay && player.face !== 'up') blit(c, hay, hx, hy);
      if (player.carry === 'fruit' && player.fruit && player.face !== 'up') {   // фрукт в руке — значком
        c.save(); c.font = '9px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const fx = hx + (player.face === 'side' ? player.dir * 2 : -10), fs = player.fruitImg && imgSprite(player.fruitImg, 9);
        if (fs) c.drawImage(fs.c, fx - fs.w / 2, hy - fs.h / 2 + 2, fs.w, fs.h);   // картинка фрукта
        else c.fillText(player.fruit[1], fx, hy + 2);                              // нет картинки — значком
        c.restore();
      }
    } });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw(ctx, t);

    if (mode === 'play' && save.introDone) {
      const A = nextAct();
      // значки «!» над загонами убраны по просьбе пользователя; остались только «+»/«?» рядом с действием
      if (A && !player.home) drawMarker({ x: A.x, y: A.y, my: A.y - 75 }, t, true, A.sym);
      if (help.target && !player.home && Math.hypot(player.x - help.target.x, player.y - help.target.y) > 70) drawHelpArrow(help.target, t);
      drawThumb();
      for (const a of W.animals) if (a.happy > T) {
        const k = (a.happy - T) / 2.5;
        ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.font = '12px "Segoe UI Emoji", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('❤️', a.x, a.y - (a.spr ? a.spr.h : 30) - 6 - (1 - k) * 14); ctx.restore();
      }
    }
    if (mode === 'play') {
    }
  }

  /* Корм, положенный в загон */
  function drawFeed(c, f) {
    if (f.none) return;                               // корм показан картинкой полного корыта
    if (f.food === 'water') {                        // корытце с водой
      c.save(); c.fillStyle = '#8a5a32'; c.strokeStyle = INK; c.lineWidth = 1;
      c.beginPath(); c.ellipse(f.x, f.y - 3, 13, 6, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#5fb7e8'; c.beginPath(); c.ellipse(f.x, f.y - 4.5, 10, 3.6, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(f.x - 3, f.y - 5.5, 3, 1, 0, 0, 7); c.fill();
      c.restore(); return;
    }
    if (f.inTrough) {                                 // корм в корыте: лежит на дне, по центру
      const { cy, h } = f.inTrough;
      if (f.food === 'grain') {
        c.save(); c.fillStyle = '#e8b23a'; c.strokeStyle = 'rgba(90,60,20,.6)'; c.lineWidth = 0.5;
        for (let i = 0; i < 34; i++) { const a = i * 2.4, rx = ((i * 37) % 100) / 100 - 0.5, ry = ((i * 61) % 100) / 100 - 0.5; c.beginPath(); c.ellipse(f.x + rx * h * 0.22, cy + ry * h * 0.55, 1.6, 1.1, a, 0, 7); c.fill(); c.stroke(); }
        c.restore(); return;
      }
      const s = imgSprite(f.food === 'hay' ? 'items/hay_pile' : 'items/veg_pile', f.food === 'hay' ? Math.round(h * 0.42) : Math.round(h * 0.3));
      if (s) { blit(c, s, f.x, cy + h * 0.2); if (f.food === 'hay') blit(c, s, f.x, cy - h * 0.05); }
      return;
    }
    if (f.food === 'grain') {                         // рассыпанное зерно
      c.save(); c.fillStyle = '#e8b23a'; c.strokeStyle = 'rgba(90,60,20,.6)'; c.lineWidth = 0.6;
      for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 2 + (i * 7) % 20; c.beginPath(); c.ellipse(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.45, 2.4, 1.6, a, 0, 7); c.fill(); c.stroke(); }
      c.restore(); return;
    }
    const s = imgSprite(f.food === 'hay' ? 'items/hay_pile' : 'items/bucket_carrots', f.food === 'hay' ? 22 : 20);
    if (s) blit(c, s, f.x, f.y);
  }

  // портрет в диалоге и герои в меню
  const pctx = $('portrait').getContext('2d');
  function drawPortrait(t) {
    const c = pctx, w = 224;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, w);
    const g = c.createLinearGradient(0, 0, 0, w); g.addColorStop(0, '#d8ecf2'); g.addColorStop(0.65, '#cfe6b4'); g.addColorStop(1, '#a8cb7c');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
    if (heroHasImages(save.gender)) {
      // лицо с эмоцией: рот открывается, пока герой «говорит»
      const key = save.gender + '/' + (Dlg.talking && (t * 7) % 2 < 1 ? 'emo_talk' : 'emo_smile');
      const im = IMG[key];
      const s = 200 / im.width;
      c.drawImage(im, (w - im.width * s) / 2, 14 + Math.sin(t * 2.4) * 1.5, im.width * s, im.height * s);
      return;
    }
    c.setTransform(3.6, 0, 0, 3.6, w / 2 - 6, w / 2 + 8 * 3.6);
    drawKid(c, 0, 40, { gender: save.gender, t, talk: Dlg.talking && (t * 9) % 2 < 1, noShadow: true });
  }
  function drawMenuKid(canvas, gender, t, wave) {
    const c = canvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    if (heroHasImages(gender)) {
      const im = IMG[gender + '/' + (wave ? 'emo_laugh' : 'front')];
      const h = canvas.height - 16, s = h / im.height, bob = Math.sin(t * 2.4) * 3;
      c.fillStyle = 'rgba(45,60,25,0.2)'; c.beginPath(); c.ellipse(canvas.width / 2, canvas.height - 10, im.width * s * 0.38, 9, 0, 0, 7); c.fill();
      c.drawImage(im, (canvas.width - im.width * s) / 2, 6 + bob, im.width * s, h);
      return;
    }
    const k = canvas.height / 100;
    c.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height - 6);
    drawKid(c, 0, 0, { gender, t, wave, dir: gender === 'girl' ? 1 : -1 });
  }

  // ---------- главный цикл ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; T += dt;   // время кадра не бывает отрицательным
    for (const a of W.animals) a.update(dt);
    separateAnimals(W.animals, dt);
    if (mode === 'play') {
      updatePlayer(dt);
      checkZones();
      W.updateGates(dt);
      updateDrops();
      updateWeeds();
      updateHelper();
      updateFed(dt);
      for (let i = timers.length - 1; i >= 0; i--) if (T >= timers[i].at) { const f = timers[i].fn; timers.splice(i, 1); f(); }
      view.zoom += (view.zoomT - view.zoom) * (1 - Math.pow(0.0005, dt));   // плавно к выбранному приближению
      updateCamera(dt, player);
      if (tapFx) { tapFx.t += dt; if (tapFx.t > 0.6) tapFx = null; }
    } else {
      updateCamera(1, { x: WORLD.W / 2 + Math.sin(T * 0.06) * 400, y: WORLD.H / 2 + 30 });
    }
    Dlg.update(dt);
    if (mode !== 'title') render(T);
    if (Dlg.active) drawPortrait(T);
    requestAnimationFrame(frame);
  }

  // тест-режим для скриншотов: ?auto=girl&x=..&y=..
  const qs = new URLSearchParams(location.search);
  if (qs.get('auto')) {
    save.gender = 'girl'; save.introDone = qs.has('intro') ? false : true;
    if (qs.get('x')) { player.x = +qs.get('x'); player.y = +qs.get('y'); }
    if (qs.has('carry')) player.carry = FOOD[qs.get('carry')] ? qs.get('carry') : 'hay';
    if (qs.has('fork')) player.tool = 'fork';
    startPlay();
    updateCamera(1, player);
  } else show('title');
  requestAnimationFrame(frame);
})();
