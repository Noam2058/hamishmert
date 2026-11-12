// ממשק הגבאי: עריכת כל הנתונים של הלוח.
import { load, save, mode, currentUser, signIn, signUp, signOut, exportJson, boardId, uploadMedia, deleteMedia } from './store.js';
import { demoData, normalize, SCREEN_LABEL, THEMES, uid } from './defaults.js';
import { SCHEDULES, ZMAN_BASES, resolveTime, describeTime, prayersForDay, lessonsForDay } from './prayers.js';
import { ZMANIM, HEB_MONTHS, computeDay, minToHhmm, fmtTime, yahrzeitIn, birthdayIn, inHebrewRange, renderHeb } from './jewish.js';
import { refForDate, heNum, DEFAULT_START } from './halacha-sa.js';
import { SCENE_CHOICES } from './scenes.js';
import { HOLIDAY_DAYS, HOLIDAY_LABEL, nextOccurrence, holidayOccurrences } from './holidays.js';
import { annActive, annWhen, annBody, annClasses, annStyle, ANN_DEFAULT_FMT, ANN_SIZES, ANN_FONTS, ANN_BGS, ANN_COLORS } from './ann.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let DATA = null;
let SAVED = null;      // עותק של מה ששמור בשרת – ל"בטל שינויים"
let dirty = false;
let tab = 'home';
const openIds = new Set(); // פריטים פתוחים ברשימות (נשמר בין רינדורים)
const filters = {};
let pendingDeletes = []; // קבצים שיימחקו מהאחסון אחרי שמירה
const advIds = new Set(); // "אפשרויות מתקדמות" שנפתחו בשדה שעה

// ---------- אייקונים ----------
const I = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  prayers: '<path d="M12 3v4M8 5l4-2 4 2"/><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 12h6M9 16h6"/>',
  lessons: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5M8 7h7"/>',
  announcements: '<path d="M4 10v4a1 1 0 001 1h2l5 4V5L7 9H5a1 1 0 00-1 1z"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"/>',
  holidayPrayers: '<path d="M12 2.5l2.4 5 5.6.7-4.1 3.8 1.1 5.5L12 14.8 7 17.5l1.1-5.5L4 8.2l5.6-.7z"/>',
  dedications: '<path d="M12 3c2 3 2 4.5 0 6.5C10 7.5 10 6 12 3z"/><path d="M8 21h8M10 21v-9h4v9"/>',
  memorials: '<path d="M12 3c2 3 2 4.5 0 6.5C10 7.5 10 6 12 3z"/><rect x="9" y="10" width="6" height="11" rx="1.5"/>',
  parnasim: '<path d="M12 21s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.6-7 10-7 10z"/>',
  birthdays: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M4 15c2 1.5 4 1.5 5.3 0 1.4 1.5 4 1.5 5.4 0 1.3 1.5 3.3 1.5 5.3 0M12 11V7"/><path d="M12 3.5c.9 1 .9 2 0 3-.9-1-.9-2 0-3z"/>',
  hilulot: '<path d="M12 2.5l2.4 5 5.6.7-4.1 3.8 1.1 5.5L12 14.8 7 17.5l1.1-5.5L4 8.2l5.6-.7z"/>',
  halachot: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3M9 11h6M9 15h6"/>',
  shul: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M12 8.5l1 1.7h2l-1 1.7 1 1.7h-2l-1 1.7-1-1.7H9l1-1.7-1-1.7h2z"/>',
  display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  backup: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
  slides: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k] || ''}</svg>`;

// ---------- מצב שמירה ----------
function setDirty(v = true) {
  dirty = v;
  $('#savebar').hidden = !v;
  // מצב השמירה בפס העליון (רק תצוגה – השמירה עצמה בפס התחתון שמופיע כשיש שינויים)
  const st = $('#status'); st.hidden = false; st.textContent = v ? 'יש שינויים שלא נשמרו' : 'הכל שמור'; st.classList.toggle('dirty', v);
}
function flash(text, err = false) {
  const m = $('#msg'); m.textContent = text; m.className = 'toast' + (err ? ' err' : ''); m.hidden = false;
  clearTimeout(flash.t); flash.t = setTimeout(() => { m.hidden = true; }, err ? 8000 : 3200);
}
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) doSave(); } });

// ---------- עזרי תאריכים ----------
const todayDay = () => computeDay(new Date(), DATA.synagogue);
const WEEKDAY_OPTS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_OPTS = [['', '—'], ...HEB_MONTHS];
const MONTH_HE = Object.fromEntries(HEB_MONTHS);
const SCHED_HE = Object.fromEntries(SCHEDULES);
const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${+d}.${+m}.${y.slice(2)}`; };
const isoToday = () => new Date().toLocaleDateString('en-CA', { timeZone: DATA.synagogue.tz || 'Asia/Jerusalem' });
const activeRange = (it) => { const t = isoToday(); return (!it.from || it.from <= t) && (!it.to || it.to >= t); };
const daysText = (w) => (!w || !w.length || w.length === 7 ? '' : w.length === 5 && [0, 1, 2, 3, 4].every((d) => w.includes(d)) ? 'א׳–ה׳' : w.map((d) => WEEKDAY_OPTS[d] + '׳').join(' '));
const DAY_NAME = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const BASE_DOWS = { weekday: [0, 1, 2, 3, 4], friday: [5], shabbat: [6] };
const sampleCache = new Map();
/** היום הקרוב שבו התפילה/השיעור באמת חלים – כדי להציג את השעה של אותו יום (שבת הקרובה, יום שלישי הקרוב…) */
function sampleDay(item) {
  const sched = item.schedule || null; // רק לתפילות
  const wd = item.weekdays?.length ? item.weekdays : null;
  const key = `${isoToday()}|${sched}|${wd}|${item.holiday || ''}`;
  if (sampleCache.has(key)) return sampleCache.get(key);
  let res = null;
  try {
    const today = todayDay().civil;
    const at = (i) => new Date(today.getTime() + i * 86400000);
    let dows = sched ? BASE_DOWS[sched] : null;
    if (sched === 'holiday') {
      const o = item.holiday ? nextOccurrence(item.holiday, today, DATA.synagogue.il !== false) : null;
      if (o) { const d = computeDay(o.date, DATA.synagogue); res = { i: Math.round((o.date - today) / 86400000), day: d, hol: o.label }; }
    } else if (sched && !dows) { // לוח מיוחד: ראש חודש, חג, תענית… – מחפשים את היום הקרוב שמתויג כך
      for (let i = 0; i < 400 && !res; i++) {
        const d = computeDay(at(i), DATA.synagogue);
        if (d.tags?.includes(sched) && (!wd || wd.includes(d.civil.getDay()))) res = { i, day: d };
      }
    } else {
      dows = dows ? (wd ? dows.filter((x) => wd.includes(x)) : dows) : (wd || [0, 1, 2, 3, 4, 5, 6]);
      for (let i = 0; i < 7 && !res; i++) if (dows.includes(at(i).getDay())) res = { i, day: computeDay(at(i), DATA.synagogue) };
    }
    if (res) {
      const dow = res.day.civil.getDay();
      const name = res.hol ? `ב${res.hol}` : res.i === 0 ? 'היום' : res.i === 1 ? 'מחר' : dow === 6 ? 'בשבת הקרובה'
        : sched && !BASE_DOWS[sched] ? `ב${SCHED_HE[sched]} הקרוב` : `ביום ${DAY_NAME[dow]} הקרוב`;
      res.label = `${name} (${renderHeb(res.day.hd)})`;
    }
  } catch (e) { console.warn(e); }
  if (sampleCache.size > 60) sampleCache.clear();
  sampleCache.set(key, res);
  return res;
}
function timeOf(item) {
  if (!item.time) return '';
  if (item.time.type !== 'zman') return item.time.value || '';
  try {
    const day = sampleDay(item)?.day || todayDay();
    const m = resolveTime(item.time, day.civil, DATA.synagogue, { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah });
    return m == null ? '' : minToHhmm(m);
  } catch { return ''; }
}
function hebDateOf(item, fn) {
  try {
    const hd = todayDay().hd; let d = fn(hd.getFullYear(), item);
    if (d && d.deltaDays(hd) < 0) d = fn(hd.getFullYear() + 1, item);
    return d ? renderHeb(d) : '';
  } catch { return ''; }
}

// ---------- הקטנת תמונה לפני העלאה ----------
async function shrinkImage(file) {
  // עד 2560 פיקסלים בצד הארוך ועד ~5 מגה-פיקסל – מספיק כדי שטקסט במסמך יישאר חד
  if (file.type === 'image/gif') { if (file.size > 5e6) throw new Error('קובץ GIF גדול מ-5MB'); return { blob: file, ext: 'gif' }; }
  const bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('לא הצלחתי לקרוא את התמונה')); im.src = URL.createObjectURL(file); });
  const k = Math.min(1, 2560 / Math.max(bmp.naturalWidth, bmp.naturalHeight), Math.sqrt(5e6 / (bmp.naturalWidth * bmp.naturalHeight)));
  const w = Math.round(bmp.naturalWidth * k), h = Math.round(bmp.naturalHeight * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h);
  URL.revokeObjectURL(bmp.src);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88));
  return { blob, ext: 'jpg', w, h };
}

// ---------- גרירה לשינוי סדר (עובד גם במגע בטלפון) ----------
/** container: האב; itemSel: שורה; onDone(order): מערך האינדקסים המקוריים בסדר החדש. canSwap(a, b) – מגביל לאותה קבוצה */
function makeSortable(container, itemSel, onDone, canSwap = () => true) {
  container.querySelectorAll(`${itemSel} .grip`).forEach((h) => {
    h.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    h.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      const item = h.closest(itemSel);
      const before = [...container.querySelectorAll(itemSel)].map((x) => x.dataset.i).join(',');
      item.classList.add('dragging'); document.body.classList.add('is-dragging');
      let lastY = e.clientY, raf = 0;
      const scroller = () => { // גלילה אוטומטית ליד קצה המסך
        const edge = 90;
        if (lastY < edge) scrollBy(0, -12); else if (lastY > innerHeight - edge) scrollBy(0, 12);
        raf = requestAnimationFrame(scroller);
      };
      raf = requestAnimationFrame(scroller);
      const move = (ev) => {
        ev.preventDefault();
        lastY = ev.clientY;
        const el = document.elementFromPoint(container.getBoundingClientRect().left + 20, ev.clientY)?.closest(itemSel);
        if (!el || el === item || !container.contains(el) || !canSwap(item, el)) {
          const all = [...container.querySelectorAll(itemSel)];
          const under = all.find((x) => { const r = x.getBoundingClientRect(); return ev.clientY >= r.top && ev.clientY <= r.bottom; });
          if (!under || under === item || !canSwap(item, under)) return;
          return place(under, ev.clientY);
        }
        place(el, ev.clientY);
      };
      const place = (el, y) => { const r = el.getBoundingClientRect(); el[y < r.top + r.height / 2 ? 'before' : 'after'](item); };
      const up = () => {
        cancelAnimationFrame(raf);
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        item.classList.remove('dragging'); document.body.classList.remove('is-dragging');
        const order = [...container.querySelectorAll(itemSel)].map((x) => +x.dataset.i);
        if (order.join(',') !== before) onDone(order);
      };
      // מאזינים על החלון: כשהשורה זזה ב-DOM הדפדפן משחרר את ה-pointer capture
      addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  });
}
// תצוגה מקדימה חיה של תמונה – הלוח עצמו בקטן, עם ההגדרות שנבחרו (גם לפני שמירה)
function slidePreviewSrc(it) {
  const q = location.search;
  const data = { url: it.url, fit: it.fit || 'contain', size: it.size || 100, bg: it.bg || 'board', title: it.title || '', caption: it.caption || '', seconds: +it.seconds || 12 };
  return `index.html${q ? q + '&' : '?'}preview&screens=images&slidepreview#${encodeURIComponent(JSON.stringify(data))}`;
}
function mountSlidePreview(row, it) {
  const box = row.querySelector('.slide-pv');
  if (!box) return;
  let f = box.querySelector('iframe');
  if (!f) {
    f = document.createElement('iframe');
    f.title = 'תצוגה מקדימה'; f.tabIndex = -1; f.src = slidePreviewSrc(it);
    box.appendChild(f);
    const fit = () => { f.style.transform = `scale(${box.clientWidth / 1920})`; };
    fit(); new ResizeObserver(fit).observe(box);
  } else {
    const u = slidePreviewSrc(it); f.contentWindow?.location.replace(u);
  }
}
// סידור מחדש רק של הפריטים שמוצגים (order = האינדקסים המקוריים בסדר החדש); השאר נשארים במקומם
const reorder = (arr, order) => { const slots = [...order].sort((a, b) => a - b); const items = order.map((i) => arr[i]); slots.forEach((s, k) => { arr[s] = items[k]; }); };

