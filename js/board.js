// מנוע הלוח: שעון, פס עליון, רוטציית מסכים, פס גולל, מצב לילה ועבודה בלי אינטרנט.
import { computeDay, fmtTime, tzParts, hhmmToMin } from './jewish.js';
import { prayersForDay, weeklyPrayers, lessonsForDay } from './prayers.js';
import { SCREENS, LIVE_SCREENS, tickerItems, nextPrayer } from './screens.js';
import { load, subscribe } from './store.js';
import { sceneFor, sceneImage } from './art.js';

const params = new URLSearchParams(location.search);
const onlyScreens = params.get('screens')?.split(',').filter(Boolean);
const fakeStart = params.get('date') ? new Date(params.get('date')) : null; // בדיקות: ?date=2026-12-14T17:30
const realStart = Date.now();
const nowDate = () => (fakeStart ? new Date(fakeStart.getTime() + (Date.now() - realStart)) : new Date());

const $ = (sel) => document.querySelector(sel);
let DATA = null;
let ctx = null;
let queue = [];
let qi = -1;
let timer = null;
let current = null;

// ---------- התאמת הקנבס לגודל המסך ----------
function fit() {
  const st = $('#stage');
  const k = Math.min(innerWidth / 1920, innerHeight / 1080);
  st.style.transform = `translate(-50%, -50%) scale(${k})`;
}
addEventListener('resize', fit);

// ---------- הקשר לחישוב ----------
function buildCtx() {
  const s = DATA.synagogue;
  const now = nowDate();
  const day = computeDay(now, s);
  const p = tzParts(now, s.tz);
  const todayIso = `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  const lctx = { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah };
  ctx = {
    now, day, s, data: DATA, display: DATA.display, todayIso,
    prayersToday: prayersForDay(day, DATA, s),
    lessonsToday: lessonsForDay(DATA, s, day.civil, lctx),
    weekly: weeklyPrayers(day, DATA, s),
  };
  return ctx;
}

// ---------- פס עליון ----------
function renderHeader() {
  const { day, s } = ctx;
  const st = $('#stage');
  // ?theme= ו-?scene= בכתובת – לתצוגה מקדימה בלי לשנות את ההגדרות
  const disp = { ...DATA.display, theme: params.get('theme') || DATA.display.theme, scene: params.get('scene') || DATA.display.scene };
  st.dataset.theme = disp.theme || 'classic';
  st.dataset.season = day.season;
  const custom = DATA.display.bgImage ? `url("${DATA.display.bgImage.replace(/"/g, '')}")` : null;
  const scene = custom ? null : sceneImage(sceneFor(disp), disp.theme || 'classic');
  st.style.setProperty('--bg-image', custom || (scene ? `url("${scene}")` : 'none'));
  st.classList.toggle('has-scene', !!(custom || scene));
  $('#shul').textContent = s.name || '';
  const ded = $('#dedication');
  ded.textContent = s.dedication || '';
  ded.hidden = !s.dedication;
  $('#day').textContent = !day.afterSunset ? day.weekday
    : day.dow === 6 ? 'מוצאי שבת קודש' : day.dow === 5 ? 'ליל שבת קודש' : `ליל יום ${nextWeekday(day.dow)}`;
  $('#heb').textContent = day.afterSunset ? day.next.hebDate : day.hebDate;
  $('#greg').textContent = day.gregDate;
  const sh = day.shabbat;
  $('#parsha').innerHTML = sh.parshaIsChag ? escapeHtml(sh.parsha) : `<small>פרשת השבוע</small>${escapeHtml(sh.parsha)}`;
  const evs = day.afterSunset ? day.next.events : day.events;
  const extra = [];
  if (day.dow === 5 && !day.afterSunset) extra.push('ערב שבת קודש');
  if (day.eventsTomorrow.length && !day.afterSunset && !evs.length) extra.push(`ערב ${day.eventsTomorrow[0]}`);
  $('#event').textContent = [...evs, ...extra].slice(0, 2).join(' · ');
}
const WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const nextWeekday = (dow) => WD[(dow + 1) % 7];
const escapeHtml = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function tickClock() {
  const now = nowDate();
  const p = tzParts(now, DATA.synagogue.tz);
  $('#clock').innerHTML = `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}<span class="sec">${String(p.ss).padStart(2, '0')}</span>`;
  // מצב לילה
  const off = DATA.display.offHours;
  if (off?.enabled && !params.has('preview')) {
    const m = p.hh * 60 + p.mm, a = hhmmToMin(off.from), b = hhmmToMin(off.to);
    const night = a > b ? (m >= a || m < b) : (m >= a && m < b);
    document.body.classList.toggle('night', night);
    $('#night').textContent = `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`;
  }
  if (current && LIVE_SCREENS.has(current.type)) {
    ctx.now = now;
    const html = SCREENS[current.type](ctx);
    if (html && current.el) current.el.innerHTML = Array.isArray(html) ? html[0] : html;
  }
}

