'use strict';
/* Этап 1: стартовый экран, выбор героя, прогулка по ферме, обучающие подсказки. */

const LINES = {
  barn: ['Это наш большой загон — конюшня! 🐴', 'Внутри живут лошади и коровы. Там лежат сено, солома и большие вёдра с морковкой.', 'Скоро мы зайдём внутрь: будем кормить, чистить и расчёсывать их!'],
  sheep: ['Бе-е-е! Это наши овечки.', 'Им нужно свежее сено и чистая вода. А убирать за ними — наша работа!'],
  goat: ['А тут живут козлики. Они очень любопытные!', 'Видишь камень? Козы обожают на него забираться. А ещё любят морковку и капусту.'],
  pig: ['Хрю-хрю! Это свинки.', 'Они обожают валяться в грязи — так им прохладно летом. Но иногда их надо мыть!'],
  chicken: ['Ко-ко-ко! Это курятник.', 'Курочкам нужно насыпать зерно, а ещё мы будем их чистить и собирать яйца.'],
  rabbit: ['Это клетки с зайчиками.', 'Зайчики любят морковку и сено. Их шёрстку нужно аккуратно расчёсывать щёткой.'],
  garden: ['Наш огород! Здесь растут морковка, капуста и свёкла.', 'Если вёдра с овощами в конюшне опустеют — придём сюда собирать урожай.'],
  greenhouse: ['Это теплица. Внутри всегда тепло!', 'Здесь растут помидоры и огурцы.'],
};