// ---------- בחירת מצב תצוגה לתמונה ----------
const FRAME = (inner, bars = true) => `<svg viewBox="0 0 64 36" aria-hidden="true"><rect x="1" y="1" width="62" height="34" rx="3" class="scr"/>${bars ? '<rect x="1" y="1" width="62" height="5" rx="1" class="bar"/><rect x="1" y="31" width="62" height="4" rx="1" class="bar"/>' : ''}${inner}</svg>`;
const DOC = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="pic"/><path d="M${x + 2} ${y + 3}h${w - 4}M${x + 2} ${y + 6}h${w - 6}M${x + 2} ${y + 9}h${w - 4}" class="ln"/>`;
const FITS = [
  ['contain', 'כל התמונה', 'רואים את כולה, בתוך מסגרת', FRAME(DOC(22, 8, 20, 21))],
  ['width', 'רוחב מלא', 'ממלאת לרוחב, מתחילה מלמעלה', FRAME(DOC(5, 8, 54, 21))],
  ['cover', 'מילוי מלא', 'ממלאת הכל, חיתוך בשוליים', FRAME('<rect x="5" y="8" width="54" height="21" class="pic"/><path d="M5 8l54 21M59 8L5 29" class="ln"/>')],
  ['scroll', 'גלילה איטית', 'למסמך לאורך – גדול ונגלל', FRAME(`${DOC(17, 8, 30, 21)}<path d="M52 11v14M49 22l3 3 3-3" class="arw"/>`)],
  ['zoom', 'זום איטי', 'תנועה עדינה לתמונה', FRAME('<rect x="5" y="8" width="54" height="21" class="pic"/><rect x="14" y="12" width="36" height="13" class="ln" fill="none"/><path d="M50 12l4-3M14 25l-4 3" class="arw"/>')],
  ['full', 'מסך מלא', 'על כל המסך, בלי הפסים', FRAME('<rect x="1" y="1" width="62" height="34" rx="3" class="pic"/><path d="M4 9V4h5M60 9V4h-5M4 27v5h5M60 27v5h-5" class="arw"/>', false)],
];

// ---------- הגדרות שדות לכל רשימה ----------
const LISTS = {
  prayers: {
    label: 'תפילות', single: 'תפילה', group: 'schedule',
    help: 'כל תפילה שייכת ללוח: חול, ערב שבת, שבת, ראש חודש, חג… תפילה בלוח מיוחד מחליפה תפילה באותו שם מלוח החול או השבת.',
    blank: () => ({ id: uid(), name: '', schedule: 'weekday', time: { type: 'fixed', value: '07:00' } }),
    fields: [['name', 'שם התפילה', 'text'], ['schedule', 'מתי התפילה', 'schedule'], ['weekdays', 'רק בימים (ריק = כל הימים)', 'weekdays'], ['note', 'הערה (מוצגת מתחת לשם)', 'text'], ['time', 'שעה', 'time']],
    sum: (it) => ({ title: it.name, meta: [it.schedule === 'holiday' ? (HOLIDAY_LABEL[it.holiday] || 'לא נבחר חג') : '', it.time?.type === 'zman' ? describeTime(it.time) : 'שעה קבועה', daysText(it.weekdays), it.note].filter(Boolean).join(' · '), time: timeOf(it) }),
    calc: true,
  },
  lessons: {
    label: 'שיעורים', single: 'שיעור',
    help: 'שיעורים קבועים. מוצגים בשקופית "שיעורים" משלהם (היום – מודגש) ובפס הגולל ביום שלהם.',
    blank: () => ({ id: uid(), title: '', teacher: '', weekdays: [0, 1, 2, 3, 4], time: { type: 'fixed', value: '20:00' } }),
    fields: [['title', 'שם השיעור', 'text'], ['teacher', 'מעביר השיעור', 'text'], ['weekdays', 'ימים', 'weekdays'], ['note', 'הערה', 'text'], ['time', 'שעה', 'time']],
    sum: (it) => ({ title: it.title, meta: [it.teacher, daysText(it.weekdays) || 'כל יום'].filter(Boolean).join(' · '), time: timeOf(it) }),
    calc: true,
  },
  announcements: {
    label: 'הודעות', single: 'הודעה',
    help: 'אפשר להציג תמיד, בין תאריכים לועזיים, או לפי תאריך עברי שחוזר כל שנה (למשל לפני פורים). שורה חדשה בטקסט = שורה חדשה בלוח.',
    blank: () => ({ id: uid(), style: 'general', title: '', body: '', dateMode: 'civil', from: '', to: '', fmt: { ...ANN_DEFAULT_FMT } }),
    rerender: ['dateMode'],
    preview: (it) => annPreviewHtml(it),
    fields: [['title', 'כותרת', 'text'], ['style', 'סגנון', 'select', [['general', 'רגיל'], ['simcha', 'שמחה'], ['memorial', 'אבל / אזכרה'], ['urgent', 'חשוב']]],
      ['fmt', 'עיצוב כל ההודעה', 'annfmt'], ['body', 'תוכן ההודעה', 'richtext'],
      ['dateMode', 'מתי להציג', 'select', [['civil', 'תמיד, או בין תאריכים לועזיים'], ['hebrew', 'לפי תאריך עברי – חוזר כל שנה']]],
      ['from', 'מתאריך (ריק = מעכשיו)', 'date', null, (it) => it.dateMode !== 'hebrew'], ['to', 'עד תאריך (ריק = תמיד)', 'date', null, (it) => it.dateMode !== 'hebrew'],
      ['hFrom', 'מיום (עברי)', 'hebdate', ['hFromDay', 'hFromMonth'], (it) => it.dateMode === 'hebrew'], ['hTo', 'עד יום (עברי, ריק = יום אחד)', 'hebdate', ['hToDay', 'hToMonth'], (it) => it.dateMode === 'hebrew']],
    sum: (it) => ({ title: it.title || (it.body || '').split('\n')[0], meta: annWhen(it), badge: annActive(it, isoToday(), todayDay().hd) ? ['on', 'מוצגת'] : ['off', it.dateMode === 'hebrew' ? 'לא בתקופה' : 'לא בתוקף'] }),
  },
  memorials: {
    label: 'אזכרות', single: 'אזכרה', search: true,
    help: 'אפשר להזין תאריך פטירה לועזי (ולסמן אם אחרי השקיעה), או יום וחודש עבריים. הלוח מחשב את יום האזכרה בכל שנה.',
    blank: () => ({ id: uid(), name: '', date: '', afterSunset: false, hebDay: '', hebMonth: '', by: '' }),
    fields: [['name', 'שם (פלוני בן פלונית)', 'text'], ['by', 'הונצח ע"י', 'text'], ['date', 'תאריך פטירה לועזי', 'date'], ['afterSunset', 'נפטר אחרי השקיעה', 'check'], ['hebDay', 'או: יום עברי', 'number'], ['hebMonth', 'חודש עברי', 'select', MONTH_OPTS]],
    sum: (it) => { const d = hebDateOf(it, yahrzeitIn); return { title: it.name, meta: [d ? `האזכרה הקרובה: ${d}` : 'חסר תאריך', it.by].filter(Boolean).join(' · ') }; },
  },
  birthdays: {
    label: 'ימי הולדת', single: 'יום הולדת', search: true,
    help: 'מוצגים בשבוע של יום ההולדת העברי.',
    blank: () => ({ id: uid(), name: '', date: '', afterSunset: false, hebDay: '', hebMonth: '' }),
    fields: [['name', 'שם', 'text'], ['note', 'הערה', 'text'], ['date', 'תאריך לידה לועזי', 'date'], ['afterSunset', 'נולד אחרי השקיעה', 'check'], ['hebDay', 'או: יום עברי', 'number'], ['hebMonth', 'חודש עברי', 'select', MONTH_OPTS]],
    sum: (it) => { const d = hebDateOf(it, birthdayIn); return { title: it.name, meta: d ? `יום ההולדת הקרוב: ${d}` : 'חסר תאריך' }; },
  },
  slides: {
    label: 'תמונות שלי', single: 'תמונה', noAdd: true,
    help: 'תמונה שתעלה הופכת לשקופית בלוח – מודעה, הזמנה לשמחה, צילום מאירוע. כל תמונה מוצגת כשקופית נפרדת, ואפשר להגביל אותה לתאריכים.',
    head: () => `<section class="card drop" id="drop">
        <div class="drop-in">${icon('upload')}<div><b>גרור לכאן תמונות</b> או <label class="link" for="up">בחר מהמכשיר</label><input id="up" type="file" accept="image/*" multiple hidden></div>
        <small class="muted">JPG, PNG או GIF. תמונה לרוחב ממלאת את המסך; דף לאורך (למשל לוח זמנים) מוצג בגדול ונגלל לאט כדי שאפשר יהיה לקרוא.</small></div>
        <div class="progress" id="upprog" hidden></div></section>`,
    bindHead: (rerender) => {
      const go = async (files) => {
        const list = [...files].filter((f) => f.type.startsWith('image/'));
        if (!list.length) return flash('אפשר להעלות רק קבצי תמונה', true);
        const prog = $('#upprog'); prog.hidden = false;
        let ok = 0;
        for (const [n, f] of list.entries()) {
          prog.textContent = `מעלה ${n + 1} מתוך ${list.length}: ${f.name}…`;
          try {
            const { blob, ext, w, h } = await shrinkImage(f);
            const { url, path } = await uploadMedia(blob, ext);
            const tall = w && h && h > w * 1.15; // מסמך לאורך – גלילה איטית כדי שאפשר יהיה לקרוא
            const it = { id: uid(), url, path, title: '', caption: '', seconds: tall ? 30 : (DATA.display.defaultSeconds || 12), fit: tall ? 'scroll' : 'contain', enabled: true, from: '', to: '', w, h, name: f.name };
            DATA.slides.push(it); openIds.add(it.id); ok++; // נפתחת מיד – כדי לבחור איך להציג
          } catch (e) { flash(`ההעלאה של ${f.name} נכשלה: ${e.message}`, true); }
        }
        prog.hidden = true;
        const sc = DATA.display.screens.find((x) => x.type === 'images'); if (sc && !sc.enabled) sc.enabled = true;
        if (ok) { setDirty(); updateCounts(); rerender(); await doSave(); }
      };
      $('#up').onchange = (e) => go(e.target.files);
      const d = $('#drop');
      ['dragenter', 'dragover'].forEach((ev) => d.addEventListener(ev, (e) => { e.preventDefault(); d.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => d.addEventListener(ev, (e) => { e.preventDefault(); d.classList.remove('over'); }));
      d.addEventListener('drop', (e) => go(e.dataTransfer.files));
    },
    onDelete: (it) => { if (it.path) pendingDeletes.push(it.path); },
    blank: () => ({ id: uid(), url: '', title: '', caption: '', seconds: 12, fit: 'contain', enabled: true }),
    fields: [['fit', 'איך להציג את התמונה', 'fit'],
      ['size', 'גודל התמונה', 'select', [[100, 'גדול (100%)'], [90, '90%'], [80, '80%'], [70, '70%'], [60, 'קטן (60%)']]],
      ['stretch', 'מתיחה לרוחב (ב"כל התמונה" וב"מסך מלא")', 'range', { min: 100, max: 250, step: 5, unit: '%', zero: 'בלי מתיחה' }],
      ['bg', 'רקע מאחורי התמונה', 'select', [['board', 'הרקע של הלוח'], ['dark', 'כהה'], ['light', 'לבן']]],
      ['seconds', 'כמה שניות להציג', 'number'],
      ['title', 'כותרת מעל התמונה (לא חובה)', 'text'], ['caption', 'כיתוב על התמונה (לא חובה)', 'text'],
      ['from', 'מתאריך', 'date'], ['to', 'עד תאריך', 'date'], ['enabled', 'מוצגת בלוח', 'check']],
    sum: (it) => ({ thumb: it.url, title: it.title || it.caption || it.name || 'תמונה', meta: [(FITS.find((f) => f[0] === (it.fit || 'contain')) || FITS[0])[1], `${it.seconds || 12} שניות`, it.from || it.to ? `${fmtDate(it.from) || '…'} – ${fmtDate(it.to) || '…'}` : 'מוצגת תמיד'].join(' · '), badge: it.enabled === false ? ['off', 'מוסתרת'] : activeRange(it) ? ['on', 'מוצגת'] : ['off', 'לא בתוקף'] }),
  },
  halachot: {
    label: 'הלכות', single: 'הלכה',
    help: 'ברירת המחדל: סעיף אחד מהשולחן ערוך בכל יום. אפשר לבחור במקום זה בהלכות שתכתוב כאן.',
    head: () => {
      const src = DATA.halachaSource || 'sa', start = DATA.halachaStart || DEFAULT_START;
      const r = refForDate(isoToday(), start);
      return `<section class="card"><h2>מקור ההלכה היומית</h2><div class="form-grid">
        <label class="fld"><span>מקור</span><select id="h-src"><option value="sa" ${src === 'sa' ? 'selected' : ''}>שולחן ערוך – סעיף בכל יום, לפי הסדר</option><option value="custom" ${src === 'custom' ? 'selected' : ''}>ההלכות שברשימה למטה</option></select></label>
        <label class="fld"><span>התחלת המחזור (סימן א׳ סעיף א׳)</span><input id="h-start" type="date" value="${esc(start)}"></label>
      </div><p class="note">היום: <b>שולחן ערוך ${r.book.he}, סימן ${heNum(r.siman)} סעיף ${heNum(r.seif)}</b>. הסדר: אורח חיים א׳–רמ״א, ואחריו יורה דעה א׳–קי״א, ואז מתחילים מחדש. ההלכות שברשימה מוצגות כשבחרת בהן, או כגיבוי כשאין חיבור.</p></section>`;
    },
    bindHead: (rerender) => {
      $('#h-src').onchange = (e) => { DATA.halachaSource = e.target.value; setDirty(); };
      $('#h-start').onchange = (e) => { DATA.halachaStart = e.target.value || DEFAULT_START; setDirty(); rerender(); };
    },
    blank: () => ({ id: uid(), title: '', text: '', source: '' }),
    fields: [['title', 'כותרת', 'text'], ['source', 'מקור', 'text'], ['text', 'תוכן', 'textarea']],
    sum: (it) => ({ title: it.title, meta: it.source }),
  },
};

LISTS.dedications = {
  ...LISTS.announcements, label: 'לעילוי נשמת', single: 'הקדשה',
  help: 'שקופית "לעילוי נשמת" – כל הקדשה מוצגת ככרטיס, עם אותן אפשרויות עיצוב ותאריכים כמו בהודעות (למשל לפי תאריך עברי שחוזר כל שנה ביום הפטירה).',
  blank: () => ({ id: uid(), style: 'memorial', title: '', body: '', dateMode: 'civil', from: '', to: '', fmt: { ...ANN_DEFAULT_FMT } }),
};

LISTS.prayers.filter = (it) => it.schedule !== 'holiday';
LISTS.holidayPrayers = {
  ...LISTS.prayers, data: 'prayers', label: 'תפילות החגים', single: 'תפילת חג',
  filter: (it) => it.schedule === 'holiday',
  help: 'תפילות לחג או מועד מסוים. בלוח מוצגת שקופית "תפילות החג" משבוע לפני החג ועד סופו, וביום עצמו התפילות נכנסות ללוח התפילות של היום (תפילה באותו שם מחליפה את הרגילה).',
  group: 'holiday', groupDefault: '', groups: [['', 'לא נבחר חג'], ...HOLIDAY_DAYS.map(([k, l]) => [k, l])],
  blank: () => ({ id: uid(), name: '', schedule: 'holiday', holiday: '', time: { type: 'fixed', value: '07:00' } }),
  fields: [['holiday', 'איזה חג / מועד', 'select', [['', '— בחר חג —'], ...HOLIDAY_DAYS.map(([k, l]) => [k, l])]], ['name', 'שם התפילה', 'text'],
    ['weekdays', 'רק בימים (ריק = כל הימים)', 'weekdays'], ['note', 'הערה (מוצגת מתחת לשם)', 'text'], ['time', 'שעה', 'time']],
};

const NAV = [
  ['', [['home', 'סקירה']]],
  ['תפילות ושיעורים', [['prayers', 'תפילות'], ['holidayPrayers', 'תפילות החגים'], ['lessons', 'שיעורים']]],
  ['תוכן בלוח', [['announcements', 'הודעות'], ['dedications', 'לעילוי נשמת'], ['slides', 'תמונות שלי'], ['halachot', 'הלכה יומית']]],
  ['קהילה', [['memorials', 'אזכרות'], ['birthdays', 'ימי הולדת']]],
  ['הגדרות', [['shul', 'בית הכנסת'], ['display', 'תצוגה ועיצוב'], ['backup', 'גיבוי']]],
];

// ---------- רכיבי טופס ----------
function fieldHtml(item, [key, label, type, opts], path) {
  const id = `${path}-${key}`;
  const v = item[key];
  let input = '';
  if (type === 'text') input = `<input id="${id}" data-k="${key}" value="${esc(v)}">`;
  else if (type === 'number') input = `<input id="${id}" data-k="${key}" type="number" inputmode="numeric" value="${esc(v)}">`;
  else if (type === 'range') { const n = +(v || opts.min); input = `<div class="rangebox"><input id="${id}" data-k="${key}" type="range" min="${opts.min}" max="${opts.max}" step="${opts.step}" value="${n}" oninput="this.nextElementSibling.textContent = +this.value === ${opts.min} ? '${opts.zero}' : this.value + '${opts.unit}'"><output>${n === opts.min ? opts.zero : n + opts.unit}</output></div>`; }
  else if (type === 'date') input = `<input id="${id}" data-k="${key}" type="date" value="${esc(v)}">`;
  else if (type === 'textarea') input = `<textarea id="${id}" data-k="${key}">${esc(v)}</textarea>`;
  else if (type === 'check') return `<label class="fld check"><input id="${id}" data-k="${key}" type="checkbox" ${v ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  else if (type === 'select') input = `<select id="${id}" data-k="${key}">${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
  else if (type === 'fit') input = `<div class="fitpick" data-k="${key}" data-type="fit" role="radiogroup">${FITS.map(([val, lab, sub, svg]) => `<label class="fitopt"><input type="radio" name="${id}" value="${val}" ${(v || 'contain') === val ? 'checked' : ''}>${svg}<b>${lab}</b><small>${sub}</small></label>`).join('')}</div>`;
  else if (type === 'weekdays') input = `<div class="days" data-k="${key}" data-type="weekdays">${WEEKDAY_OPTS.map((d, i) => `<label><input type="checkbox" value="${i}" ${(v || []).includes(i) ? 'checked' : ''}>${d}׳</label>`).join('')}</div>`;
  else if (type === 'time') {
    const t = v || { type: 'fixed', value: '07:00' };
    const off = +(t.offset || 0), round = +(t.round || 0), basis = t.basis || 'day';
    const opt = (list, cur) => list.map(([k, l]) => `<option value="${k}" ${String(cur) === String(k) ? 'selected' : ''}>${l}</option>`).join('');
    const weekly = !['friday', 'shabbat'].includes(item.schedule);
    const ex = (dir) => { const m = 5 * 60 + 38, st = round || 5; const r = dir === 'up' ? Math.ceil(m / st) * st : dir === 'nearest' ? Math.round(m / st) * st : Math.floor(m / st) * st; return `05:38 יהיה ${minToHhmm(r)}`; };
    const advOpen = advIds.has(item.id) || round > 0 || (weekly && basis !== 'day');
    input = `<div class="timebox" data-k="${key}" data-type="time">
      <div class="tb-main">
        <select data-t="type" aria-label="סוג השעה">${opt([['fixed', 'שעה קבועה'], ['zman', 'לפי זמן היום (משתנה)']], t.type === 'zman' ? 'zman' : 'fixed')}</select>
        ${t.type !== 'zman' ? `<input data-t="value" type="time" value="${esc(t.value || '')}" aria-label="שעה">` : `
        <span class="tb-rel"><input data-t="mins" type="number" min="0" step="1" inputmode="numeric" value="${Math.abs(off)}" aria-label="כמה דקות"><span class="unit">דקות</span>
        <select data-t="side" aria-label="לפני או אחרי">${opt([[-1, 'לפני'], [1, 'אחרי']], off < 0 ? -1 : 1)}</select>
        <select data-t="zman" aria-label="הזמן">${opt(ZMAN_BASES, t.zman || 'sunset')}</select></span>`}
      </div>
      ${t.type === 'zman' ? `<details class="adv" ${advOpen ? 'open' : ''}><summary>אפשרויות מתקדמות – עיגול${weekly ? ' ושעה קבועה לכל השבוע' : ''}</summary>
        <div class="adv-grid">
          <label class="fld"><span>עיגול השעה</span><select data-t="round">${opt([[0, 'בלי עיגול – בדיוק לפי החישוב'], [5, 'לעגל ל-5 דקות'], [10, 'לעגל ל-10 דקות'], [15, 'לעגל לרבע שעה']], round)}</select>
            <small class="muted">שעה "עגולה" נוחה יותר לזכור (למשל 05:35 במקום 05:38).</small></label>
          ${round ? `<label class="fld"><span>לאיזה כיוון לעגל</span><select data-t="dir">${opt([['down', `להקדים · ${ex('down')}`], ['up', `לאחר · ${ex('up')}`], ['nearest', `לקרוב ביותר · ${ex('nearest')}`]], t.dir || 'down')}</select>
            <small class="muted">לתפילה שצריכה להיות לפני זמן מסוים (למשל לפני השקיעה) – בחר "להקדים".</small></label>` : ''}
          ${weekly ? `<label class="fld"><span>שעה אחידה לכל השבוע?</span><select data-t="basis">${opt([['day', 'לא – כל יום לפי הזמן של אותו יום'], ['week-min', 'כן – שעה אחת לא׳–ה׳, לפי היום המוקדם'], ['week-max', 'כן – שעה אחת לא׳–ה׳, לפי היום המאוחר']], basis)}</select>
            <small class="muted">זמני היום זזים בדקה-שתיים מיום ליום. "שעה אחת" נותנת אותה שעה כל ימות החול. "המוקדם" שומר שהתפילה לא תאחר את הזמן באף יום.</small></label>` : ''}
        </div></details>` : ''}
    </div>`;
  }
  else if (type === 'schedule') {
    // בחירה אחת: לוח רגיל, קבוצת ימים מיוחדים, או חג מסוים מהרשימה (בלי כפילות)
    const cur = item.schedule === 'holiday' ? `h:${item.holiday || ''}` : item.schedule === 'chanuka' ? 'h:chanuka' : (item.schedule || 'weekday');
    const o = (val, lab) => `<option value="${esc(val)}" ${cur === val ? 'selected' : ''}>${esc(lab)}</option>`;
    input = `<select id="${id}" data-k="${key}" data-type="schedule">
      <optgroup label="קבוע">${o('weekday', 'ימות החול')}${o('friday', 'ערב שבת')}${o('shabbat', 'שבת ומוצאי שבת')}</optgroup>
      <optgroup label="כל הימים מסוג">${o('rosh-chodesh', 'כל ראש חודש')}${o('erev-yomtov', 'כל ערב חג')}${o('yomtov', 'כל יום טוב')}${o('chol-hamoed', 'כל חול המועד')}${o('fast', 'כל תענית')}</optgroup>
      ${cur.startsWith('h:') ? `<optgroup label="חג מסוים">${o(cur, HOLIDAY_LABEL[cur.slice(2)] || 'חג')}</optgroup>` : ''}</select>
      <small class="muted">לתפילות של חג מסוים (ראש השנה, פורים…) – לשונית "תפילות החגים".</small>`;
  }
  else if (type === 'hebdate') {
    const [dk, mk] = opts; const d = item[dk] || '', m = item[mk] || '';
    input = `<div class="hebdate" data-k="${key}" data-type="hebdate" data-dk="${dk}" data-mk="${mk}">
      <select data-h="d" aria-label="יום">${['', ...Array.from({ length: 30 }, (_, i) => i + 1)].map((n) => `<option value="${n}" ${String(d) === String(n) ? 'selected' : ''}>${n ? heNum(n) : '—'}</option>`).join('')}</select>
      <select data-h="m" aria-label="חודש">${MONTH_OPTS.map(([k, l]) => `<option value="${esc(k)}" ${m === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  }
  else if (type === 'annfmt') {
    const f = { ...ANN_DEFAULT_FMT, ...(v || {}) };
    const AL = { right: '<path d="M4 6h16M8 10h12M4 14h16M10 18h10"/>', center: '<path d="M4 6h16M7 10h10M4 14h16M8 18h8"/>' };
    input = `<div class="fmtbar" data-k="${key}" data-type="annfmt">
      <span class="seg" role="radiogroup" aria-label="יישור">${[['right', 'לימין'], ['center', 'למרכז']].map(([k, l]) => `<label title="יישור ${l}"><input type="radio" data-f="align" name="${id}-al" value="${k}" ${f.align === k ? 'checked' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${AL[k]}</svg><span class="sr">${l}</span></label>`).join('')}</span>
      <span class="seg"><label title="מודגש"><input type="checkbox" data-f="bold" ${f.bold ? 'checked' : ''}><b>B</b></label><label title="קו תחתון"><input type="checkbox" data-f="underline" ${f.underline ? 'checked' : ''}><u>U</u></label></span>
      <select data-f="size" aria-label="גודל">${ANN_SIZES.map(([k, l]) => `<option value="${k}" ${f.size === k ? 'selected' : ''}>גודל: ${l}</option>`).join('')}</select>
      <select data-f="font" aria-label="גופן">${ANN_FONTS.map(([k, l, fam]) => `<option value="${k}" ${f.font === k ? 'selected' : ''} style="font-family:'${fam}'">גופן: ${l}</option>`).join('')}</select>
      <span class="fmt-row"><span class="fmt-lbl">צבע הטקסט</span><span class="swatches" role="radiogroup" aria-label="צבע הטקסט">${ANN_COLORS.map(([k, l, c]) => `<label title="צבע: ${l}"><input type="radio" data-f="color" name="${id}-tc" value="${k}" ${(f.color || 'auto') === k ? 'checked' : ''}><i class="sw ${k === 'auto' ? 'auto-ink' : ''}" style="${c ? `background:${c}` : ''}"></i></label>`).join('')}</span></span>
      <span class="fmt-row"><span class="fmt-lbl">רקע</span><span class="swatches" role="radiogroup" aria-label="רקע">${ANN_BGS.map(([k, l, c]) => `<label title="רקע: ${l}"><input type="radio" data-f="bg" name="${id}-bg" value="${k}" ${f.bg === k ? 'checked' : ''}><i class="sw ${k === 'auto' ? 'auto' : ''}" style="${c ? `background:${c}` : ''}"></i></label>`).join('')}</span></span>
    </div>`;
  }
  else if (type === 'richtext') {
    input = `<div class="rt"><div class="rt-bar" role="toolbar" aria-label="עיצוב החלק המסומן">
        <span class="rt-hint">סמן מילים בטקסט ולחץ:</span>
        <button type="button" data-wrap="**" title="מודגש"><b>B</b></button><button type="button" data-wrap="__" title="קו תחתון"><u>U</u></button><button type="button" data-wrap="++" title="גדול יותר">A<small>+</small></button>
        <span class="rt-colors">${ANN_COLORS.filter((c) => c[2]).map(([k, l, c]) => `<button type="button" data-color="${k}" title="צבע: ${l}"><i style="background:${c}"></i></button>`).join('')}</span>
        <button type="button" data-clear title="הסר עיצוב מהחלק המסומן" class="rt-clear">נקה</button></div>
      <div id="${id}" class="rt-ed" data-k="${key}" data-type="rich" contenteditable="true" role="textbox" aria-multiline="true" dir="rtl">${annBody(v)}</div></div>`;
  }
  const full = type === 'textarea' || type === 'richtext' || type === 'time' || type === 'weekdays' || type === 'fit' || type === 'annfmt' ? ' full' : '';
  return `<div class="fld${full}"><span>${esc(label)}</span>${input}</div>`;
}

function readField(el) {
  const type = el.dataset.type;
  if (type === 'weekdays') return [...el.querySelectorAll('input:checked')].map((i) => +i.value);
  if (type === 'fit') return el.querySelector('input:checked')?.value || 'contain';
  if (type === 'time') {
    const g = (k) => el.querySelector(`[data-t="${k}"]`)?.value;
    if (g('type') !== 'zman') return { type: 'fixed', value: g('value') || '00:00' };
    const mins = Math.abs(+(g('mins') || 0)), side = +(g('side') || 1);
    return { type: 'zman', zman: g('zman') || 'sunset', offset: mins * side, round: +(g('round') || 0), dir: g('dir') || 'down', basis: g('basis') || 'day' };
  }
  if (type === 'hebdate') {
    const d = el.querySelector('[data-h="d"]').value, m = el.querySelector('[data-h="m"]').value;
    return { [el.dataset.dk]: d === '' ? '' : +d, [el.dataset.mk]: m };
  }
  if (type === 'rich') return richToText(el);
  if (type === 'schedule') return el.value.startsWith('h:') ? { schedule: 'holiday', holiday: el.value.slice(2) } : { schedule: el.value, holiday: undefined };
  if (type === 'annfmt') {
    const q = (k) => el.querySelector(`[data-f="${k}"]`);
    return { align: el.querySelector('[data-f="align"]:checked')?.value || 'center', bold: q('bold').checked, underline: q('underline').checked,
      size: q('size').value, font: q('font').value, bg: el.querySelector('[data-f="bg"]:checked')?.value || 'auto', color: el.querySelector('[data-f="color"]:checked')?.value || 'auto' };
  }
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') return el.value === '' ? '' : +el.value;
  return el.value;
}

let renderedTab = null;
function freshPanel() {
  const old = document.getElementById('panel');
  const same = renderedTab === tab;
  const y = scrollY, h = old.offsetHeight; // נמדד לפני ההחלפה – אחרת הדף מתקצר והגלילה קופצת לראש
  const n = old.cloneNode(false);
  if (same) n.style.minHeight = `${h}px`;
  old.replaceWith(n);
  // באותה לשונית (הזזה, מחיקה, שינוי) – נשארים באותו מקום; רק במעבר לשונית עולים לראש
  if (same) queueMicrotask(() => { scrollTo({ top: y, behavior: 'instant' }); n.style.minHeight = ''; });
  else scrollTo({ top: 0 });
  renderedTab = tab;
  return n;
}
const head = (h, p, btns = '') => `<div class="page-head"><div><h1>${h}</h1>${p ? `<p>${p}</p>` : ''}</div>${btns ? `<div class="head-btns">${btns}</div>` : ''}</div>`;

function calcText(item) {
  if (item.time?.type !== 'zman') return '';
  const t = timeOf(item);
  const sd = sampleDay(item);
  return `${describeTime(item.time)} · ${sd ? sd.label : 'היום'}: ${t || '—'}`;
}

/** עורך "מה שרואים זה מה שמקבלים": התוכן נשמר כטקסט עם סימנים (**, __, ++, [[צבע:…]]) אבל מוצג מעוצב */
const HEX_NAME = Object.fromEntries(ANN_COLORS.filter((c) => c[2]).map(([k, , h]) => [h.toLowerCase(), k]));
function colorName(css) {
  if (!css) return null;
  let hex = css.trim().toLowerCase();
  const m = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) hex = '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  if (HEX_NAME[hex]) return HEX_NAME[hex];
  // הצבע הקרוב ביותר מהרשימה
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null;
  const c = rgb(hex); let best = null, bd = 1e9;
  for (const [h, k] of Object.entries(HEX_NAME)) { const d = rgb(h).reduce((s, v, i) => s + (v - c[i]) ** 2, 0); if (d < bd) { bd = d; best = k; } }
  return best;
}
function richToText(root) {
  const walk = (node) => {
    let out = '';
    node.childNodes.forEach((n, i) => {
      if (n.nodeType === 3) { out += n.nodeValue.replace(/ /g, ' '); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName;
      if (tag === 'BR') { out += '\n'; return; }
      let inner = walk(n);
      const st = n.style || {};
      const color = colorName(n.getAttribute('color') || st.color);
      if (tag === 'B' || tag === 'STRONG' || +st.fontWeight >= 600 || st.fontWeight === 'bold') inner = inner.trim() ? `**${inner}**` : inner;
      if (tag === 'U' || /underline/.test(st.textDecoration || st.textDecorationLine || '')) inner = inner.trim() ? `__${inner}__` : inner;
      if (n.classList?.contains('big') || (tag === 'FONT' && +n.getAttribute('size') >= 4)) inner = inner.trim() ? `++${inner}++` : inner;
      if (color) inner = inner.trim() ? `[[${color}:${inner}]]` : inner;
      if ((tag === 'DIV' || tag === 'P') && out && !out.endsWith('\n')) out += '\n';
      out += inner;
    });
    return out;
  };
  return walk(root).replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
}
function bindRichText(rt) {
  const ed = rt.querySelector('.rt-ed');
  let saved = null; // הבחירה האחרונה בעורך (באייפון לחיצה על כפתור עלולה לאבד אותה)
  const keep = () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
  document.addEventListener('selectionchange', keep);
  ed.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
  const run = (fn) => {
    ed.focus();
    const s = getSelection();
    if (saved && (!s.rangeCount || !ed.contains(s.anchorNode))) { s.removeAllRanges(); s.addRange(saved); }
    if (s.isCollapsed || !ed.contains(s.anchorNode)) { flash('סמן קודם בתוכן את המילים שתרצה לעצב'); return; }
    document.execCommand('styleWithCSS', false, false);
    fn();
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  };
  rt.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => e.preventDefault()); // שומר על הסימון בעורך
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      const w = btn.dataset.wrap;
      if (w === '**') run(() => document.execCommand('bold'));
      else if (w === '__') run(() => document.execCommand('underline'));
      else if (w === '++') run(() => { const cur = document.queryCommandValue('fontSize'); document.execCommand('fontSize', false, +cur >= 4 ? '3' : '5'); });
      else if (btn.dataset.color) run(() => {
        const hex = ANN_COLORS.find((c) => c[0] === btn.dataset.color)[2];
        const a = getSelection().anchorNode; const holder = (a?.nodeType === 3 ? a.parentElement : a)?.closest('font[color], span[style*="color"]');
        const same = !!holder && ed.contains(holder) && colorName(holder.getAttribute('color') || holder.style.color) === btn.dataset.color;
        document.execCommand('foreColor', false, same ? '#000001' : hex); // אותו צבע שוב = הסרה (מסומן בצבע "ריק")
        if (same) ed.querySelectorAll('font[color="#000001"]').forEach((f) => f.removeAttribute('color'));
      });
      else if ('clear' in btn.dataset) run(() => { document.execCommand('removeFormat'); ed.querySelectorAll('font').forEach((f) => { if (f.contains(getSelection().anchorNode)) f.removeAttribute('size'); }); });
    });
  });
}

function annPreviewHtml(it) {
  return `<div class="ann-pv ${esc(it.style || 'general')} ${annClasses(it)}"${annStyle(it)}>${it.title ? `<div class="t">${esc(it.title)}</div>` : ''}<div class="b">${annBody(it.body) || '<span class="muted">תוכן ההודעה…</span>'}</div></div>`;
}

// ---------- רשימות ----------
function summaryHtml(def, it) {
  const s = def.sum ? def.sum(it) : { title: it.name || it.title };
  return `${s.thumb ? `<img class="thumb" src="${esc(s.thumb)}" alt="" loading="lazy">` : ''}<span class="sum-main"><div class="sum-title${s.title ? '' : ' empty'}">${esc(s.title || `${def.single} חדשה – לחץ לעריכה`)}</div>${s.meta ? `<div class="sum-meta">${esc(s.meta)}</div>` : ''}</span>
    ${s.badge ? `<span class="badge ${s.badge[0]}">${esc(s.badge[1])}</span>` : ''}${s.time ? `<span class="sum-time">${esc(s.time)}</span>` : ''}<span class="chev">${icon('chev')}</span>`;
}

/** opts: true / {focusId} – לגלול לפריט חדש ולהתמקד בו; {anchorId, anchorTop} – להשאיר את הפריט שנערך באותו מקום על המסך */
function renderList(key, opts = null) {
  freshPanel();
  const def = LISTS[key];
  const arr = (DATA[def.data || key] ||= []); // כמה לשוניות יכולות להציג חלקים שונים מאותה רשימה (תפילות / תפילות החגים)
  const f = (filters[key] || '').trim();
  const mine = arr.map((it, i) => [it, i]).filter(([it]) => !def.filter || def.filter(it));
  const visible = mine.filter(([it]) => !f || JSON.stringify(it).includes(f));
  const itemHtml = ([it, i]) => `
    <details class="item" data-i="${i}" data-id="${esc(it.id)}" ${openIds.has(it.id) ? 'open' : ''}>
      <summary><span class="grip" title="גרור לשינוי הסדר" aria-label="גרור לשינוי הסדר">${icon('grip')}</span>${summaryHtml(def, it)}</summary>
      <div class="item-body">
        ${key === 'slides' ? `<div class="pv-wrap"><div class="preview slide-pv"></div><small class="muted">כך זה ייראה בלוח. הבחירות למטה מתעדכנות כאן מיד – וכשמרוצים, לוחצים "שמור".</small></div>` : ''}
        ${def.preview ? `<div class="pv-wrap ann-wrap"><div class="ann-box">${def.preview(it)}</div><small class="muted">תצוגה מקדימה – מתעדכנת תוך כדי הקלדה.</small></div>` : ''}
        <div class="form-grid">${def.fields.filter((fd) => !fd[4] || fd[4](it)).map((fd) => fieldHtml(it, fd, `${key}-${i}`)).join('')}</div>
        <div class="item-tools"><span class="calc">${def.calc ? esc(calcText(it)) : ''}</span>
          <span class="btns"><button class="icon" data-act="up" title="הזז למעלה" aria-label="הזז למעלה">${icon('up')}</button><button class="icon" data-act="down" title="הזז למטה" aria-label="הזז למטה">${icon('down')}</button><button class="icon" data-act="dup" title="שכפל" aria-label="שכפל">${icon('copy')}</button><button class="sm danger" data-act="del">${icon('trash')}<span>מחק</span></button></span></div>
      </div>
    </details>`;
  let listHtml;
  if (!mine.length) listHtml = def.noAdd ? '' : `<div class="empty-state">${icon(key)}<div>עוד אין ${def.label}.</div><button class="btn primary" data-add>${icon('plus')}הוסף ${def.single}</button></div>`;
  else if (!visible.length) listHtml = `<div class="empty-state">לא נמצא "${esc(f)}"</div>`;
  else if (def.group) {
    const GROUPS = def.groups || SCHEDULES;
    const glabel = Object.fromEntries(GROUPS);
    const groups = new Map(GROUPS.map(([k]) => [k, []]));
    visible.forEach((x) => { const g = x[0][def.group] || (def.groupDefault ?? 'weekday'); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); });
    listHtml = [...groups].filter(([, xs]) => xs.length).map(([g, xs]) => `<div class="group-title">${esc(glabel[g] || g)}</div>${xs.map(itemHtml).join('')}`).join('');
  } else listHtml = visible.map(itemHtml).join('');

  $('#panel').innerHTML = `
    ${head(def.label, esc(def.help), def.noAdd ? '' : `<button class="btn primary" data-add>${icon('plus')}הוסף ${def.single}</button>`)}
    ${def.head ? def.head() : ''}
    ${def.search && arr.length > 5 ? `<label class="search">${icon('search')}<input id="flt" type="search" placeholder="חיפוש…" value="${esc(f)}"></label>` : ''}
    <div class="list">${listHtml}</div>`;

  const p = $('#panel');
  p.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
    const it = def.blank(); arr.push(it); openIds.add(it.id); filters[key] = ''; setDirty(); renderList(key, { focusId: it.id }); updateCounts();
  });
  def.bindHead?.(() => renderList(key));
  const flt = $('#flt');
  if (flt) flt.oninput = () => { filters[key] = flt.value; clearTimeout(flt.t); flt.t = setTimeout(() => { renderList(key); const n = $('#flt'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };

  p.querySelectorAll('.item').forEach((row) => {
    const i = +row.dataset.i;
    row.querySelector('details.adv')?.addEventListener('toggle', (e) => { e.stopPropagation(); if (e.target.open) advIds.add(arr[i].id); else advIds.delete(arr[i].id); });
    row.addEventListener('toggle', (e) => { if (e.target !== row) return; if (row.open) { openIds.add(arr[i].id); if (key === 'slides') mountSlidePreview(row, arr[i]); } else openIds.delete(arr[i].id); });
    if (key === 'slides' && row.open) mountSlidePreview(row, arr[i]);
    const commit = (e) => {
      const el = e.target.closest('[data-k]');
      if (!el) return;
      const v = readField(el);
      if (el.dataset.type === 'hebdate' || el.dataset.type === 'schedule') { Object.assign(arr[i], v); if (v.holiday === undefined) delete arr[i].holiday; } else arr[i][el.dataset.k] = v;
      setDirty();
      const keep = { anchorId: arr[i].id, anchorTop: row.getBoundingClientRect().top };
      if (el.dataset.type === 'time' && ['type', 'round'].includes(e.target.dataset.t)) return renderList(key, keep);
      if (def.group && el.dataset.k === def.group) return renderList(key, { focusId: arr[i].id, noFocus: true }); // עבר לקבוצה אחרת – גוללים אליו
      if (def.rerender?.includes(el.dataset.k)) return renderList(key, keep);
      if (def.preview) row.querySelector('.ann-box').innerHTML = def.preview(arr[i]);
      if (def.calc) row.querySelector('.calc').textContent = calcText(arr[i]);
      if (key === 'slides') { clearTimeout(row.pvT); row.pvT = setTimeout(() => mountSlidePreview(row, arr[i]), 350); }
      const sm = row.querySelector('summary'); [...sm.children].slice(1).forEach((n) => n.remove()); sm.insertAdjacentHTML('beforeend', summaryHtml(def, arr[i]));
    };
    row.addEventListener('change', commit);
    // כל הקלדה נקלטת מיד – גם שעה, תאריך ומספר (באייפון 'change' מגיע רק כשיוצאים מהשדה)
    row.addEventListener('input', (e) => { if (e.target.matches('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable]') && e.target.dataset.t !== 'type') commit(e); });
    row.querySelectorAll('.rt').forEach((rt) => bindRichText(rt));
    row.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
      const act = b.dataset.act;
      if (act === 'del') {
        if (b.dataset.confirm) { def.onDelete?.(arr[i]); openIds.delete(arr[i].id); arr.splice(i, 1); setDirty(); renderList(key); updateCounts(); }
        else { b.dataset.confirm = '1'; b.innerHTML = 'בטוח? לחץ שוב'; setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.innerHTML = `${icon('trash')}<span>מחק</span>`; } }, 4000); }
        return;
      }
      if (act === 'dup' && key === 'slides') { const c = { ...structuredClone(arr[i]), id: uid(), path: null }; arr.splice(i + 1, 0, c); openIds.add(c.id); setDirty(); renderList(key); updateCounts(); return; }
      if (act === 'dup') { const c = { ...structuredClone(arr[i]), id: uid() }; arr.splice(i + 1, 0, c); openIds.add(c.id); setDirty(); renderList(key); updateCounts(); return; }
      // הזזה – בתוך אותה קבוצה (בתפילות: אותו לוח)
      const same = (j) => (!def.filter || def.filter(arr[j])) && (!def.group || (arr[j][def.group] || (def.groupDefault ?? 'weekday')) === (arr[i][def.group] || (def.groupDefault ?? 'weekday')));
      let j = i;
      do { j += act === 'up' ? -1 : 1; } while (j >= 0 && j < arr.length && !same(j));
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      setDirty(); renderList(key);
    });
  });
  if (!f) makeSortable(p.querySelector('.list'), '.item', (order) => { reorder(arr, order); setDirty(); renderList(key); },
    (a, b) => !def.group || (arr[+a.dataset.i][def.group] || (def.groupDefault ?? 'weekday')) === (arr[+b.dataset.i][def.group] || (def.groupDefault ?? 'weekday')));
  // אחרי שהגלילה של freshPanel חזרה למקומה (microtask) – ממקמים את הפריט הרלוונטי
  if (opts) queueMicrotask(() => {
    const id = opts.focusId || opts.anchorId;
    const row = id && [...p.querySelectorAll('.item')].find((x) => x.dataset.id === id);
    if (!row) return;
    if (opts.anchorId) { scrollBy({ top: row.getBoundingClientRect().top - opts.anchorTop, behavior: 'instant' }); return; }
    const r = row.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 80) row.scrollIntoView({ block: 'center', behavior: 'instant' });
    if (!opts.noFocus) row.querySelector('input:not([type=checkbox]):not([type=radio]),textarea')?.focus({ preventScroll: true });
  });
}

// סיסמת הממשק – מהמשנה (יומא ג, א): כשהגיע זמן העבודה במקדש, הצופה מכריז "ברקאי"
const MOTTO = `<figure class="motto"><blockquote>״אִם הִגִּיעַ, הָרוֹאֶה אוֹמֵר: בַּרְקַאי״</blockquote><figcaption>משנה, מסכת יומא, פרק ג׳ משנה א׳</figcaption></figure>`;

// ---------- חיפוש בכל הלוח ----------
const SEARCH_LISTS = ['prayers', 'holidayPrayers', 'lessons', 'announcements', 'dedications', 'memorials', 'birthdays', 'halachot', 'slides'];
function searchAll(q) {
  q = q.trim(); if (q.length < 2) return [];
  const out = [];
  for (const k of SEARCH_LISTS) {
    const def = LISTS[k]; const arr = DATA[def.data || k] || [];
    arr.forEach((it) => {
      if (def.filter && !def.filter(it)) return;
      const text = [it.name, it.title, it.teacher, it.body, it.text, it.note, it.by, it.caption, it.holiday && HOLIDAY_LABEL[it.holiday]].filter(Boolean).join(' ');
      if (text.includes(q)) out.push({ k, id: it.id, title: it.name || it.title || it.caption || (it.body || '').split('\n')[0] || def.single, where: [def.label, it.schedule === 'holiday' ? HOLIDAY_LABEL[it.holiday] : it.schedule && SCHED_HE[it.schedule], k === 'lessons' && daysText(it.weekdays)].filter(Boolean).join(' · ') });
    });
  }
  return out.slice(0, 30);
}
function goToItem(k, id) {
  tab = k; openIds.add(id); filters[k] = ''; renderNav(); renderList(k, { focusId: id, noFocus: true });
}
function bindSearch(input, box) {
  if (!input || !box) return;
  const show = () => {
    const res = searchAll(input.value);
    box.hidden = !input.value.trim();
    box.innerHTML = res.length ? res.map((r) => `<button type="button" data-k="${r.k}" data-id="${esc(r.id)}"><b>${esc(r.title)}</b><small>${esc(r.where)}</small></button>`).join('') : `<div class="none">לא נמצא "${esc(input.value)}"</div>`;
    box.querySelectorAll('button').forEach((b) => b.onclick = () => { input.value = ''; box.hidden = true; goToItem(b.dataset.k, b.dataset.id); });
  };
  input.addEventListener('input', show);
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; box.hidden = true; } if (e.key === 'Enter') box.querySelector('button')?.click(); });
}

// ---------- סקירה ----------
/** דברים שכדאי לטפל בהם */
function attention(day) {
  const out = [];
  const iso = isoToday();
  try {
    // חג קרוב בלי תפילות
    const occ = holidayOccurrences(day.civil, 21, DATA.synagogue.il !== false);
    const have = new Set((DATA.prayers || []).filter((p) => p.schedule === 'holiday').map((p) => p.holiday));
    const big = new Set(['rh1', 'yk', 'sukkot1', 'shmini', 'chanuka', 'purim', 'pesach1', 'pesach7', 'shavuot', 'tisha-bav', '9av', 'esther', 'erev-pesach']);
    const seen = new Set();
    for (const o of occ) {
      if (!big.has(o.key) || have.has(o.key) || seen.has(o.key)) continue;
      seen.add(o.key);
      const d = Math.round((o.date - day.civil) / 86400000);
      out.push({ text: `${o.label} ${d <= 0 ? 'היום' : d === 1 ? 'מחר' : `בעוד ${d} ימים`} – עוד לא הוגדרו תפילות לחג`, act: 'holidayPrayers', btn: 'הוסף תפילות', newHoliday: o.key });
    }
  } catch (e) { console.warn(e); }
  const noHol = (DATA.prayers || []).filter((p) => p.schedule === 'holiday' && !p.holiday).length;
  if (noHol) out.push({ text: `${noHol} תפילות חג בלי חג שנבחר – הן לא יוצגו`, act: 'holidayPrayers', btn: 'לתקן' });
  const noName = (DATA.prayers || []).filter((p) => !(p.name || '').trim()).length + (DATA.lessons || []).filter((l) => !(l.title || '').trim()).length;
  if (noName) out.push({ text: `${noName} תפילות/שיעורים בלי שם`, act: (DATA.prayers || []).some((p) => !(p.name || '').trim()) ? 'prayers' : 'lessons', btn: 'לתקן' });
  const expired = (k) => (DATA[k] || []).filter((a) => a.dateMode !== 'hebrew' && a.to && a.to < iso).length;
  const ea = expired('announcements'); if (ea) out.push({ text: `${ea} הודעות שתוקפן עבר – אפשר למחוק`, act: 'announcements', btn: 'להודעות' });
  const es = expired('slides'); if (es) out.push({ text: `${es} תמונות שתוקפן עבר`, act: 'slides', btn: 'לתמונות' });
  return out;
}

/** השבוע הקרוב בלוח – מה מיוחד בכל יום */
function weekAhead(day) {
  const s = DATA.synagogue;
  const rows = [];
  let occ = [];
  try { occ = holidayOccurrences(day.civil, 8, s.il !== false); } catch {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(day.civil.getTime() + i * 86400000);
    let cd; try { cd = computeDay(d, s); } catch { continue; }
    const iso = d.toLocaleDateString('en-CA', { timeZone: s.tz || 'Asia/Jerusalem' });
    const chips = [];
    occ.filter((o) => o.date.toDateString() === d.toDateString()).forEach((o) => chips.push(['hol', o.label]));
    if (cd.tags?.includes('rosh-chodesh') && !chips.length) chips.push(['rc', 'ראש חודש']);
    if (d.getDay() === 6 && cd.shabbat?.parsha) chips.push(['sh', cd.shabbat.parshaIsChag ? cd.shabbat.parsha : `פרשת ${cd.shabbat.parsha}`]);
    if (d.getDay() === 6 && cd.shabbat?.mevarchim?.length) chips.push(['mo', 'שבת מברכים – מולד']);
    if (d.getDay() === 5 && cd.shabbat?.candles) chips.push(['cn', `הדלקת נרות ${fmtTime(cd.shabbat.candles, s.tz, 'floor')}`]);
    try {
      inHebrewRange(DATA.memorials || [], cd.hd, cd.hd, yahrzeitIn).forEach((m) => chips.push(['mem', `אזכרה: ${m.name}`]));
      inHebrewRange(DATA.birthdays || [], cd.hd, cd.hd, birthdayIn).forEach((m) => chips.push(['bd', `יום הולדת: ${m.name}`]));
    } catch {}
    (DATA.announcements || []).forEach((a) => {
      if (a.dateMode === 'hebrew') return;
      if (a.from === iso && iso !== isoToday()) chips.push(['an', `מתחילה: ${a.title || 'הודעה'}`]);
      if (a.to === iso) chips.push(['an', `יום אחרון: ${a.title || 'הודעה'}`]);
    });
    rows.push({ d, cd, chips, today: i === 0 });
  }
  return rows;
}

function renderHome() {
  freshPanel();
  const s = DATA.synagogue;
  let day, prayers = [], lessons = [];
  try {
    day = todayDay();
    const lctx = { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah };
    prayers = prayersForDay(day, DATA, s);
    lessons = lessonsForDay(DATA, s, day.civil, lctx);
  } catch (e) { console.warn(e); }
  const nowMin = (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();
  const anns = (DATA.announcements || []).filter((a) => { try { return annActive(a, isoToday(), todayDay().hd); } catch { return activeRange(a); } });
  const tz = s.tz;
  const sh = day?.shabbat || {};
  const zrow = (k, l) => { const v = day?.zmanim?.[k]; return v ? `<div class="pill"><small>${l}</small><b>${fmtTime(v, tz, k === 'sunrise' ? 'ceil' : 'nearest')}</b></div>` : ''; };
  const q = location.search;
  const att = day ? attention(day) : [];
  const week = day ? weekAhead(day) : [];
  const DN = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  const tiles = [
    ['announcements', 'הודעה חדשה', 'announcements', true], ['holidayPrayers', 'תפילת חג', 'holidayPrayers', true], ['dedications', 'לעילוי נשמת', 'dedications', true],
    ['slides', 'העלאת תמונה', 'upload', false], ['lessons', 'שיעור חדש', 'lessons', true], ['memorials', 'אזכרה חדשה', 'memorials', true],
  ];
  $('#panel').innerHTML = `
    ${MOTTO}
    <section class="card hero-today">
      <div><div class="sub">${esc(day ? day.weekday : '')}</div><div class="hd">${esc(day ? day.hebDate : '')}</div>
      <div class="sub">${esc(day?.gregDate || '')}${sh.parsha ? ` · פרשת ${esc(sh.parsha)}` : ''}${day?.events?.length ? ` · ${esc(day.events.join(' · '))}` : ''}</div></div>
      <div class="pills">
        ${zrow('sunrise', 'הנץ')}${zrow('sunset', 'שקיעה')}
        ${sh.candles ? `<div class="pill"><small>${esc(sh.candlesLabel || 'הדלקת נרות')}</small><b>${fmtTime(sh.candles, tz, 'floor')}</b></div>` : ''}
        ${sh.havdalah ? `<div class="pill"><small>צאת השבת</small><b>${fmtTime(sh.havdalah, tz, 'ceil')}</b></div>` : ''}
      </div>
      <label class="hero-search">${icon('search')}<input id="hsearch" type="search" placeholder="חפש תפילה, שיעור, הודעה, שם…" autocomplete="off"></label>
      <div class="gresults hero-results" id="hresults" hidden></div>
    </section>

    <div class="tiles">${tiles.map(([k, l, ic, isNew]) => `<button class="tile" data-go="${k}" ${isNew ? 'data-new' : ''}>${icon(ic)}<span>${l}</span></button>`).join('')}
</div>

    ${att.length ? `<section class="card attn"><h2>${icon('hilulot')}דורש תשומת לב <span class="tag">${att.length}</span></h2>
      <div class="attn-list">${att.map((a, i) => `<div class="attn-row"><span>${esc(a.text)}</span><button class="btn sm" data-attn="${i}">${esc(a.btn)}</button></div>`).join('')}</div></section>` : ''}

    <div class="dash home">
      <section class="card span2"><h2>${icon('calendar')}השבוע בלוח</h2>
        <div class="week">${week.map((w) => `<div class="wday${w.today ? ' today' : ''}${w.d.getDay() === 6 ? ' sat' : ''}">
          <div class="wd"><b>${w.today ? 'היום' : DN[w.d.getDay()]}</b><small>${esc(renderHeb(w.cd.hd))}</small></div>
          <div class="wchips">${w.chips.length ? w.chips.map(([t, l]) => `<span class="wc ${t}">${esc(l)}</span>`).join('') : '<span class="wnone">יום רגיל</span>'}</div></div>`).join('')}</div></section>

      <section class="card"><h2>${icon('prayers')}תפילות היום</h2>
        ${prayers.length ? `<div class="mini-rows">${prayers.map((p) => `<div class="mini-row ${p.min != null && p.min < nowMin ? 'past' : ''}"><span>${esc(p.name)}</span><b>${esc(p.time)}</b></div>`).join('')}</div>` : '<p class="note">אין תפילות מוגדרות להיום.</p>'}
        ${lessons.length ? `<div class="sub-h">שיעורים היום</div><div class="mini-rows">${lessons.map((l) => `<div class="mini-row"><span>${esc(l.title)}${l.teacher ? ` · ${esc(l.teacher)}` : ''}</span><b>${esc(l.timeStr)}</b></div>`).join('')}</div>` : ''}
        <button class="btn sm" data-go="prayers">עריכת תפילות</button></section>

      <section class="card span3"><h2>${icon('display')}כך נראה הלוח עכשיו <span class="tag">חי</span></h2>
        <div class="preview" id="pv"><iframe title="תצוגה מקדימה של הלוח" src="index.html${q ? q + '&' : '?'}preview" loading="lazy" tabindex="-1"></iframe></div>
        <div class="pv-foot"><span class="muted">מוצגים עכשיו: <b>${(DATA.display.screens || []).filter((x) => x.enabled).length}</b> שקופיות בסבב · <b>${anns.length}</b> הודעות · <b>${(DATA.slides || []).filter((x) => x.enabled !== false && activeRange(x)).length}</b> תמונות. שינויים מופיעים כאן אחרי שמירה.</span>
          <span class="pv-btns"><button class="btn sm" data-go="display">סדר השקופיות</button><a class="btn sm" href="index.html${esc(q)}" target="_blank" rel="noopener">מסך מלא ↗</a></span></div></section>
    </div>`;
  const pv = $('#pv');
  const fit = () => { const f = pv?.querySelector('iframe'); if (f) f.style.transform = `scale(${pv.clientWidth / 1920})`; };
  fit(); new ResizeObserver(fit).observe(pv);
  bindSearch($('#hsearch'), $('#hresults'));
  const go = (k, isNew, extra = {}) => {
    tab = k; renderNav();
    if (isNew && LISTS[tab]) { const it = { ...LISTS[tab].blank(), ...extra }; (DATA[LISTS[tab].data || tab] ||= []).push(it); openIds.add(it.id); setDirty(); renderList(tab, { focusId: it.id }); updateCounts(); }
    else renderPanel();
  };
  $('#panel').querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go, b.hasAttribute('data-new')));
  $('#panel').querySelectorAll('[data-attn]').forEach((b) => b.onclick = () => { const a = att[+b.dataset.attn]; go(a.act, !!a.newHoliday, a.newHoliday ? { holiday: a.newHoliday } : {}); });
}

// ---------- בית הכנסת ----------
function renderShul() {
  freshPanel();
  const s = DATA.synagogue;
  const f = (k, label, type = 'text', extra = '', hint = '') => `<label class="fld"><span>${label}</span><input data-s="${k}" type="${type}" value="${esc(s[k])}" ${extra}>${hint ? `<small class="muted">${hint}</small>` : ''}</label>`;
  const c = (k, label) => `<label class="fld check"><input data-s="${k}" type="checkbox" ${s[k] ? 'checked' : ''}><span>${label}</span></label>`;
  $('#panel').innerHTML = `
    ${head('בית הכנסת', 'הפרטים שמופיעים בראש הלוח, והמיקום שלפיו מחושבים כל הזמנים.')}
    <section class="card"><h2>${icon('shul')}פרטים</h2><div class="form-grid">
      ${f('name', 'שם בית הכנסת')}${f('dedication', 'שורת הקדשה (מתחת לשעון)', 'text', 'placeholder="לעילוי נשמת…"')}
      <label class="fld"><span>נוסח</span><select data-s="nusach">${[['sefard', 'ספרד'], ['ashkenaz', 'אשכנז'], ['edot', 'עדות המזרח'], ['chabad', 'חב"ד']].map(([k, l]) => `<option value="${k}" ${s.nusach === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div></section>
    <section class="card"><h2>${icon('home')}מיקום</h2><div class="form-grid">
      ${f('city', 'עיר')}${f('lat', 'קו רוחב', 'number', 'step="0.0001"')}${f('lon', 'קו אורך', 'number', 'step="0.0001"')}
      ${f('elevation', 'גובה (מטרים)', 'number')}${c('useElevation', 'חישוב הנץ והשקיעה לפי גובה')}${c('il', 'בארץ ישראל')}
      ${f('tz', 'אזור זמן')}
      <div class="fld" style="justify-content:end"><button type="button" class="btn" id="geo">קח מיקום מהמכשיר</button></div>
    </div><p class="note">כדאי ללחוץ "קח מיקום" כשאתה בתוך בית הכנסת. אפשר גם להעתיק קו רוחב ואורך מ-Google Maps.</p></section>
    <section class="card"><h2>${icon('memorials')}שבת</h2><div class="form-grid">
      ${f('candleMins', 'הדלקת נרות – דקות לפני השקיעה', 'number', '', 'חיפה 30, תל אביב 22, ירושלים 40 – לפי מנהג המקום')}
      ${f('havdalahMins', 'צאת שבת – דקות אחרי השקיעה', 'number', '', '0 = לפי צאת הכוכבים (8.5°). לר"ת למשל 72')}
    </div></section>
    <section class="card"><h2>זמני היום שיוצגו</h2><div class="form-grid">${ZMANIM.map((z) => `<label class="fld check" style="padding-top:0"><input type="checkbox" data-z="${z.key}" ${(s.zmanimShown || []).includes(z.key) ? 'checked' : ''}><span>${z.label}</span></label>`).join('')}</div></section>
    <section class="card"><h2>${icon('lessons')}לימוד יומי</h2><div class="form-grid">${[['dafYomi', 'דף יומי'], ['mishnaYomi', 'משנה יומית'], ['nachYomi', 'נ"ך יומי'], ['rambam1', 'רמב"ם יומי'], ['chofetzChaim', 'חפץ חיים'], ['psalms', 'תהלים']].map(([k, l]) => `<label class="fld check" style="padding-top:0"><input type="checkbox" data-l="${k}" ${s.learning?.[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></section>`;
  const p = $('#panel');
  const upd = (e) => {
    const el = e.target;
    if (el.dataset.s) { s[el.dataset.s] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; setDirty(); if (el.dataset.s === 'name') $('#shul-name').textContent = el.value || 'ניהול הלוח'; }
    if (el.dataset.z) { s.zmanimShown = ZMANIM.map((z) => z.key).filter((k) => p.querySelector(`[data-z="${k}"]`).checked); setDirty(); }
    if (el.dataset.l) { s.learning = { ...(s.learning || {}), [el.dataset.l]: el.checked }; setDirty(); }
  };
  p.addEventListener('input', upd); p.addEventListener('change', upd);
  $('#geo').onclick = () => {
    if (!navigator.geolocation) return flash('המכשיר לא מאפשר לקחת מיקום', true);
    navigator.geolocation.getCurrentPosition((pos) => {
      s.lat = +pos.coords.latitude.toFixed(5); s.lon = +pos.coords.longitude.toFixed(5);
      if (pos.coords.altitude) s.elevation = Math.round(pos.coords.altitude);
      setDirty(); renderShul(); flash('המיקום עודכן');
    }, () => flash('לא התקבל מיקום. אפשר להזין קו רוחב ואורך ידנית (מ-Google Maps).', true));
  };
}

// ---------- תצוגה ----------
function renderDisplay() {
  freshPanel();
  const d = DATA.display;
  const sel = (k, opts, val) => `<select data-d="${k}">${opts.map(([v, l]) => `<option value="${v}" ${val === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  $('#panel').innerHTML = `
    ${head('תצוגה ועיצוב', 'סדר המסכים, כמה זמן כל אחד מוצג, ועיצוב הלוח. מסך בלי תוכן (למשל אין אזכרות השבוע) מדולג אוטומטית.')}
    <section class="card"><h2>${icon('display')}עיצוב</h2><div class="form-grid">
      <label class="fld"><span>ערכת צבעים</span>${sel('theme', THEMES, d.theme)}<small class="muted"><a href="themes-preview.html${esc(location.search)}" target="_blank" rel="noopener">לראות את כל הערכות ↗</a> · <a href="holidays-preview.html${esc(location.search)}" target="_blank" rel="noopener">הלוח בחגים ↗</a></small></label>
      <label class="fld"><span>רקעים</span>${sel('scene', SCENE_CHOICES, d.scene || 'auto')}</label>
      <label class="fld check"><input data-d="holidayDesign" type="checkbox" ${d.holidayDesign !== false ? 'checked' : ''}><span>עיצוב מיוחד בחגים</span></label>
      <label class="fld full"><span>תמונת רקע משלך (כתובת, לא חובה)</span><input data-d="bgImage" value="${esc(d.bgImage)}" placeholder="https://…" dir="ltr"></label>
    </div><p class="note">ב"אוטומטי" כל שקופית מקבלת רקע משלה, ובחגים הלוח עובר לעיצוב ולצבעים של החג. <a href="gallery.html" target="_blank" rel="noopener">לגלריית הרקעים</a></p></section>
    <section class="card"><h2>${icon('prayers')}המסכים <span class="tag">${d.screens.filter((x) => x.enabled).length} פעילים</span></h2>
      <div class="screen-list">${d.screens.map((sc, i) => `
        <div class="screen-row ${sc.enabled ? '' : 'off'}" data-i="${i}">
          <span class="grip" title="גרור לשינוי הסדר" aria-label="גרור לשינוי הסדר">${icon('grip')}</span>
          <input type="checkbox" data-sc="enabled" ${sc.enabled ? 'checked' : ''} aria-label="הצג ${esc(SCREEN_LABEL[sc.type])}">
          <strong>${esc(SCREEN_LABEL[sc.type] || sc.type)}</strong>
          <label class="fld" style="flex-direction:row;align-items:center;gap:6px"><input type="number" min="4" data-sc="seconds" value="${esc(sc.seconds)}" aria-label="שניות"><span class="muted" style="font-weight:600">שנ׳</span></label>
          <span class="btns" style="display:flex;gap:4px"><button class="icon" data-act="up" aria-label="הזז למעלה">${icon('up')}</button><button class="icon" data-act="down" aria-label="הזז למטה">${icon('down')}</button></span>
        </div>`).join('')}</div>
      <p class="note">למסך שני עם תוכן אחר: הוסף לכתובת הלוח <code>?screens=memorials,announcements</code></p></section>
    ${(() => { const ns = d.screens.find((x) => x.type === 'netz') || { enabled: false, seconds: 14 }; return `
    <section class="card"><h2>שעון נץ וסוף זמן קריאת שמע</h2><div class="form-grid">
      <div class="fld span-all"><span>הפעלה ומשך ההצגה</span><div class="netz-state"><b>${ns.enabled ? `פעילה · ${esc(ns.seconds)} שניות` : 'כבויה'}</b><button type="button" class="btn sm" id="go-netz-row">שינוי ברשימת המסכים ↑</button></div></div>
      <label class="fld check"><input data-d="netzCountdown" type="checkbox" ${d.netzCountdown !== false ? 'checked' : ''}><span>ספירה לאחור לנץ החמה</span></label>
      <label class="fld"><span>להתחיל כמה דקות לפני הנץ</span><input data-d="netzWindowMin" type="number" min="5" value="${esc(d.netzWindowMin)}"></label>
      <label class="fld check"><input data-d="shmaCountdown" type="checkbox" ${d.shmaCountdown !== false ? 'checked' : ''}><span>ספירה לאחור לסוף זמן קריאת שמע</span></label>
      <label class="fld"><span>לפי איזה זמן</span>${sel('shmaZman', [['gra', 'גר"א'], ['mga', 'מגן אברהם'], ['both', 'שניהם – קודם מג"א ואחריו גר"א']], d.shmaZman || 'gra')}</label>
      <label class="fld"><span>מתי להתחיל</span>${sel('shmaWindowMin', [['0', 'מהנץ ועד סוף הזמן'], ['120', 'שעתיים לפני הסוף'], ['90', 'שעה וחצי לפני הסוף'], ['60', 'שעה לפני הסוף'], ['30', 'חצי שעה לפני הסוף']], String(d.shmaWindowMin || 0))}</label>
    </div><p class="note">השקופית מופיעה רק כשיש ספירה פעילה (לפני הנץ או עד סוף זמן קריאת שמע), ונעלמת לבד אחר כך.</p></section>`; })()}
    <section class="card"><h2>הגדרות נוספות</h2><div class="form-grid">
      <label class="fld"><span>זמן ברירת מחדל למסך (שניות)</span><input data-d="defaultSeconds" type="number" min="4" value="${esc(d.defaultSeconds)}"></label>
      <label class="fld"><span>ביצועים (לסטרימר)</span><select data-d="performance">${[['auto', 'אוטומטי – חסכוני במכשיר חלש'], ['lite', 'חסכוני תמיד (חלק יותר בסטרימר)'], ['full', 'מלא – כל האפקטים']].map(([k, l]) => `<option value="${k}" ${(d.performance || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="fld check"><input data-d="ticker" type="checkbox" ${d.ticker ? 'checked' : ''}><span>פס גולל בתחתית</span></label>
      <label class="fld check"><input data-o="enabled" type="checkbox" ${d.offHours.enabled ? 'checked' : ''}><span>כיבוי המסך בלילה</span></label>
      <label class="fld"><span>כיבוי מהשעה</span><input data-o="from" type="time" value="${esc(d.offHours.from)}"></label>
      <label class="fld"><span>עד השעה</span><input data-o="to" type="time" value="${esc(d.offHours.to)}"></label>
    </div></section>`;
  const p = $('#panel');
  const upd = (e) => {
    const el = e.target;
    const val = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value;
    if (el.dataset.d) d[el.dataset.d] = el.dataset.d === 'shmaWindowMin' ? +val : val;
    else if (el.dataset.o) d.offHours[el.dataset.o] = val;
    else if (el.dataset.sc) { const row = el.closest('.screen-row'); d.screens[+row.dataset.i][el.dataset.sc] = val; if (el.dataset.sc === 'enabled') row.classList.toggle('off', !val);
      if (d.screens[+row.dataset.i].type === 'netz') { const ns = d.screens[+row.dataset.i]; const t = p.querySelector('.netz-state b'); if (t) t.textContent = ns.enabled ? `פעילה · ${ns.seconds} שניות` : 'כבויה'; } }
    else return;
    setDirty();
  };
  p.addEventListener('change', upd); p.addEventListener('input', upd);
  makeSortable(p.querySelector('.screen-list'), '.screen-row', (order) => { reorder(d.screens, order); setDirty(); renderDisplay(); });
  p.querySelector('#go-netz-row')?.addEventListener('click', () => {
    const i = d.screens.findIndex((x) => x.type === 'netz'); const row = p.querySelector(`.screen-row[data-i="${i}"]`);
    if (!row) return; row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 2200);
  });
  p.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
    const i = +b.closest('.screen-row').dataset.i, j = b.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= d.screens.length) return;
    [d.screens[i], d.screens[j]] = [d.screens[j], d.screens[i]];
    setDirty(); renderDisplay();
  });
}

// ---------- גיבוי ----------
function renderBackup() {
  freshPanel();
  $('#panel').innerHTML = `
    ${head('גיבוי ושחזור', 'כדאי להוריד גיבוי אחרי כל עדכון גדול.')}
    <section class="card"><h2>${icon('backup')}קובץ גיבוי</h2><div class="quick">
      <a class="btn primary" id="dl" download="shul-board-${esc(boardId)}-${isoToday()}.json">${icon('backup')}הורד גיבוי</a>
      <label class="btn" for="imp">טען מקובץ…</label><input id="imp" type="file" accept="application/json" hidden>
    </div></section>
    <section class="card"><h2>מצב החיבור</h2><p class="note">${mode === 'supabase' ? `מחובר לענן (Supabase) · לוח: <b>${esc(boardId)}</b>. כל שמירה מגיעה ללוח בבית הכנסת תוך שניות.` : 'מצב מקומי: הנתונים נשמרים בדפדפן הזה בלבד.'}</p></section>
    <section class="card"><h2 style="color:var(--danger)">איפוס</h2><p class="note">מחליף את כל הנתונים בנתוני ההדגמה. אפשר לבטל עד שלוחצים "שמור".</p><div><button class="danger" id="reset">אפס לנתוני הדגמה</button></div></section>`;
  $('#dl').href = URL.createObjectURL(exportJson(DATA));
  $('#imp').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { DATA = normalize(JSON.parse(await file.text())); setDirty(); updateCounts(); flash('הקובץ נטען. לחץ "שמור" כדי להחיל.'); }
    catch { flash('הקובץ לא תקין', true); }
  };
  $('#reset').onclick = (e) => {
    const b = e.currentTarget;
    if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.textContent = 'בטוח? כל הנתונים יוחלפו. לחץ שוב'; return; }
    DATA = normalize(demoData()); setDirty(); updateCounts(); flash('נטענו נתוני הדגמה. לחץ "שמור" כדי להחיל, או "בטל שינויים".'); renderBackup();
  };
}

// ---------- ניווט ----------
function countOf(k) { const d = LISTS[k]; const a = DATA?.[d?.data || k]; return Array.isArray(a) ? (d?.filter ? a.filter(d.filter).length : a.length) : null; }
function renderNav() {
  const nav = $('#tabs');
  nav.hidden = false;
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'אזורי ניהול');
  nav.innerHTML = `<label class="nav-search">${icon('search')}<input id="gsearch" type="search" placeholder="חיפוש בכל הלוח…" autocomplete="off"></label><div class="gresults" id="gresults" hidden></div>` + NAV.map(([g, items]) => `${g ? `<div class="group">${g}</div>` : ''}${items.map(([k, l]) => {
    const n = LISTS[k] ? countOf(k) : null;
    return `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${icon(k)}<span>${l}</span>${n ? `<span class="count" data-count="${k}">${n}</span>` : ''}</button>`;
  }).join('')}`).join('');
  nav.querySelectorAll('button[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; renderNav(); renderPanel(); b.scrollIntoView({ inline: 'center', block: 'nearest' }); });
  bindSearch($('#gsearch'), $('#gresults'));
  try { history.replaceState(null, '', `#${tab}`); } catch {}
}
function updateCounts() { renderNav(); }
function renderPanel() {
  if (tab === 'home') renderHome();
  else if (LISTS[tab]) renderList(tab);
  else if (tab === 'shul') renderShul();
  else if (tab === 'display') renderDisplay();
  else renderBackup();
}

async function doSave() {
  // יציאה מהשדה הפעיל כדי שהערך האחרון ייקלט לפני השמירה
  const act = document.activeElement;
  if (act && act.matches?.('input,textarea,select')) { act.dispatchEvent(new Event('change', { bubbles: true })); act.blur(); await new Promise((r) => setTimeout(r, 0)); }
  $('#btn-save2').disabled = true; $('#status').textContent = 'שומר…';
  try {
    await save(DATA); SAVED = structuredClone(DATA); setDirty(false);
    setTimeout(checkVersion, 1500);
    const still = new Set((DATA.slides || []).map((x) => x.path)); const del = pendingDeletes.filter((p) => !still.has(p)); pendingDeletes = [];
    deleteMedia(del).catch(() => {}); flash('נשמר ✓ הלוח יתעדכן תוך כמה שניות');
    const f = $('#pv iframe'); if (f) setTimeout(() => f.contentWindow?.location.reload(), 1500);
  } catch (e) { setDirty(true); flash('השמירה נכשלה: ' + e.message, true); }
  finally { $('#btn-save2').disabled = false; }
}

/** מסך הכניסה: שם בית הכנסת, שעה ותאריך עבריים חיים וכמה זמני היום */
async function loginScene() {
  let syn = null;
  try { syn = normalize((await load()).data).synagogue; } catch { /* בלי חיבור – רק שעה */ }
  if (syn?.name) $('#lg-shul').textContent = `בית הכנסת "${syn.name.replace(/^בית הכנסת\s*/, '').replace(/^"|"$/g, '')}"`;
  const tick = () => {
    const now = new Date();
    $('#lg-clock').textContent = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: syn?.tz || 'Asia/Jerusalem' });
    if (!syn) return;
    try {
      const d = computeDay(now, syn);
      $('#lg-date').textContent = `${d.afterSunset ? 'ליל ' : ''}${['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'][d.afterSunset ? (d.dow + 1) % 7 : d.dow]} · ${d.afterSunset ? d.next.hebDate : d.hebDate}`;
      const z = d.zmanim, f = (k, r) => (z[k] ? fmtTime(z[k], syn.tz, r) : null);
      const chips = [['הנץ', f('sunrise', 'ceil')], ['סוף ק"ש', f('shmaGRA', 'floor')], ['שקיעה', f('sunset', 'floor')], ['צאת הכוכבים', f('tzeit', 'ceil')]].filter((x) => x[1]);
      $('#lg-chips').innerHTML = chips.map(([l, t]) => `<span>${l}<b>${t}</b></span>`).join('');
      const sh = d.shabbat;
      if (sh?.parsha) {
        $('#lg-shabbat').hidden = false;
        $('#lg-shabbat').innerHTML = `<div class="p"><small>${d.dow === 6 && !d.afterSunset ? 'השבת' : 'השבת הקרובה'}</small>${sh.parshaIsChag ? esc(sh.parsha) : 'פרשת ' + esc(sh.parsha)}</div>`
          + (sh.candles ? `<div class="t"><small>הדלקת נרות</small><b>${fmtTime(sh.candles, syn.tz, 'floor')}</b></div>` : '')
          + (sh.havdalah ? `<div class="t"><small>צאת השבת</small><b>${fmtTime(sh.havdalah, syn.tz, 'ceil')}</b></div>` : '');
      }
    } catch { /* */ }
  };
  tick();
  clearInterval(loginScene.t); loginScene.t = setInterval(() => { if ($('#login').hidden) clearInterval(loginScene.t); else tick(); }, 15000);
  $('#lg-eye').onclick = () => { const p = $('#password'); p.type = p.type === 'password' ? 'text' : 'password'; };
}

async function enter() {
  const user = await currentUser();
  if (mode === 'supabase' && !user) {
    $('#login').hidden = false; $('#tabs').hidden = true; $('#panel').hidden = true;
    $('#who').textContent = '';
    loginScene();
    return;
  }
  $('#login').hidden = true; $('#panel').hidden = false;
  $('#who').innerHTML = mode === 'supabase' ? `${esc(user.email)} · <a href="#" id="out">התנתק</a>` : 'מצב מקומי – הנתונים נשמרים בדפדפן הזה';
  $('#out')?.addEventListener('click', async (e) => { e.preventDefault(); await signOut(); location.reload(); });
  const r = await load();
  DATA = r.data; SAVED = structuredClone(DATA);
  $('#shul-name').textContent = DATA.synagogue.name || 'ניהול הלוח';
  const h = location.hash.slice(1);
  if (h && (LISTS[h] || ['home', 'shul', 'display', 'backup'].includes(h))) tab = h;
  if (r.source === 'missing') flash('הלוח עוד לא קיים בשרת. נטענו נתוני הדגמה – ערוך ולחץ "שמור" כדי ליצור אותו.');
  let restore = null;
  try { restore = JSON.parse(sessionStorage.getItem('admin:restore')); sessionStorage.removeItem('admin:restore'); } catch {}
  if (restore && Date.now() - restore.t < 60000) { tab = restore.tab || tab; (restore.open || []).forEach((id) => openIds.add(id)); }
  renderNav(); renderPanel(); setDirty(r.source === 'missing');
  if (restore && Date.now() - restore.t < 60000) { renderedTab = tab; requestAnimationFrame(() => scrollTo({ top: restore.y, behavior: 'instant' })); }
}

$('#btn-save2').onclick = doSave;
$('#btn-undo').onclick = () => { pendingDeletes = []; DATA = structuredClone(SAVED); setDirty(false); renderNav(); renderPanel(); flash('השינויים בוטלו'); };
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  try { await signIn($('#email').value, $('#password').value); enter(); }
  catch (err) { flash(err.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : err.message, true); }
};
$('#btn-signup').onclick = async () => {
  try { await signUp($('#email').value, $('#password').value); flash('נרשמת. אם נשלח אליך מייל אימות – אשר אותו ואז היכנס.'); }
  catch (err) { flash(err.message, true); }
};
const q = location.search;
$('#lnk-board').href = (window.SHUL_CONFIG?.boardPage || 'index.html') + q;
$('#lnk-mobile').href = 'm.html' + q;
$('#lnk-print').href = 'print.html' + q;
window.__adminReady = true;
enter().catch((e) => flash('שגיאה: ' + e.message, true));

// גרסה חדשה של הממשק: בדיקה כשחוזרים לדף (ובכל 10 דקות). מרענן לבד רק אם אין שינויים שלא נשמרו.
let myVersion = null;
const getVersion = () => fetch('version.txt', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : null)).then((t) => t?.trim() || null).catch(() => null);
getVersion().then((v) => { myVersion = v; });
async function checkVersion() {
  const v = await getVersion();
  if (!v || !myVersion || v === myVersion) return;
  if (!dirty) {
    // שומרים איפה היית (לשונית, פריטים פתוחים, גלילה) – כדי שהרענון לא יקפיץ לראש הדף
    try { sessionStorage.setItem('admin:restore', JSON.stringify({ tab, open: [...openIds], y: scrollY, t: Date.now() })); } catch {}
    location.reload();
  } else flash('יש גרסה חדשה של הממשק – שמור, והדף יתרענן');
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
setInterval(checkVersion, 10 * 60 * 1000);
