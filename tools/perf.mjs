// Замер скорости игры в настоящем (не «замороженном») браузере через протокол отладки Edge.
// Запуск: node tools/perf.mjs [страница?параметры]   — печатает средние миллисекунды на кадр по частям.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const page = process.argv[2] || 'index.html?auto=girl&x=700&y=520';
// страницу отдаём по http (python -m http.server 8765), иначе file:// мешает замерам
const url = 'http://127.0.0.1:8765/' + page;
const port = 9333;
const prof = mkdtempSync(join(tmpdir(), 'edgeperf-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const wait = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.navigate', { url });
await sleep(4000);
// сколько кадров в секунду реально выходит
const fps = await ev(`new Promise((r) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r((n / 3).toFixed(1)); })(); })`);
await ev(`window.__rp = {}`);
const bench = await ev(`(() => { try { return typeof __bench === 'function' ? __bench() : 'no __bench'; } catch (e) { return 'ERR ' + e.message; } })()`);
const parts = await ev(`typeof __rpr === 'function' ? __rpr() : ''`);
console.log('fps:', fps, '|', bench);
console.log(parts);
ws.close(); edge.kill();
process.exit(0);
