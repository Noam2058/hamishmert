// מנוע הלוח: שעון, פס עליון, רוטציית מסכים, פס גולל, מצב לילה ועבודה בלי אינטרנט.
import { computeDay, fmtTime, tzParts, hhmmToMin, chanukaDay } from './jewish.js';
import { prayersForDay, weeklyPrayers, lessonsForDay } from './prayers.js';
import { SCREENS, LIVE_SCREENS, tickerItems, nextPrayer } from './screens.js';
import { load, subscribe } from './store.js';
import { sceneForSlide, renderScene, holidayHasDesign } from './scenes.js';
import { prefetchHalachot, DEFAULT_START } from './halacha-sa.js';
import { prefetchMishna } from './mishna.js';

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
  st.dataset.holiday = DATA.display.holidayDesign === false ? 'none' : (params.get('holiday') || day.holiday);
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

// מצב חסכוני לסטרימרים חלשים: ?lite / ?full, הגדרה בממשק, או זיהוי אוטומטי (Android עם עד 4 ליבות או 2GB)
let LITE = false;
function applyPerf() {
  const pref = params.has('lite') ? 'lite' : params.has('full') ? 'full' : (DATA?.display?.performance || 'auto');
  const weak = /Android/i.test(navigator.userAgent) && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2);
  LITE = pref === 'lite' || (pref === 'auto' && weak);
  document.documentElement.classList.toggle('lite', LITE);
}

function tickClock() {
  const now = nowDate();
  const p = tzParts(now, DATA.synagogue.tz);
  const hm = `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`;
  const ck = $('#clock');
  if (ck.dataset.hm !== hm) { ck.dataset.hm = hm; ck.innerHTML = `${hm}<span class="sec"></span>`; }
  if (!LITE) ck.lastElementChild.textContent = String(p.ss).padStart(2, '0'); // במצב חסכוני – בלי שניות
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
  // בשבת/חג (מהדלקת הנרות עד הצאת): צאת השבת. בשאר הזמן: התפילה הבאה, ואם אין – הדלקת הנרות הקרובה
  const sh = ctx.day.shabbat, now = ctx.now;
  const inShabbat = sh.candles && sh.havdalah && now >= sh.candles && now < sh.havdalah;
  const np = nextPrayer(ctx);
  let pill = '';
  if (inShabbat) pill = `צאת ${sh.candlesDate?.getDay() === 5 ? 'השבת' : 'החג'} <b>${fmtTime(sh.havdalah, ctx.s.tz, 'ceil')}</b>`;
  else if (np) pill = `${escapeHtml(np.name)} <b>${np.time}</b>`;
  else if (sh.candles && now < sh.candles && sh.candles - now < 14 * 3600000) pill = `${sh.candlesLabel} <b>${fmtTime(sh.candles, ctx.s.tz, 'floor')}</b>`; // רק ביום עצמו
  $('#next').innerHTML = pill;
  $('#next').hidden = !pill;
  const run = $('#run');
  const html = tickerItems(ctx).map((t) => `<span>${t}</span>`).join(SEP);
  if (!DATA.display.ticker) { $('#track').hidden = true; return; }
  $('#track').hidden = false;
  if (tickerHtml === html) return;
  tickerHtml = html;
  layoutTicker();
}

