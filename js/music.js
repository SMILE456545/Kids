'use strict';
/* Фоновая музыка: assets/audio/music.(mp3|m4a), играет по кругу.
   Браузеры не дают звуку играть до первого касания — поэтому включаем при первом нажатии.
   Вкл/выкл — кнопка в настройках (#setMusic), выбор запоминается в localStorage 'farm.music'. */
(function () {
  const a = new Audio();
  a.src = a.canPlayType('audio/mpeg') ? 'assets/audio/music.mp3' : 'assets/audio/music.m4a';
  a.loop = true; a.preload = 'auto';
  const VOL = 0.45;
  let on = true;
  try { on = localStorage.getItem('farm.music') !== 'off'; } catch (e) {}
  let started = false;

  function fadeTo(target, ms) {                       // плавное изменение громкости
    clearInterval(fadeTo.h);
    const from = a.volume, t0 = performance.now();
    fadeTo.h = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = from + (target - from) * k;
      if (k >= 1) { clearInterval(fadeTo.h); if (target === 0) a.pause(); }
    }, 30);
  }
  function play() {
    if (!on) return;
    a.volume = 0;
    const p = a.play(); if (p && p.catch) p.catch(() => { started = false; });
    fadeTo(VOL, 1200);
  }
  function label() {
    const b = document.getElementById('setMusic');
    if (b) b.textContent = tr(on ? 'musicOn' : 'musicOff');
  }
  addEventListener('pointerdown', () => { if (!started) { started = true; play(); } }, true);
  addEventListener('keydown', () => { if (!started) { started = true; play(); } }, true);
  // на телефоне: свернули браузер — музыка на паузу
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) a.pause(); else if (on && started) a.play().catch(() => {});
  });
  document.addEventListener('DOMContentLoaded', () => {
    label(); onLang(label);
    const b = document.getElementById('setMusic');
    if (b) b.onclick = () => {
      on = !on;
      try { localStorage.setItem('farm.music', on ? 'on' : 'off'); } catch (e) {}
      if (on) { started = true; play(); } else fadeTo(0, 400);
      label();
    };
  });
})();