// ---------- פס גולל ----------
let tickerAnim = null;
function renderTicker() {
  const np = nextPrayer(ctx);
  $('#next').innerHTML = np ? `${escapeHtml(np.name)} <b>${np.time}</b>` : (ctx.day.shabbat.candles ? `${ctx.day.shabbat.candlesLabel} <b>${fmtTime(ctx.day.shabbat.candles, ctx.s.tz, 'floor')}</b>` : '');
  $('#next').hidden = !np && !ctx.day.shabbat.candles;
  const run = $('#run');
  const html = tickerItems(ctx).map((t) => `<span>${t}</span>`).join('<span aria-hidden="true">✦</span>');
  if (run.dataset.html === html) return;
  run.dataset.html = html;
  run.innerHTML = html;
  if (!DATA.display.ticker) { $('#track').hidden = true; return; }
  $('#track').hidden = false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  tickerAnim?.cancel();
  const runW = run.scrollWidth, trackW = $('#track').clientWidth;
  const pxPerSec = 90;
  tickerAnim = run.animate([{ transform: `translateX(${-runW}px)` }, { transform: `translateX(${trackW}px)` }], {
    duration: ((runW + trackW) / pxPerSec) * 1000, iterations: Infinity, iterationStart: 0.4,
  });
}

// ---------- רוטציה ----------
function buildQueue() {
  const list = (DATA.display.screens || []).filter((x) => x.enabled && SCREENS[x.type] && (!onlyScreens || onlyScreens.includes(x.type)));
  const q = [];
  for (const item of list) {
    let out = null;
    try { out = SCREENS[item.type](ctx); } catch (e) { console.warn('screen failed', item.type, e); }
    if (!out) continue;
    const slides = Array.isArray(out) ? out : [out];
    slides.forEach((html, i) => q.push({ type: item.type, html, seconds: +(params.get('sec') || item.seconds || DATA.display.defaultSeconds || 12), key: `${item.type}:${i}` }));
  }
  return q;
}

function show(next) {
  const host = $('#screens');
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = next.html;
  host.appendChild(el);
  void el.offsetWidth; // מאלץ ציור לפני המעבר
  el.classList.add('on');
  const prev = current;
  current = { ...next, el };
  if (prev?.el) {
    prev.el.classList.remove('on');
    setTimeout(() => prev.el.remove(), 1000);
  }
  renderDots();
}

function renderDots() {
  $('#dots').innerHTML = queue.map((_, i) => `<i class="${i === qi ? 'on' : ''}"></i>`).join('');
}

function advance() {
  clearTimeout(timer);
  buildCtx();
  renderHeader();
  renderTicker();
  queue = buildQueue();
  if (!queue.length) { timer = setTimeout(advance, 10000); return; }
  const lastKey = current?.key;
  let idx = queue.findIndex((x) => x.key === lastKey);
  qi = (idx + 1) % queue.length;
  if (queue.length === 1 && current?.key === queue[0].key) {
    current.el.innerHTML = queue[0].html; // רענון תוכן בלי מעבר
  } else {
    show(queue[qi]);
  }
  timer = setTimeout(advance, queue[qi].seconds * 1000);
}

// ---------- הפעלה ----------
async function start() {
  fit();
  const r = await load();
  DATA = r.data;
  document.body.classList.toggle('offline', r.source === 'cache');
  document.getElementById('loading').hidden = true;
  advance();
  setInterval(tickClock, 1000);
  tickClock();
  subscribe((data, info) => {
    DATA = data;
    document.body.classList.toggle('offline', info?.source === 'cache');
    advance();
  });
  addEventListener('offline', () => document.body.classList.add('offline'));
  addEventListener('online', () => document.body.classList.remove('offline'));
  keepAwake();
  scheduleDailyReload();
}

async function keepAwake() {
  try {
    let lock = await navigator.wakeLock?.request('screen');
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen').catch(() => null);
    });
  } catch { /* לא נתמך – מגדירים בדפדפן הקיוסק */ }
}

function scheduleDailyReload() {
  // רענון מלא פעם ביום ב-03:17 כדי לקבל עדכוני קוד ולנקות זיכרון
  setInterval(() => {
    const p = tzParts(new Date(), DATA.synagogue.tz);
    if (p.hh === 3 && p.mm === 17 && navigator.onLine) location.reload();
  }, 60000);
}

if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('claude.ai') && !location.hostname.endsWith('claudeusercontent.com')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

start().catch((e) => {
  document.getElementById('loading').textContent = 'שגיאה בטעינת הלוח: ' + e.message;
  console.error(e);
  setTimeout(() => location.reload(), 60000);
});