// לולאה רציפה: כמה עותקים ברצף, והפס זז בדיוק ברוחב עותק אחד – כך אין קפיצה ואין חיתוך.
// במכוון לא מכבדים את "הפחתת תנועה" של המכשיר: בסטרימרים זה לרוב דלוק בלי כוונה, והטקסט היה נחתך.
const SEP = '<span class="sep" aria-hidden="true">✦</span>';
let tickerHtml = null;
function layoutTicker() {
  const run = $('#run'), track = $('#track');
  if (!tickerHtml || track.hidden) return;
  tickerAnim?.cancel();
  run.innerHTML = `<span class="copy">${tickerHtml}${SEP}</span>`;
  const copyW = run.firstElementChild.getBoundingClientRect().width / stageScale();
  const trackW = track.clientWidth;
  if (!copyW || !trackW) return;
  const copies = Math.ceil(trackW / copyW) + 1;
  run.innerHTML = Array.from({ length: copies }, (_, i) => `<span class="copy"${i ? ' aria-hidden="true"' : ''}>${tickerHtml}${SEP}</span>`).join('');
  const pxPerSec = 90;
  tickerAnim = run.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${copyW}px)` }], {
    duration: (copyW / pxPerSec) * 1000, iterations: Infinity,
  });
}
function stageScale() {
  const st = $('#stage');
  return st.getBoundingClientRect().width / (st.offsetWidth || 1) || 1;
}
document.fonts?.ready.then(layoutTicker);
document.fonts?.addEventListener?.('loadingdone', layoutTicker);
document.fonts?.addEventListener?.('loadingdone', () => { if (current?.el) fitText(current.el); });
addEventListener('resize', () => { clearTimeout(layoutTicker.t); layoutTicker.t = setTimeout(layoutTicker, 300); });

// ---------- רוטציה ----------
function buildQueue() {
  const list = (DATA.display.screens || []).filter((x) => x.enabled && SCREENS[x.type] && (!onlyScreens || onlyScreens.includes(x.type)));
  const q = [];
  for (const item of list) {
    let out = null;
    try { out = SCREENS[item.type](ctx); } catch (e) { console.warn('screen failed', item.type, e); }
    if (!out) continue;
    const slides = Array.isArray(out) ? out : [out];
    slides.forEach((sl, i) => {
      const html = typeof sl === 'string' ? sl : sl.html;
      const secs = (typeof sl === 'object' && sl.seconds) || item.seconds || DATA.display.defaultSeconds || 12;
      q.push({ type: item.type, html, full: typeof sl === 'object' && !!sl.full, seconds: +(params.get('sec') || secs), key: `${item.type}:${typeof sl === 'object' && sl.key ? sl.key : i}` });
    });
  }
  return q;
}

// ---------- רקע לכל שקופית ----------
function displayOpts() {
  return { ...DATA.display, theme: params.get('theme') || DATA.display.theme || 'classic', scene: params.get('scene') || DATA.display.scene || 'auto' };
}
/** מחזיר Promise לכתובת הרקע של השקופית (או null) */
function bgFor(item, index) {
  const disp = displayOpts();
  const holiday = params.get('holiday') || ctx.day.holiday;
  const holidayOn = disp.holidayDesign !== false && holidayHasDesign(holiday);
  if (disp.bgImage && !holidayOn && item.type !== 'memorials' && !params.get('scene')) return Promise.resolve(disp.bgImage.replace(/"/g, ''));
  const scene = sceneForSlide({ screen: item.type, index, holiday, theme: disp.theme, display: disp });
  const day = ctx.day;
  const lit = (day.afterSunset ? chanukaDay(day.next.hd) : chanukaDay(day.hd)) || 8;
  return renderScene(scene, disp.theme, scene === 'chanukaWindow' ? { lit } : {});
}
let bgSeq = 0;
function setBg(url) {
  const host = $('#bg');
  const cur = host.querySelector('.layer.on');
  $('#stage').classList.toggle('has-scene', !!url);
  if ((cur?.dataset.url || '') === (url || '')) return;
  host.querySelectorAll('.layer:not(.on)').forEach((l) => l.remove());
  if (cur) { cur.classList.remove('on'); cur.classList.add('old'); setTimeout(() => cur.remove(), 1400); }
  if (!url) return;
  const el = document.createElement('div');
  el.className = 'layer'; el.dataset.url = url; el.style.backgroundImage = `url("${url}")`;
  host.appendChild(el); void el.offsetWidth; el.classList.add('on');
}
function applyBg(item, index) {
  const seq = ++bgSeq;
  bgFor(item, index).then((url) => { if (seq === bgSeq) setBg(url); }).catch(() => {});
  // מכין מראש את הרקע של השקופית הבאה, כדי שהמעבר יהיה חלק
  const n = queue[(index + 1) % queue.length];
  if (n) setTimeout(() => bgFor(n, (index + 1) % queue.length).catch(() => {}), 1500);
}

/** מקטין את הטקסט בכרטיס הלכה/משנה עד שהכרטיס כולו (כולל המקור והעיטורים) נכנס במקום */
function fitText(root) {
  // שינויים בתפילה: מקטינים את הסרטים עד שכולם נכנסים בכרטיס
  root.querySelectorAll('.body.changes').forEach((body) => {
    const list = body.querySelector('.chg-list');
    if (!list) return;
    const card = body.closest('.card'), scr = body.closest('.screen');
    // חורג אם הרשימה גבוהה מהמקום שלה, או שהכרטיס כולו יוצא מתחתית השקופית
    const over = () => list.offsetHeight > body.clientHeight + 1 || (scr && card.getBoundingClientRect().bottom > scr.getBoundingClientRect().bottom + 1);
    let fs = parseFloat(getComputedStyle(list).getPropertyValue('--rb-fs')) || 40, guard = 0;
    while (over() && fs > 20 && guard++ < 40) { fs -= 1.5; list.style.setProperty('--rb-fs', `${fs}px`); }
  });
  root.querySelectorAll('.halacha .x').forEach((x) => {
    const card = x.closest('.card');
    const over = () => { const need = [...card.children].reduce((a, c) => a + c.offsetHeight, 0) + (card.children.length - 1) * parseFloat(getComputedStyle(card).rowGap || 0) + parseFloat(getComputedStyle(card).paddingTop) + parseFloat(getComputedStyle(card).paddingBottom); return need > card.clientHeight + 1 || card.scrollHeight > card.clientHeight + 1; };
    let size = parseFloat(getComputedStyle(x).fontSize), guard = 0;
    while (over() && size > 20 && guard++ < 60) { size -= 1.5; x.style.fontSize = `${size}px`; }
  });
}

function show(next) {
  const host = $('#screens');
  const el = document.createElement('div');
  el.className = next.full ? 'screen full' : 'screen';
  $('#stage').classList.toggle('fullslide', !!next.full);
  el.innerHTML = next.html;
  host.appendChild(el);
  fitText(el); setTimeout(() => fitText(el), 600); setTimeout(() => fitText(el), 2500); // שוב אחרי טעינת גופנים
  void el.offsetWidth; // מאלץ ציור לפני המעבר
  el.classList.add('on');
  const prev = current;
  current = { ...next, el };
  applyBg(next, qi);
  if (prev?.el) {
    prev.el.classList.remove('on');
    setTimeout(() => prev.el.remove(), 1000);
  }
  renderDots();
}

function renderDots() {
  $('#dots').innerHTML = queue.map((_, i) => `<i class="${i === qi ? 'on' : ''}"></i>`).join('');
}

function advance(step = 1) {
  if (typeof step !== 'number') step = 1;
  clearTimeout(timer);
  buildCtx();
  if ((DATA.halachaSource || 'sa') === 'sa') prefetchHalachot(ctx.todayIso, DATA.halachaStart || DEFAULT_START).catch(() => {});
  if (DATA.display.screens.some((x) => x.type === 'mishna' && x.enabled)) prefetchMishna(DATA.synagogue).catch(() => {});
  renderHeader();
  renderTicker();
  queue = buildQueue();
  if (!queue.length) { timer = setTimeout(advance, 10000); return; }
  const lastKey = current?.key;
  let idx = queue.findIndex((x) => x.key === lastKey);
  qi = ((idx < 0 && step < 0 ? 0 : idx) + step + queue.length) % queue.length;
  if (queue.length === 1 && current?.key === queue[0].key) {
    current.el.innerHTML = queue[0].html; fitText(current.el); // רענון תוכן בלי מעבר
  } else {
    show(queue[qi]);
  }
  timer = setTimeout(advance, queue[qi].seconds * 1000);
}

// ---------- הפעלה ----------
// תצוגה מקדימה של תמונה אחת מממשק הגבאי: ?slidepreview#<JSON> – לפני שמירה
const SLIDE_PREVIEW = params.has('slidepreview');
let pvCount = 0;
function applySlidePreview() {
  if (!SLIDE_PREVIEW || !DATA) return;
  try {
    const s = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    DATA.slides = [{ ...s, id: `pv${++pvCount}`, enabled: true, from: '', to: '' }];
    DATA.display.offHours = { ...DATA.display.offHours, enabled: false };
    const sc = DATA.display.screens.find((x) => x.type === 'images');
    if (sc) sc.enabled = true; else DATA.display.screens.push({ type: 'images', enabled: true, seconds: 12 });
  } catch { /* אין נתונים */ }
}
addEventListener('hashchange', () => { if (SLIDE_PREVIEW) { applySlidePreview(); advance(); } });

// ---------- דפדוף ידני: לחיצה/נגיעה במסך, החלקה או חיצים במקלדת ----------
// צד שמאל של המסך = הבאה, צד ימין = הקודמת (כמו דפדוף בספר עברי)
function flip(step) {
  if (!queue.length || SLIDE_PREVIEW || params.has('preview')) return;
  advance(step);
  const h = $('#fliphint');
  if (h) { h.textContent = `${qi + 1} / ${queue.length}`; h.classList.add('on'); clearTimeout(flip.t); flip.t = setTimeout(() => h.classList.remove('on'), 1200); }
}
// בטלפון מטפלים בנגיעה עצמה (באייפון 'click' על אזור שאינו כפתור לא תמיד מגיע, ויש השהיה של זום כפול)
let touch = null;
addEventListener('touchstart', (e) => { if (e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; else touch = null; }, { passive: true });
addEventListener('touchend', (e) => {
  if (!touch) return;
  const p = e.changedTouches[0], dx = p.clientX - touch.x, dy = p.clientY - touch.y, dt = Date.now() - touch.t; touch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { e.preventDefault(); flip(dx > 0 ? 1 : -1); } // החלקה ימינה = הבאה
  else if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < 600) { e.preventDefault(); flip(p.clientX < innerWidth / 2 ? 1 : -1); }
  lastTouch = Date.now();
}, { passive: false });
let lastTouch = 0;
addEventListener('click', (e) => {
  if (Date.now() - lastTouch < 800) return; // כבר טופל כנגיעה
  if (e.target.closest('a, button, input')) return;
  flip(e.clientX < innerWidth / 2 ? 1 : -1);
});
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); flip(1); }
  else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); flip(-1); }
});

// ---------- חיווי סנכרון ----------
let lastSync = null;
function renderSync() {
  const el = $('#sync span');
  if (!el) return;
  const off = document.body.classList.contains('offline');
  const t = lastSync ? new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: DATA?.synagogue?.tz || 'Asia/Jerusalem' }).format(lastSync) : '';
  el.textContent = off ? `אין חיבור${t ? ` · עודכן ${t}` : ''}` : t ? `עודכן ${t}` : '';
}
function markSync(source) {
  if (source === 'server' || source === 'realtime' || source === 'local' || source === 'demo' || source === 'missing') lastSync = new Date();
  document.body.classList.toggle('offline', source === 'cache' || !navigator.onLine);
  renderSync();
}

async function start() {
  fit();
  const r = await load();
  DATA = r.data;
  applySlidePreview();
  applyPerf();
  markSync(r.source);
  document.getElementById('loading').hidden = true;
  advance();
  setInterval(tickClock, 1000);
  tickClock();
  subscribe((data, info) => {
    DATA = data;
    applySlidePreview();
    applyPerf();
    markSync(info?.source);
    advance();
  });
  addEventListener('offline', () => { document.body.classList.add('offline'); renderSync(); });
  addEventListener('online', () => { document.body.classList.remove('offline'); renderSync(); });
  keepAwake();
  scheduleDailyReload();
  watchVersion();
}

// עדכון קוד: כל 5 דקות בודק את version.txt, ואם עלתה גרסה חדשה – מרענן את הלוח לבד
async function watchVersion() {
  const get = () => fetch('version.txt', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : null)).then((t) => t?.trim() || null).catch(() => null);
  const mine = await get();
  if (!mine) return;
  setInterval(async () => {
    const v = await get();
    if (!v || v === mine) return;
    try { for (const k of await caches.keys()) await caches.delete(k); } catch {} // בלי שאריות מגרסה קודמת
    try { (await navigator.serviceWorker?.getRegistration())?.update(); } catch {}
    location.reload();
  }, 5 * 60 * 1000);
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