(async function () {
  const $ = (id) => document.getElementById(id);
  const cv = $('game'), ctx = cv.getContext('2d');
  const touch = matchMedia('(pointer: coarse)').matches;

  // ---------- сохранение ----------
  const save = { gender: null, visited: [], introDone: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem('farm.v1') || '{}')); } catch (e) {}
  const persist = () => { try { localStorage.setItem('farm.v1', JSON.stringify(save)); } catch (e) {} };

  // ---------- шрифт и мир ----------
  try { await Promise.race([document.fonts.load('20px Pangolin'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  const ANIMAL_FILES = ['horse_chestnut', 'cow_holstein', 'sheep_white', 'sheep_cream', 'sheep_grey', 'sheep_brown',
    'goat_white', 'goat_brown', 'goat_black', 'pig_pink_dirty', 'pig_spotted', 'pig_tan_dirty', 'pig_pink',
    'chicken_white', 'chicken_brown', 'chicken_black', 'chicken_buff', 'rabbit_white', 'rabbit_grey', 'rabbit_brown'];
  await loadImages([
    'bg/farm',
    ...PLANTS.map((p) => 'plants/plain/' + p[0]),
    ...ANIMAL_FILES.map((f) => 'animals/' + f),
    ...['hay_bale', 'hay_stack', 'hay_cart', 'hay_pile', 'mud_puddle', 'chicken_coop', 'straw', 'wheelbarrow', 'grain_bag', 'bucket_carrots', 'watering_can'].map((f) => 'items/' + f),
    ...GIRL_FRAMES.map((f) => 'girl/' + f),
    ...RIG_FILES.map((f) => 'girl/rig/' + f),
    ...animFiles(),
    ...animalRigFiles(),
    ...GIRL_FRAMES.map((f) => 'boy/' + f),
  ]);
  const W = buildWorld();
  $('loading').hidden = true;

  // иконки для задания — прямо файлы картинок
  const icons = {
    barn: 'assets/animals/horse_chestnut.png', sheep: 'assets/animals/sheep_white.png', goat: 'assets/animals/goat_brown.png',
    pig: 'assets/animals/pig_pink.png', chicken: 'assets/animals/chicken_brown.png', rabbit: 'assets/animals/rabbit_white.png',
    garden: 'assets/items/bucket_carrots.png', greenhouse: 'assets/items/watering_can.png',
  };

  const qlist = $('qlist');
  for (const z of ZONES) {
    const li = document.createElement('li'); li.dataset.id = z.id; li.title = z.name;
    const img = new Image(); img.src = icons[z.id]; img.alt = z.name; li.appendChild(img); qlist.appendChild(li);
  }
  function refreshQuest() {
    for (const li of qlist.children) li.classList.toggle('done', save.visited.includes(li.dataset.id));
    $('qcount').textContent = `${save.visited.length}/${ZONES.length}`;
  }

  // ---------- состояние ----------
  let mode = 'title';
  const player = { x: 852, y: 264, dir: 1, face: 'down', walk: false, target: null, stuck: 0 };
  const cam = { x: 900, y: 500 };
  const view = { scale: 1, dpr: 1, w: 0, h: 0 };
  const keys = new Set();
  let tapFx = null, nearZone = null, lastNear = null, T = 0;

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth; view.h = window.innerHeight;
    cv.width = Math.round(view.w * view.dpr); cv.height = Math.round(view.h * view.dpr);
    // вся ферма по высоте, но не мельче, чем нужно; на широком экране — чуть ближе
    view.scale = Math.max(Math.max(view.w / WORLD.W, view.h / WORLD.H), Math.min(view.h / 800, view.w / 900));
  }
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

  function toast(text, ms = 2200) {
    const t = $('toast'); t.textContent = text; t.classList.remove('hide');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hide'), ms);
  }

  // ---------- экраны ----------
  function show(m) {
    mode = m;
    document.body.classList.toggle('menu', m !== 'play');
    $('title').hidden = m !== 'title';
    $('select').hidden = m !== 'select';
    $('hud').hidden = m !== 'play';
    if (m !== 'play') { Dlg.active = false; Dlg.q = []; $('dialog').hidden = true; }
  }
  function startPlay() {
    show('play');
    $('dlgName').textContent = KIDS[save.gender].name;
    refreshQuest();
    if (!save.introDone) {
      player.x = 852; player.y = 264; player.dir = 1; player.face = 'down';
      const n = KIDS[save.gender].name;
      Dlg.say([
        `Привет! Меня зовут ${n}. Добро пожаловать на нашу ферму! 🌻`,
        touch ? 'Чтобы идти, просто нажми пальцем на землю — туда, куда хочешь.' : 'Чтобы идти, нажми мышкой на землю. Или используй стрелки / клавиши WASD.',
        'Давай обойдём ферму и познакомимся со всеми! Жёлтые значки «!» показывают, куда идти.',
        'А сверху слева — список: там отмечается, где мы уже побывали.',
      ], () => { save.introDone = true; persist(); });
    }
  }
  $('btnPlay').onclick = () => { if (save.gender) startPlay(); else show('select'); };
  $('btnSelBack').onclick = () => show('title');
  for (const card of document.querySelectorAll('.card')) card.onclick = () => { save.gender = card.dataset.g; persist(); startPlay(); };
  $('btnHome').onclick = () => show('title');
  $('btnSettings').onclick = () => { $('settings').hidden = false; };
  $('setResume').onclick = () => { $('settings').hidden = true; };
  $('setHero').onclick = () => { $('settings').hidden = true; show('select'); };
  $('setFull').onclick = () => {
    $('settings').hidden = true;
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
    else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement);
  };
  $('setReset').onclick = () => {
    $('settings').hidden = true;
    save.visited = []; save.introDone = false; persist();
    startPlay();
  };

  // ---------- управление ----------
  function toWorld(px, py) { return [cam.x + px / view.scale, cam.y + py / view.scale]; }
  cv.addEventListener('pointerdown', (e) => {
    if (mode !== 'play') return;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    // куча сена: нажали на неё или на значок над ней, стоя рядом
    if (nearHay && (Math.hypot(wx - HAY_PILE.x, wy - (HAY_PILE.y - 20)) < 50 || Math.hypot(wx - HAY_PILE.x, wy - (HAY_PILE.y - 75)) < 22)) { takeHay(); return; }
    // нажали на значок над зоной — герой рассказывает снова
    for (const z of ZONES) {
      if (Math.hypot(wx - (z.mx ?? z.x), wy - (z.my ?? z.y - SIZE.hero - 28)) < 30 && Math.hypot(player.x - z.x, player.y - z.y) < 160) { talkZone(z); return; }
    }
    player.target = [wx, wy]; player.stuck = 0;
    tapFx = { x: wx, y: wy, t: 0 };
  });
  addEventListener('keydown', (e) => {
    if (mode !== 'play') return;
    if (e.key === ' ' || e.key === 'Enter') { if (Dlg.active) Dlg.next(); else if (nearHay) takeHay(); else if (nearZone) talkZone(nearZone); e.preventDefault(); return; }
    keys.add(e.key.toLowerCase());
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  // ---------- сено ----------
  let nearHay = false;
  function takeHay() {
    const girl = save.gender !== 'boy';
    if (player.carry === 'hay') { toast('🌾 Руки уже заняты сеном'); return; }
    player.carry = 'hay';
    toast(girl ? '🌾 Ты взяла охапку сена!' : '🌾 Ты взял охапку сена!');
  }

  function talkZone(z) {
    if (Dlg.active) return;
    Dlg.say(LINES[z.id]);
  }

  // ---------- столкновения ----------
  function blocked(x, y) {
    return W.blocked(x, y);
  }

  function updatePlayer(dt) {
    let vx = 0, vy = 0;
    if (keys.has('arrowleft') || keys.has('a') || keys.has('ф')) vx -= 1;
    if (keys.has('arrowright') || keys.has('d') || keys.has('в')) vx += 1;
    if (keys.has('arrowup') || keys.has('w') || keys.has('ц')) vy -= 1;
    if (keys.has('arrowdown') || keys.has('s') || keys.has('ы')) vy += 1;
    if (vx || vy) { player.target = null; const d = Math.hypot(vx, vy); vx /= d; vy /= d; }
    else if (player.target) {
      const dx = player.target[0] - player.x, dy = player.target[1] - player.y, d = Math.hypot(dx, dy);
      if (d < 5) player.target = null; else { vx = dx / d; vy = dy / d; }
    }
    const sp = 150 * dt;
    const ox = player.x, oy = player.y;
    if (vx && !blocked(player.x + vx * sp, player.y)) player.x += vx * sp;
    if (vy && !blocked(player.x, player.y + vy * sp)) player.y += vy * sp;
    const moved = Math.hypot(player.x - ox, player.y - oy);
    player.walk = moved > 0.2;
    if (Math.abs(vx) > 0.15) player.dir = vx > 0 ? 1 : -1;
    if (player.walk) {
      const mx = player.x - ox, my = player.y - oy;
      player.face = Math.abs(mx) >= Math.abs(my) * 0.7 ? 'side' : my > 0 ? 'down' : 'up';
    }
    if (player.target && moved < sp * 0.15) { player.stuck += dt; if (player.stuck > 0.25) player.target = null; } else player.stuck = 0;
  }

  function checkZones() {
    let best = null, bd = 1e9;
    for (const z of ZONES) { const d = Math.hypot(player.x - z.x, player.y - z.y); if (d < 75 && d < bd) { bd = d; best = z; } }
    nearZone = best;
    if (best && best !== lastNear && !save.visited.includes(best.id) && save.introDone) {
      save.visited.push(best.id); persist(); refreshQuest();
      toast(`⭐ ${best.name}!`);
      Dlg.say(LINES[best.id], () => {
        if (save.visited.length === ZONES.length && !save.finished) {
          save.finished = true; persist();
          Dlg.say(['Ура! Мы обошли всю ферму и со всеми познакомились! 🎉', 'Скоро начнём настоящую работу: кормить, чистить и мыть наших животных!']);
        }
      });
    }
    lastNear = best;
    const wasNearHay = nearHay;
    nearHay = Math.hypot(player.x - HAY_PILE.x, player.y - HAY_PILE.y) < 80;
    if (nearHay && !wasNearHay && save.introDone && !save.hayHint) {
      save.hayHint = true; persist();
      Dlg.say(['Смотри, это куча сена! 🌾', touch ? 'Нажми на неё — и возьмёшь охапку, чтобы покормить животных.' : 'Нажми на неё (или пробел) — и возьмёшь охапку, чтобы покормить животных.']);
    }
  }

  // ---------- рендер ----------
  function updateCamera(dt, follow) {
    const vw = view.w / view.scale, vh = view.h / view.scale;
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
    const s = view.scale * view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#a8cb7c'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
    ctx.drawImage(W.ground, 0, 0);
    const vx0 = cam.x - 60, vy0 = cam.y - 60, vx1 = cam.x + view.w / view.scale + 60, vy1 = cam.y + view.h / view.scale + 300;
    const vis = (b) => b[2] > vx0 && b[0] < vx1 && b[3] > vy0 && b[1] < vy1;

    if (tapFx && mode === 'play') {
      const a = 1 - tapFx.t / 0.6;
      if (a > 0) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(tapFx.x, tapFx.y, 10 + tapFx.t * 40, (10 + tapFx.t * 40) * 0.45, 0, 0, 7); ctx.stroke(); }
    }

    const list = [];
    for (const sp of W.sprites) if (vis(sp.b)) list.push(sp);
    for (const a of W.animals) if (vis(a.b)) list.push(a);
    if (mode === 'play') list.push({ y: player.y, draw: (c) => {
      // охапка сена в руках: спиной к нам — за героиней, иначе — перед ней
      const hay = player.carry === 'hay' ? imgSprite('items/hay_pile', 17) : null;
      const bob = player.walk ? Math.abs(Math.sin(t * 14)) * 1.8 : 0;
      const hx = player.x + (player.face === 'side' ? player.dir * 9 : 0), hy = player.y - 22 - bob;
      if (hay && player.face === 'up') blit(c, hay, hx, hy - 6);
      drawHero(c, player.x, player.y, { gender: save.gender, t, walk: player.walk, dir: player.dir, face: player.face, h: SIZE.hero });
      if (hay && player.face !== 'up') blit(c, hay, hx, hy);
    } });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw(ctx, t);

    if (mode === 'play' && save.introDone) {
      for (const z of ZONES) {
        const v = save.visited.includes(z.id);
        if (!v || nearZone === z) drawMarker(z, t, v);
      }
      if (nearHay) drawMarker({ x: HAY_PILE.x, y: HAY_PILE.y, my: HAY_PILE.y - 75 }, t, true, player.carry === 'hay' ? '✓' : '+');
    }
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
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    for (const a of W.animals) a.update(dt);
    if (mode === 'play') {
      updatePlayer(dt);
      checkZones();
      updateCamera(dt, player);
      if (tapFx) { tapFx.t += dt; if (tapFx.t > 0.6) tapFx = null; }
    } else {
      updateCamera(1, { x: WORLD.W / 2 + Math.sin(T * 0.06) * 400, y: WORLD.H / 2 + 30 });
    }
    Dlg.update(dt);
    render(T);
    if (Dlg.active) drawPortrait(T);
    if (mode === 'title') { drawMenuKid($('kidL'), 'girl', T, true); drawMenuKid($('kidR'), 'boy', T + 1.3, false); }
    if (mode === 'select') document.querySelectorAll('.card canvas').forEach((c, i) => drawMenuKid(c, i ? 'boy' : 'girl', T + i, false));
    requestAnimationFrame(frame);
  }

  // тест-режим для скриншотов: ?auto=girl&x=..&y=..
  const qs = new URLSearchParams(location.search);
  if (qs.get('auto')) {
    save.gender = qs.get('auto'); save.introDone = qs.has('intro') ? false : true;
    if (qs.get('x')) { player.x = +qs.get('x'); player.y = +qs.get('y'); }
    if (qs.has('carry')) player.carry = 'hay';
    startPlay();
    updateCamera(1, player);
  } else show(qs.get('screen') || 'title');
  requestAnimationFrame(frame);
})();
