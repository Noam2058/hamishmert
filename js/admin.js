// ממשק הגבאי: עריכת כל הנתונים של הלוח.
import { load, save, mode, currentUser, signIn, signUp, signOut, exportJson, boardId, uploadMedia, deleteMedia } from './store.js';
import { demoData, normalize, SCREEN_LABEL, THEMES, uid } from './defaults.js';
import { SCHEDULES, ZMAN_BASES, resolveTime, describeTime, prayersForDay, lessonsForDay } from './prayers.js';
import { ZMANIM, HEB_MONTHS, computeDay, minToHhmm, fmtTime, yahrzeitIn, birthdayIn, inHebrewRange, renderHeb } from './jewish.js';
import { refForDate, heNum, DEFAULT_START } from './halacha-sa.js';
import { SCENE_CHOICES } from './scenes.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let DATA = null;
let SAVED = null;      // עותק של מה ששמור בשרת – ל"בטל שינויים"
let dirty = false;
let tab = 'home';
const openIds = new Set(); // פריטים פתוחים ברשימות (נשמר בין רינדורים)
const filters = {};
let pendingDeletes = []; // קבצים שיימחקו מהאחסון אחרי שמירה

// ---------- אייקונים ----------
const I = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  prayers: '<path d="M12 3v4M8 5l4-2 4 2"/><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 12h6M9 16h6"/>',
  lessons: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5M8 7h7"/>',
  announcements: '<path d="M4 10v4a1 1 0 001 1h2l5 4V5L7 9H5a1 1 0 00-1 1z"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"/>',
  memorials: '<path d="M12 3c2 3 2 4.5 0 6.5C10 7.5 10 6 12 3z"/><rect x="9" y="10" width="6" height="11" rx="1.5"/>',
  parnasim: '<path d="M12 21s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.6-7 10-7 10z"/>',
  birthdays: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M4 15c2 1.5 4 1.5 5.3 0 1.4 1.5 4 1.5 5.4 0 1.3 1.5 3.3 1.5 5.3 0M12 11V7"/><path d="M12 3.5c.9 1 .9 2 0 3-.9-1-.9-2 0-3z"/>',
  hilulot: '<path d="M12 2.5l2.4 5 5.6.7-4.1 3.8 1.1 5.5L12 14.8 7 17.5l1.1-5.5L4 8.2l5.6-.7z"/>',
  halachot: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3M9 11h6M9 15h6"/>',
  shul: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M12 8.5l1 1.7h2l-1 1.7 1 1.7h-2l-1 1.7-1-1.7H9l1-1.7-1-1.7h2z"/>',
  display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  backup: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
  slides: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
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
  $('#btn-save').disabled = !v;
  $('#btn-save').textContent = v ? 'שמור' : 'נשמר ✓';
  $('#savebar').hidden = !v;
  const st = $('#status'); st.hidden = !v; st.textContent = 'לא נשמר'; st.classList.toggle('dirty', v);
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
function timeOf(item) {
  if (!item.time) return '';
  if (item.time.type !== 'zman') return item.time.value || '';
  try { const day = todayDay(); const m = resolveTime(item.time, day.civil, DATA.synagogue, { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah }); return m == null ? '' : minToHhmm(m); } catch { return ''; }
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
const reorder = (arr, order) => { const copy = order.map((i) => arr[i]); arr.splice(0, arr.length, ...copy); };

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
    fields: [['name', 'שם התפילה', 'text'], ['schedule', 'לוח', 'select', SCHEDULES], ['weekdays', 'רק בימים (ריק = כל הימים)', 'weekdays'], ['note', 'הערה (מוצגת מתחת לשם)', 'text'], ['time', 'שעה', 'time']],
    sum: (it) => ({ title: it.name, meta: [it.time?.type === 'zman' ? describeTime(it.time) : 'שעה קבועה', daysText(it.weekdays), it.note].filter(Boolean).join(' · '), time: timeOf(it) }),
    calc: true,
  },
  lessons: {
    label: 'שיעורים', single: 'שיעור',
    help: 'שיעורים קבועים. מופיעים במסך המשולב ביום שלהם ובפס הגולל.',
    blank: () => ({ id: uid(), title: '', teacher: '', weekdays: [0, 1, 2, 3, 4], time: { type: 'fixed', value: '20:00' } }),
    fields: [['title', 'שם השיעור', 'text'], ['teacher', 'מעביר השיעור', 'text'], ['weekdays', 'ימים', 'weekdays'], ['note', 'הערה', 'text'], ['time', 'שעה', 'time']],
    sum: (it) => ({ title: it.title, meta: [it.teacher, daysText(it.weekdays) || 'כל יום'].filter(Boolean).join(' · '), time: timeOf(it) }),
    calc: true,
  },
  announcements: {
    label: 'הודעות', single: 'הודעה',
    help: 'בלי תאריכים – ההודעה מוצגת תמיד. שורה חדשה בטקסט = שורה חדשה בלוח.',
    blank: () => ({ id: uid(), style: 'general', title: '', body: '', from: '', to: '' }),
    fields: [['title', 'כותרת', 'text'], ['style', 'סגנון', 'select', [['general', 'רגיל'], ['simcha', 'שמחה'], ['memorial', 'אבל / אזכרה'], ['urgent', 'חשוב']]], ['from', 'מתאריך', 'date'], ['to', 'עד תאריך', 'date'], ['body', 'תוכן ההודעה', 'textarea']],
    sum: (it) => ({ title: it.title || (it.body || '').split('\n')[0], meta: it.from || it.to ? `${fmtDate(it.from) || '…'} – ${fmtDate(it.to) || '…'}` : 'מוצגת תמיד', badge: activeRange(it) ? ['on', 'מוצגת'] : ['off', 'לא בתוקף'] }),
  },
  memorials: {
    label: 'אזכרות', single: 'אזכרה', search: true,
    help: 'אפשר להזין תאריך פטירה לועזי (ולסמן אם אחרי השקיעה), או יום וחודש עבריים. הלוח מחשב את יום האזכרה בכל שנה.',
    blank: () => ({ id: uid(), name: '', date: '', afterSunset: false, hebDay: '', hebMonth: '', by: '' }),
    fields: [['name', 'שם (פלוני בן פלונית)', 'text'], ['by', 'הונצח ע"י', 'text'], ['date', 'תאריך פטירה לועזי', 'date'], ['afterSunset', 'נפטר אחרי השקיעה', 'check'], ['hebDay', 'או: יום עברי', 'number'], ['hebMonth', 'חודש עברי', 'select', MONTH_OPTS]],
    sum: (it) => { const d = hebDateOf(it, yahrzeitIn); return { title: it.name, meta: [d ? `האזכרה הקרובה: ${d}` : 'חסר תאריך', it.by].filter(Boolean).join(' · ') }; },
  },
  parnasim: {
    label: 'פרנסים', single: 'פרנס',
    help: 'פרנס היום / השבוע / החודש / השנה. אפשר להגביל לתאריכים.',
    blank: () => ({ id: uid(), period: 'week', title: 'פרנס השבוע', name: '', text: '', from: '', to: '' }),
    fields: [['title', 'כותרת', 'text'], ['period', 'סוג', 'select', [['day', 'יום'], ['week', 'שבוע'], ['month', 'חודש'], ['year', 'שנה']]], ['name', 'שם', 'text'], ['text', 'הקדשה', 'text'], ['from', 'מתאריך', 'date'], ['to', 'עד תאריך', 'date']],
    sum: (it) => ({ title: it.name ? `${it.title || 'פרנס'}: ${it.name}` : it.title, meta: [it.text, it.from || it.to ? `${fmtDate(it.from) || '…'} – ${fmtDate(it.to) || '…'}` : ''].filter(Boolean).join(' · '), badge: activeRange(it) ? ['on', 'פעיל'] : ['off', 'לא בתוקף'] }),
  },
  birthdays: {
    label: 'ימי הולדת', single: 'יום הולדת', search: true,
    help: 'מוצגים בשבוע של יום ההולדת העברי.',
    blank: () => ({ id: uid(), name: '', date: '', afterSunset: false, hebDay: '', hebMonth: '' }),
    fields: [['name', 'שם', 'text'], ['note', 'הערה', 'text'], ['date', 'תאריך לידה לועזי', 'date'], ['afterSunset', 'נולד אחרי השקיעה', 'check'], ['hebDay', 'או: יום עברי', 'number'], ['hebMonth', 'חודש עברי', 'select', MONTH_OPTS]],
    sum: (it) => { const d = hebDateOf(it, birthdayIn); return { title: it.name, meta: d ? `יום ההולדת הקרוב: ${d}` : 'חסר תאריך' }; },
  },
  hilulot: {
    label: 'הילולות', single: 'הילולא', search: true,
    help: 'יום פטירת צדיקים. מוצגים בשבוע שבו הם חלים.',
    blank: () => ({ id: uid(), name: '', hebDay: 1, hebMonth: 'Tishrei' }),
    fields: [['name', 'שם הצדיק', 'text'], ['note', 'הערה', 'text'], ['hebDay', 'יום בחודש', 'number'], ['hebMonth', 'חודש', 'select', HEB_MONTHS]],
    sum: (it) => ({ title: it.name, meta: `${it.hebDay ? heNum(+it.hebDay) : ''} ${MONTH_HE[it.hebMonth] || ''}`.trim() }),
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

const NAV = [
  ['', [['home', 'סקירה']]],
  ['זמנים ותוכן', [['prayers', 'תפילות'], ['lessons', 'שיעורים'], ['announcements', 'הודעות'], ['slides', 'תמונות שלי'], ['halachot', 'הלכה יומית']]],
  ['אנשים ומועדים', [['memorials', 'אזכרות'], ['parnasim', 'פרנסים'], ['birthdays', 'ימי הולדת'], ['hilulot', 'הילולות']]],
  ['הגדרות', [['shul', 'בית הכנסת'], ['display', 'תצוגה ועיצוב'], ['backup', 'גיבוי']]],
];

// ---------- רכיבי טופס ----------
function fieldHtml(item, [key, label, type, opts], path) {
  const id = `${path}-${key}`;
  const v = item[key];
  let input = '';
  if (type === 'text') input = `<input id="${id}" data-k="${key}" value="${esc(v)}">`;
  else if (type === 'number') input = `<input id="${id}" data-k="${key}" type="number" inputmode="numeric" value="${esc(v)}">`;
  else if (type === 'date') input = `<input id="${id}" data-k="${key}" type="date" value="${esc(v)}">`;
  else if (type === 'textarea') input = `<textarea id="${id}" data-k="${key}">${esc(v)}</textarea>`;
  else if (type === 'check') return `<label class="fld check"><input id="${id}" data-k="${key}" type="checkbox" ${v ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  else if (type === 'select') input = `<select id="${id}" data-k="${key}">${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
  else if (type === 'fit') input = `<div class="fitpick" data-k="${key}" data-type="fit" role="radiogroup">${FITS.map(([val, lab, sub, svg]) => `<label class="fitopt"><input type="radio" name="${id}" value="${val}" ${(v || 'contain') === val ? 'checked' : ''}>${svg}<b>${lab}</b><small>${sub}</small></label>`).join('')}</div>`;
  else if (type === 'weekdays') input = `<div class="days" data-k="${key}" data-type="weekdays">${WEEKDAY_OPTS.map((d, i) => `<label><input type="checkbox" value="${i}" ${(v || []).includes(i) ? 'checked' : ''}>${d}׳</label>`).join('')}</div>`;
  else if (type === 'time') {
    const t = v || { type: 'fixed', value: '07:00' };
    input = `<div class="timebox" data-k="${key}" data-type="time">
      <select data-t="type" aria-label="סוג השעה"><option value="fixed" ${t.type !== 'zman' ? 'selected' : ''}>שעה קבועה</option><option value="zman" ${t.type === 'zman' ? 'selected' : ''}>יחסית לזמן היום</option></select>
      ${t.type !== 'zman' ? `<input data-t="value" type="time" value="${esc(t.value || '')}" aria-label="שעה">` : `
      <select data-t="zman" aria-label="הזמן">${ZMAN_BASES.map(([k, l]) => `<option value="${k}" ${t.zman === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input data-t="offset" type="number" step="1" value="${esc(t.offset ?? 0)}" title="דקות: מינוס = לפני, פלוס = אחרי" aria-label="הפרש בדקות (מינוס = לפני)" placeholder="דקות (מינוס = לפני)">
      <select data-t="round" aria-label="עיגול">${[[0, 'בלי עיגול'], [5, 'עיגול ל-5 דק׳'], [10, 'עיגול ל-10 דק׳'], [15, 'עיגול לרבע שעה']].map(([n, l]) => `<option value="${n}" ${+(t.round || 0) === n ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select data-t="dir" aria-label="כיוון העיגול">${[['down', 'כלפי מטה'], ['up', 'כלפי מעלה'], ['nearest', 'לקרוב']].map(([k, l]) => `<option value="${k}" ${(t.dir || 'down') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select data-t="basis" aria-label="בסיס החישוב">${[['day', 'לפי כל יום'], ['week-min', 'קבוע לשבוע (מוקדם)'], ['week-max', 'קבוע לשבוע (מאוחר)']].map(([k, l]) => `<option value="${k}" ${(t.basis || 'day') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`}
    </div>`;
  }
  const full = type === 'textarea' || type === 'time' || type === 'weekdays' || type === 'fit' ? ' full' : '';
  return `<div class="fld${full}"><span>${esc(label)}</span>${input}</div>`;
}

function readField(el) {
  const type = el.dataset.type;
  if (type === 'weekdays') return [...el.querySelectorAll('input:checked')].map((i) => +i.value);
  if (type === 'fit') return el.querySelector('input:checked')?.value || 'contain';
  if (type === 'time') {
    const g = (k) => el.querySelector(`[data-t="${k}"]`)?.value;
    if (g('type') !== 'zman') return { type: 'fixed', value: g('value') || '00:00' };
    return { type: 'zman', zman: g('zman') || 'sunset', offset: +(g('offset') || 0), round: +(g('round') || 0), dir: g('dir') || 'down', basis: g('basis') || 'day' };
  }
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') return el.value === '' ? '' : +el.value;
  return el.value;
}

let renderedTab = null;
function freshPanel() {
  const old = document.getElementById('panel');
  const n = old.cloneNode(false);
  old.replaceWith(n);
  // באותה לשונית (הזזה, מחיקה, שינוי) – נשארים באותו מקום בדף; רק במעבר לשונית עולים לראש
  if (renderedTab === tab) { const y = scrollY; n.style.minHeight = `${old.offsetHeight}px`; requestAnimationFrame(() => { scrollTo({ top: y }); n.style.minHeight = ''; }); }
  else scrollTo({ top: 0 });
  renderedTab = tab;
  return n;
}
const head = (h, p, btns = '') => `<div class="page-head"><div><h1>${h}</h1>${p ? `<p>${p}</p>` : ''}</div>${btns ? `<div class="head-btns">${btns}</div>` : ''}</div>`;

function calcText(item) {
  if (item.time?.type !== 'zman') return '';
  const t = timeOf(item);
  return `${describeTime(item.time)} · היום: ${t || '—'}`;
}

// ---------- רשימות ----------
function summaryHtml(def, it) {
  const s = def.sum ? def.sum(it) : { title: it.name || it.title };
  return `${s.thumb ? `<img class="thumb" src="${esc(s.thumb)}" alt="" loading="lazy">` : ''}<span class="sum-main"><div class="sum-title${s.title ? '' : ' empty'}">${esc(s.title || `${def.single} חדשה – לחץ לעריכה`)}</div>${s.meta ? `<div class="sum-meta">${esc(s.meta)}</div>` : ''}</span>
    ${s.badge ? `<span class="badge ${s.badge[0]}">${esc(s.badge[1])}</span>` : ''}${s.time ? `<span class="sum-time">${esc(s.time)}</span>` : ''}<span class="chev">${icon('chev')}</span>`;
}

function renderList(key, focusNew = false) {
  freshPanel();
  const def = LISTS[key];
  const arr = DATA[key];
  const f = (filters[key] || '').trim();
  const visible = arr.map((it, i) => [it, i]).filter(([it]) => !f || JSON.stringify(it).includes(f));
  const itemHtml = ([it, i]) => `
    <details class="item" data-i="${i}" ${openIds.has(it.id) ? 'open' : ''}>
      <summary><span class="grip" title="גרור לשינוי הסדר" aria-label="גרור לשינוי הסדר">${icon('grip')}</span>${summaryHtml(def, it)}</summary>
      <div class="item-body">
        ${key === 'slides' ? `<div class="pv-wrap"><div class="preview slide-pv"></div><small class="muted">כך זה ייראה בלוח. הבחירות למטה מתעדכנות כאן מיד – וכשמרוצים, לוחצים "שמור".</small></div>` : ''}
        <div class="form-grid">${def.fields.map((fd) => fieldHtml(it, fd, `${key}-${i}`)).join('')}</div>
        <div class="item-tools"><span class="calc">${def.calc ? esc(calcText(it)) : ''}</span>
          <span class="btns"><button class="icon" data-act="up" title="הזז למעלה" aria-label="הזז למעלה">${icon('up')}</button><button class="icon" data-act="down" title="הזז למטה" aria-label="הזז למטה">${icon('down')}</button><button class="icon" data-act="dup" title="שכפל" aria-label="שכפל">${icon('copy')}</button><button class="sm danger" data-act="del">${icon('trash')}<span>מחק</span></button></span></div>
      </div>
    </details>`;
  let listHtml;
  if (!arr.length) listHtml = def.noAdd ? '' : `<div class="empty-state">${icon(key)}<div>עוד אין ${def.label}.</div><button class="btn primary" data-add>${icon('plus')}הוסף ${def.single}</button></div>`;
  else if (!visible.length) listHtml = `<div class="empty-state">לא נמצא "${esc(f)}"</div>`;
  else if (def.group) {
    const groups = new Map(SCHEDULES.map(([k]) => [k, []]));
    visible.forEach((x) => { const g = x[0][def.group] || 'weekday'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); });
    listHtml = [...groups].filter(([, xs]) => xs.length).map(([g, xs]) => `<div class="group-title">${esc(SCHED_HE[g] || g)}</div>${xs.map(itemHtml).join('')}`).join('');
  } else listHtml = visible.map(itemHtml).join('');

  $('#panel').innerHTML = `
    ${head(def.label, esc(def.help), def.noAdd ? '' : `<button class="btn primary" data-add>${icon('plus')}הוסף ${def.single}</button>`)}
    ${def.head ? def.head() : ''}
    ${def.search && arr.length > 5 ? `<label class="search">${icon('search')}<input id="flt" type="search" placeholder="חיפוש…" value="${esc(f)}"></label>` : ''}
    <div class="list">${listHtml}</div>`;

  const p = $('#panel');
  p.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
    const it = def.blank(); arr.push(it); openIds.add(it.id); filters[key] = ''; setDirty(); renderList(key, true); updateCounts();
  });
  def.bindHead?.(() => renderList(key));
  const flt = $('#flt');
  if (flt) flt.oninput = () => { filters[key] = flt.value; clearTimeout(flt.t); flt.t = setTimeout(() => { renderList(key); const n = $('#flt'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };

  p.querySelectorAll('.item').forEach((row) => {
    const i = +row.dataset.i;
    row.addEventListener('toggle', () => { if (row.open) { openIds.add(arr[i].id); if (key === 'slides') mountSlidePreview(row, arr[i]); } else openIds.delete(arr[i].id); });
    if (key === 'slides' && row.open) mountSlidePreview(row, arr[i]);
    const commit = (e) => {
      const el = e.target.closest('[data-k]');
      if (!el) return;
      arr[i][el.dataset.k] = readField(el);
      setDirty();
      if (el.dataset.type === 'time' && e.target.dataset.t === 'type') return renderList(key);
      if (def.group && el.dataset.k === def.group) return renderList(key);
      if (def.calc) row.querySelector('.calc').textContent = calcText(arr[i]);
      if (key === 'slides') { clearTimeout(row.pvT); row.pvT = setTimeout(() => mountSlidePreview(row, arr[i]), 350); }
      const sm = row.querySelector('summary'); [...sm.children].slice(1).forEach((n) => n.remove()); sm.insertAdjacentHTML('beforeend', summaryHtml(def, arr[i]));
    };
    row.addEventListener('change', commit);
    row.addEventListener('input', (e) => { if (e.target.matches('input[type=text],input:not([type]),textarea')) commit(e); });
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
      const same = (j) => !def.group || (arr[j][def.group] || 'weekday') === (arr[i][def.group] || 'weekday');
      let j = i;
      do { j += act === 'up' ? -1 : 1; } while (j >= 0 && j < arr.length && !same(j));
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      setDirty(); renderList(key);
    });
  });
  if (!f) makeSortable(p.querySelector('.list'), '.item', (order) => { reorder(arr, order); setDirty(); renderList(key); },
    (a, b) => !def.group || (arr[+a.dataset.i][def.group] || 'weekday') === (arr[+b.dataset.i][def.group] || 'weekday'));
  if (focusNew) { const last = [...p.querySelectorAll('.item[open]')].pop(); last?.scrollIntoView({ block: 'center', behavior: 'smooth' }); last?.querySelector('input,textarea')?.focus({ preventScroll: true }); }
}

// ---------- סקירה ----------
function renderHome() {
  freshPanel();
  const s = DATA.synagogue;
  let day, prayers = [], lessons = [], mem = [], bdays = [], hil = [];
  try {
    day = todayDay();
    const lctx = { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah };
    prayers = prayersForDay(day, DATA, s);
    lessons = lessonsForDay(DATA, s, day.civil, lctx);
    mem = inHebrewRange(DATA.memorials || [], day.hd, day.hd.add(7), yahrzeitIn);
    bdays = inHebrewRange(DATA.birthdays || [], day.hd, day.hd.add(7), birthdayIn);
    hil = inHebrewRange(DATA.hilulot || [], day.hd, day.hd.add(7), yahrzeitIn);
  } catch (e) { console.warn(e); }
  const nowMin = (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();
  const anns = (DATA.announcements || []).filter(activeRange);
  const r = refForDate(isoToday(), DATA.halachaStart || DEFAULT_START);
  const tz = s.tz;
  const sh = day?.shabbat || {};
  const zrow = (k, l) => { const v = day?.zmanim?.[k]; return v ? `<div class="pill"><small>${l}</small><b>${fmtTime(v, tz, k === 'sunrise' ? 'ceil' : 'nearest')}</b></div>` : ''; };
  const q = location.search;
  $('#panel').innerHTML = `
    ${head('סקירה', '', `<button class="btn" data-go="announcements" data-new>${icon('plus')}הודעה</button><button class="btn" data-go="memorials" data-new>${icon('plus')}אזכרה</button><button class="btn" data-go="lessons" data-new>${icon('plus')}שיעור</button>`)}
    <section class="card hero-today">
      <div><div class="sub">${esc(day ? day.weekday : '')}</div><div class="hd">${esc(day ? day.hebDate : '')}</div>
      <div class="sub">${esc(day?.gregDate || '')}${sh.parsha ? ` · פרשת ${esc(sh.parsha)}` : ''}${day?.events?.length ? ` · ${esc(day.events.join(' · '))}` : ''}</div></div>
      <div class="pills">
        ${zrow('sunrise', 'הנץ')}${zrow('sunset', 'שקיעה')}
        ${sh.candles ? `<div class="pill"><small>${esc(sh.candlesLabel || 'הדלקת נרות')}</small><b>${fmtTime(sh.candles, tz, 'floor')}</b></div>` : ''}
        ${sh.havdalah ? `<div class="pill"><small>צאת השבת</small><b>${fmtTime(sh.havdalah, tz, 'ceil')}</b></div>` : ''}
      </div>
    </section>
    <div class="dash">
      <section class="card"><h2>${icon('prayers')}תפילות היום</h2>
        ${prayers.length ? `<div class="mini-rows">${prayers.map((p) => `<div class="mini-row ${p.min != null && p.min < nowMin ? 'past' : ''}"><span>${esc(p.name)}</span><b>${esc(p.time)}</b></div>`).join('')}</div>` : '<p class="note">אין תפילות מוגדרות להיום.</p>'}
        ${lessons.length ? `<div class="mini-rows">${lessons.map((l) => `<div class="mini-row"><span>${esc(l.title)}${l.teacher ? ` · ${esc(l.teacher)}` : ''}</span><b>${esc(l.timeStr)}</b></div>`).join('')}</div>` : ''}
        <button class="btn sm" data-go="prayers">עריכת תפילות</button></section>
      <section class="card span2"><h2>${icon('display')}כך נראה הלוח עכשיו <span class="tag">חי</span></h2>
        <div class="preview" id="pv"><iframe title="תצוגה מקדימה של הלוח" src="index.html${q ? q + '&' : '?'}preview" loading="lazy" tabindex="-1"></iframe></div>
        <p class="note">שינויים מופיעים כאן אחרי שמירה. <a href="index.html${esc(q)}" target="_blank" rel="noopener">פתח במסך מלא</a></p></section>
      <section class="card"><h2>${icon('memorials')}השבוע</h2>
        ${mem.length || bdays.length || hil.length ? `<div class="mini-rows">
          ${mem.map((m) => `<div class="mini-row"><span>אזכרה: ${esc(m.name)} ז״ל</span><span class="muted">${esc(renderHeb(m.hdate))}</span></div>`).join('')}
          ${bdays.map((m) => `<div class="mini-row"><span>יום הולדת: ${esc(m.name)}</span><span class="muted">${esc(renderHeb(m.hdate))}</span></div>`).join('')}
          ${hil.map((m) => `<div class="mini-row"><span>הילולא: ${esc(m.name)}</span><span class="muted">${esc(renderHeb(m.hdate))}</span></div>`).join('')}
        </div>` : '<p class="note">אין אזכרות, ימי הולדת או הילולות בשבוע הקרוב.</p>'}
        <div class="quick"><button class="btn sm" data-go="memorials">אזכרות</button><button class="btn sm" data-go="birthdays">ימי הולדת</button></div></section>
      <section class="card"><h2>${icon('announcements')}הודעות מוצגות <span class="tag">${anns.length}</span></h2>
        ${anns.length ? `<div class="mini-rows">${anns.slice(0, 6).map((a) => `<div class="mini-row"><span>${esc(a.title || (a.body || '').split('\n')[0])}</span><span class="muted">${a.to ? `עד ${fmtDate(a.to)}` : 'תמיד'}</span></div>`).join('')}</div>` : '<p class="note">אין הודעות פעילות כרגע.</p>'}
        <button class="btn sm" data-go="announcements">ניהול הודעות</button></section>
      <section class="card"><h2>${icon('halachot')}הלכה יומית</h2>
        <p class="note">${(DATA.halachaSource || 'sa') === 'sa' ? `היום: שולחן ערוך ${r.book.he}, סימן ${heNum(r.siman)} סעיף ${heNum(r.seif)}` : 'מוצגות ההלכות שכתבת'}</p>
        <button class="btn sm" data-go="halachot">הגדרות</button></section>
    </div>`;
  const pv = $('#pv');
  const fit = () => { const f = pv?.querySelector('iframe'); if (f) f.style.transform = `scale(${pv.clientWidth / 1920})`; };
  fit(); new ResizeObserver(fit).observe(pv);
  $('#panel').querySelectorAll('[data-go]').forEach((b) => b.onclick = () => {
    tab = b.dataset.go; renderNav();
    if (b.hasAttribute('data-new') && LISTS[tab]) { const it = LISTS[tab].blank(); DATA[tab].push(it); openIds.add(it.id); setDirty(); renderList(tab, true); updateCounts(); }
    else renderPanel();
  });
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
      <label class="fld"><span>ערכת צבעים</span>${sel('theme', THEMES, d.theme)}</label>
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
      <p class="note">למסך שני עם תוכן אחר: הוסף לכתובת הלוח <code>?screens=memorials,parnas</code></p></section>
    <section class="card"><h2>הגדרות נוספות</h2><div class="form-grid">
      <label class="fld"><span>זמן ברירת מחדל למסך (שניות)</span><input data-d="defaultSeconds" type="number" min="4" value="${esc(d.defaultSeconds)}"></label>
      <label class="fld"><span>ביצועים (לסטרימר)</span><select data-d="performance">${[['auto', 'אוטומטי – חסכוני במכשיר חלש'], ['lite', 'חסכוני תמיד (חלק יותר בסטרימר)'], ['full', 'מלא – כל האפקטים']].map(([k, l]) => `<option value="${k}" ${(d.performance || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="fld"><span>שעון נץ – כמה דקות לפני הנץ</span><input data-d="netzWindowMin" type="number" min="5" value="${esc(d.netzWindowMin)}"></label>
      <label class="fld check"><input data-d="ticker" type="checkbox" ${d.ticker ? 'checked' : ''}><span>פס גולל בתחתית</span></label>
      <label class="fld check"><input data-o="enabled" type="checkbox" ${d.offHours.enabled ? 'checked' : ''}><span>כיבוי המסך בלילה</span></label>
      <label class="fld"><span>כיבוי מהשעה</span><input data-o="from" type="time" value="${esc(d.offHours.from)}"></label>
      <label class="fld"><span>עד השעה</span><input data-o="to" type="time" value="${esc(d.offHours.to)}"></label>
    </div></section>`;
  const p = $('#panel');
  const upd = (e) => {
    const el = e.target;
    const val = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value;
    if (el.dataset.d) d[el.dataset.d] = val;
    else if (el.dataset.o) d.offHours[el.dataset.o] = val;
    else if (el.dataset.sc) { const row = el.closest('.screen-row'); d.screens[+row.dataset.i][el.dataset.sc] = val; if (el.dataset.sc === 'enabled') row.classList.toggle('off', !val); }
    else return;
    setDirty();
  };
  p.addEventListener('change', upd); p.addEventListener('input', upd);
  makeSortable(p.querySelector('.screen-list'), '.screen-row', (order) => { reorder(d.screens, order); setDirty(); renderDisplay(); });
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
function countOf(k) { return Array.isArray(DATA?.[k]) ? DATA[k].length : null; }
function renderNav() {
  const nav = $('#tabs');
  nav.hidden = false;
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'אזורי ניהול');
  nav.innerHTML = NAV.map(([g, items]) => `${g ? `<div class="group">${g}</div>` : ''}${items.map(([k, l]) => {
    const n = LISTS[k] ? countOf(k) : null;
    return `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${icon(k)}<span>${l}</span>${n ? `<span class="count" data-count="${k}">${n}</span>` : ''}</button>`;
  }).join('')}`).join('');
  nav.querySelectorAll('button').forEach((b) => b.onclick = () => { tab = b.dataset.tab; renderNav(); renderPanel(); b.scrollIntoView({ inline: 'center', block: 'nearest' }); });
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
  const b = $('#btn-save');
  b.disabled = true; b.textContent = 'שומר…'; $('#btn-save2').disabled = true;
  try {
    await save(DATA); SAVED = structuredClone(DATA); setDirty(false);
    setTimeout(checkVersion, 1500);
    const still = new Set((DATA.slides || []).map((x) => x.path)); const del = pendingDeletes.filter((p) => !still.has(p)); pendingDeletes = [];
    deleteMedia(del).catch(() => {}); flash('נשמר ✓ הלוח יתעדכן תוך כמה שניות');
    const f = $('#pv iframe'); if (f) setTimeout(() => f.contentWindow?.location.reload(), 1500);
  } catch (e) { setDirty(true); flash('השמירה נכשלה: ' + e.message, true); }
  finally { $('#btn-save2').disabled = false; }
}

async function enter() {
  const user = await currentUser();
  if (mode === 'supabase' && !user) {
    $('#login').hidden = false; $('#tabs').hidden = true; $('#panel').hidden = true;
    $('#who').textContent = '';
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
  renderNav(); renderPanel(); setDirty(r.source === 'missing');
}

$('#btn-save').onclick = doSave;
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
enter().catch((e) => flash('שגיאה: ' + e.message, true));

// גרסה חדשה של הממשק: בדיקה כשחוזרים לדף (ובכל 10 דקות). מרענן לבד רק אם אין שינויים שלא נשמרו.
let myVersion = null;
const getVersion = () => fetch('version.txt', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : null)).then((t) => t?.trim() || null).catch(() => null);
getVersion().then((v) => { myVersion = v; });
async function checkVersion() {
  const v = await getVersion();
  if (!v || !myVersion || v === myVersion) return;
  if (!dirty) location.reload();
  else flash('יש גרסה חדשה של הממשק – שמור, והדף יתרענן');
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
setInterval(checkVersion, 10 * 60 * 1000);
