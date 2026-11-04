// ממשק הגבאי: עריכת כל הנתונים של הלוח.
import { load, save, mode, currentUser, signIn, signUp, signOut, exportJson, boardId } from './store.js';
import { demoData, normalize, SCREEN_TYPES, SCREEN_LABEL, THEMES, uid } from './defaults.js';
import { SCHEDULES, ZMAN_BASES, resolveTime, describeTime } from './prayers.js';
import { ZMANIM, HEB_MONTHS, computeDay, minToHhmm } from './jewish.js';
import { SCENE_CHOICES } from './scenes.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let DATA = null;
let dirty = false;
let tab = 'prayers';

function setDirty(v = true) { dirty = v; $('#btn-save').disabled = !v; $('#btn-save').textContent = v ? 'שמור שינויים' : 'נשמר'; }
function flash(text, err = false) {
  const m = $('#msg'); m.textContent = text; m.className = 'msg' + (err ? ' err' : ''); m.hidden = false;
  clearTimeout(flash.t); flash.t = setTimeout(() => { m.hidden = true; }, err ? 8000 : 3500);
}
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

// ---------- הגדרות שדות לכל רשימה ----------
const WEEKDAY_OPTS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_OPTS = [['', '—'], ...HEB_MONTHS];
const LISTS = {
  prayers: {
    label: 'תפילות', help: 'לכל תפילה: לאיזה לוח היא שייכת ומתי. תפילה בלוח מיוחד (ראש חודש, חג…) מחליפה תפילה באותו שם מלוח החול/שבת.',
    blank: () => ({ id: uid(), name: '', schedule: 'weekday', time: { type: 'fixed', value: '07:00' } }),
    fields: [['name', 'שם התפילה', 'text'], ['schedule', 'לוח', 'select', SCHEDULES], ['time', 'שעה', 'time'], ['weekdays', 'רק בימים (ריק = כולם)', 'weekdays'], ['note', 'הערה', 'text']],
    calc: true,
  },
  lessons: {
    label: 'שיעורים', help: 'שיעורים קבועים. מופיעים במסך המשולב ביום שלהם ובפס הגולל.',
    blank: () => ({ id: uid(), title: '', teacher: '', weekdays: [0, 1, 2, 3, 4], time: { type: 'fixed', value: '20:00' } }),
    fields: [['title', 'שם השיעור', 'text'], ['teacher', 'מעביר', 'text'], ['weekdays', 'ימים', 'weekdays'], ['time', 'שעה', 'time'], ['note', 'הערה', 'text']],
    calc: true,
  },
  announcements: {
    label: 'הודעות', help: 'בלי תאריכים – ההודעה מוצגת תמיד. שורה חדשה בטקסט = שורה חדשה בלוח.',
    blank: () => ({ id: uid(), style: 'general', title: '', body: '', from: '', to: '' }),
    fields: [['style', 'סגנון', 'select', [['general', 'רגיל'], ['simcha', 'שמחה'], ['memorial', 'אבל / אזכרה'], ['urgent', 'חשוב']]], ['title', 'כותרת', 'text'], ['from', 'מתאריך', 'date'], ['to', 'עד תאריך', 'date'], ['body', 'תוכן', 'textarea']],
  },
  memorials: {
    label: 'אזכרות', help: 'אפשר להזין תאריך פטירה לועזי (והאם אחרי השקיעה), או יום וחודש עבריים. הלוח מחשב את יום האזכרה בכל שנה.',
    blank: () => ({ id: uid(), name: '', date: '', afterSunset: false, hebDay: '', hebMonth: '', by: '' }),
    fields: [['name', 'שם (פלוני בן פלונית)', 'text'], ['date', 'תאריך פטירה לועזי', 'date'], ['afterSunset', 'אחרי השקיעה', 'check'], ['hebDay', 'או: יום עברי', 'number'], ['hebMonth', 'חודש עברי', 'select', MONTH_OPTS], ['by', 'הונצח ע"י', 'text']],
  },
  parnasim: {
    label: 'פרנסים', help: 'פרנס היום / השבוע / החודש / השנה. אפשר להגביל לתאריכים.',
    blank: () => ({ id: uid(), period: 'week', title: 'פרנס השבוע', name: '', text: '', from: '', to: '' }),
    fields: [['period', 'סוג', 'select', [['day', 'יום'], ['week', 'שבוע'], ['month', 'חודש'], ['year', 'שנה']]], ['title', 'כותרת', 'text'], ['name', 'שם', 'text'], ['text', 'הקדשה', 'text'], ['from', 'מתאריך', 'date'], ['to', 'עד תאריך', 'date']],
  },
  birthdays: {
    label: 'ימי הולדת', help: 'מוצגים בשבוע של יום ההולדת העברי.',
    blank: () => ({ id: uid(), name: '', date: '', afterSunset: false, hebDay: '', hebMonth: '' }),
    fields: [['name', 'שם', 'text'], ['date', 'תאריך לידה לועזי', 'date'], ['afterSunset', 'אחרי השקיעה', 'check'], ['hebDay', 'או: יום עברי', 'number'], ['hebMonth', 'חודש עברי', 'select', MONTH_OPTS], ['note', 'הערה', 'text']],
  },
  hilulot: {
    label: 'הילולות', help: 'יום פטירת צדיקים. מוצגים בשבוע שבו הם חלים.',
    blank: () => ({ id: uid(), name: '', hebDay: 1, hebMonth: 'Tishrei' }),
    fields: [['name', 'שם הצדיק', 'text'], ['hebDay', 'יום', 'number'], ['hebMonth', 'חודש', 'select', HEB_MONTHS], ['note', 'הערה', 'text']],
  },
  halachot: {
    label: 'הלכות', help: 'הלכה אחת ביום, ברוטציה לפי סדר הרשימה.',
    blank: () => ({ id: uid(), title: '', text: '', source: '' }),
    fields: [['title', 'כותרת', 'text'], ['source', 'מקור', 'text'], ['text', 'תוכן', 'textarea']],
  },
};
const TABS = [['prayers', 'תפילות'], ['lessons', 'שיעורים'], ['announcements', 'הודעות'], ['memorials', 'אזכרות'], ['parnasim', 'פרנסים'],
  ['birthdays', 'ימי הולדת'], ['hilulot', 'הילולות'], ['halachot', 'הלכות'], ['shul', 'בית הכנסת'], ['display', 'תצוגה'], ['backup', 'גיבוי']];

// ---------- רכיבי טופס ----------
function fieldHtml(item, [key, label, type, opts], path) {
  const id = `${path}-${key}`;
  const v = item[key];
  let input = '';
  if (type === 'text') input = `<input id="${id}" data-k="${key}" value="${esc(v)}">`;
  else if (type === 'number') input = `<input id="${id}" data-k="${key}" type="number" value="${esc(v)}">`;
  else if (type === 'date') input = `<input id="${id}" data-k="${key}" type="date" value="${esc(v)}">`;
  else if (type === 'textarea') input = `<textarea id="${id}" data-k="${key}">${esc(v)}</textarea>`;
  else if (type === 'check') input = `<input id="${id}" data-k="${key}" type="checkbox" ${v ? 'checked' : ''}>`;
  else if (type === 'select') input = `<select id="${id}" data-k="${key}">${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
  else if (type === 'weekdays') input = `<div class="days" data-k="${key}" data-type="weekdays">${WEEKDAY_OPTS.map((d, i) => `<label><input type="checkbox" value="${i}" ${(v || []).includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</div>`;
  else if (type === 'time') {
    const t = v || { type: 'fixed', value: '07:00' };
    input = `<div class="timebox" data-k="${key}" data-type="time">
      <select data-t="type"><option value="fixed" ${t.type !== 'zman' ? 'selected' : ''}>שעה קבועה</option><option value="zman" ${t.type === 'zman' ? 'selected' : ''}>יחסית לזמן</option></select>
      ${t.type !== 'zman' ? `<input data-t="value" type="time" value="${esc(t.value || '')}">` : `
      <select data-t="zman">${ZMAN_BASES.map(([k, l]) => `<option value="${k}" ${t.zman === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input data-t="offset" type="number" step="1" value="${esc(t.offset ?? 0)}" title="דקות: מינוס = לפני, פלוס = אחרי" aria-label="הפרש בדקות (מינוס = לפני)">
      <select data-t="round" aria-label="עיגול">${[[0, 'בלי עיגול'], [5, 'עיגול ל-5 דק\''], [10, 'עיגול ל-10 דק\''], [15, 'עיגול לרבע שעה']].map(([n, l]) => `<option value="${n}" ${+(t.round || 0) === n ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select data-t="dir" aria-label="כיוון העיגול">${[['down', 'כלפי מטה'], ['up', 'כלפי מעלה'], ['nearest', 'לקרוב']].map(([k, l]) => `<option value="${k}" ${(t.dir || 'down') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select data-t="basis" aria-label="בסיס החישוב">${[['day', 'לפי כל יום'], ['week-min', 'קבוע לשבוע (מוקדם)'], ['week-max', 'קבוע לשבוע (מאוחר)']].map(([k, l]) => `<option value="${k}" ${(t.basis || 'day') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`}
    </div>`;
  }
  const wide = type === 'textarea' || type === 'time' ? ' wide' : '';
  return `<div class="f${wide}"><span>${esc(label)}</span>${input}</div>`;
}

function readField(el) {
  const type = el.dataset.type;
  if (type === 'weekdays') return [...el.querySelectorAll('input:checked')].map((i) => +i.value);
  if (type === 'time') {
    const g = (k) => el.querySelector(`[data-t="${k}"]`)?.value;
    if (g('type') !== 'zman') return { type: 'fixed', value: g('value') || '00:00' };
    return { type: 'zman', zman: g('zman') || 'sunset', offset: +(g('offset') || 0), round: +(g('round') || 0), dir: g('dir') || 'down', basis: g('basis') || 'day' };
  }
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') return el.value === '' ? '' : +el.value;
  return el.value;
}

function freshPanel() {
  // החלפת האלמנט מנקה מאזינים ישנים מלשוניות קודמות
  const old = document.getElementById('panel');
  const n = old.cloneNode(false);
  old.replaceWith(n);
  return n;
}

// ---------- רשימות ----------
function calcText(item) {
  try {
    const s = DATA.synagogue;
    const day = computeDay(new Date(), s);
    const min = resolveTime(item.time, day.civil, s, { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah });
    if (item.time?.type !== 'zman') return '';
    return `${describeTime(item.time)} · היום: ${min == null ? '—' : minToHhmm(min)}`;
  } catch { return ''; }
}

function renderList(key) {
  freshPanel();
  const def = LISTS[key];
  const arr = DATA[key];
  $('#panel').innerHTML = `
    <div class="panel-head"><div><h2>${def.label}</h2><p>${esc(def.help)}</p></div><button class="primary" id="add">הוסף</button></div>
    <div class="items">${arr.length ? arr.map((it, i) => `
      <div class="item" data-i="${i}">
        ${def.fields.map((f) => fieldHtml(it, f, `${key}-${i}`)).join('')}
        <div class="tools"><span class="calc">${def.calc ? esc(calcText(it)) : ''}</span>
          <span><button data-act="up" aria-label="העלה">▲</button> <button data-act="down" aria-label="הורד">▼</button> <button data-act="del" class="danger">מחק</button></span></div>
      </div>`).join('') : '<div class="box">הרשימה ריקה. לחץ "הוסף".</div>'}</div>`;
  $('#add').onclick = () => { arr.push(def.blank()); setDirty(); renderList(key); $('#panel .item:last-child input')?.focus(); };
  $('#panel').querySelectorAll('.item').forEach((row) => {
    const i = +row.dataset.i;
    const commit = (e) => {
      const el = e.target.closest('[data-k]');
      if (!el) return;
      arr[i][el.dataset.k] = readField(el);
      setDirty();
      if (el.dataset.type === 'time' && e.target.dataset.t === 'type') renderList(key);
      else if (def.calc) row.querySelector('.calc').textContent = calcText(arr[i]);
    };
    row.addEventListener('change', commit);
    row.addEventListener('input', (e) => { if (e.target.matches('input[type=text],input:not([type]),textarea')) commit(e); });
    row.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
      const act = b.dataset.act;
      if (act === 'del') {
        if (b.dataset.confirm) { arr.splice(i, 1); setDirty(); renderList(key); }
        else { b.dataset.confirm = '1'; b.textContent = 'בטוח? לחץ שוב'; setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = 'מחק'; } }, 4000); }
        return;
      }
      const j = act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      setDirty(); renderList(key);
    });
  });
}

// ---------- בית הכנסת ----------
function renderShul() {
  freshPanel();
  const s = DATA.synagogue;
  const f = (k, label, type = 'text', extra = '') => `<label for="s-${k}">${label}</label><input id="s-${k}" data-s="${k}" type="${type}" value="${esc(s[k])}" ${extra}>`;
  $('#panel').innerHTML = `
    <div class="panel-head"><div><h2>פרטי בית הכנסת</h2><p>המיקום קובע את כל הזמנים. אפשר לקחת אותו מהטלפון כשאתה בבית הכנסת.</p></div></div>
    <section class="box"><div class="form">
      ${f('name', 'שם בית הכנסת')}
      ${f('dedication', 'שורת הקדשה')}
      ${f('city', 'עיר')}
      ${f('lat', 'קו רוחב', 'number', 'step="0.0001"')}
      ${f('lon', 'קו אורך', 'number', 'step="0.0001"')}
      <span></span><div class="row-btns" style="grid-column:auto"><button type="button" id="geo">קח מיקום מהמכשיר</button></div>
      ${f('elevation', 'גובה (מטרים)', 'number')}
      <label for="s-useElevation">חישוב לפי גובה</label><input id="s-useElevation" data-s="useElevation" type="checkbox" ${s.useElevation ? 'checked' : ''}>
      <label for="s-il">בארץ ישראל</label><input id="s-il" data-s="il" type="checkbox" ${s.il ? 'checked' : ''}>
      <label for="s-nusach">נוסח</label><select id="s-nusach" data-s="nusach">${[['sefard', 'ספרד'], ['ashkenaz', 'אשכנז'], ['edot', 'עדות המזרח'], ['chabad', 'חב"ד']].map(([k, l]) => `<option value="${k}" ${s.nusach === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${f('candleMins', 'הדלקת נרות – דקות לפני השקיעה', 'number')}
      <div class="hint">חיפה 30, תל אביב 22, ירושלים 40 – לפי מנהג המקום</div>
      ${f('havdalahMins', 'צאת שבת – דקות אחרי השקיעה', 'number')}
      <div class="hint">0 = לפי צאת הכוכבים (8.5 מעלות). לר"ת למשל 72.</div>
      ${f('tz', 'אזור זמן')}
    </div></section>
    <section class="box"><h2>זמני היום שיוצגו</h2><div class="checks">${ZMANIM.map((z) => `<label><input type="checkbox" data-z="${z.key}" ${(s.zmanimShown || []).includes(z.key) ? 'checked' : ''}>${z.label}</label>`).join('')}</div></section>
    <section class="box"><h2>לימוד יומי</h2><div class="checks">${[['dafYomi', 'דף יומי'], ['mishnaYomi', 'משנה יומית'], ['nachYomi', 'נ"ך יומי'], ['rambam1', 'רמב"ם יומי'], ['chofetzChaim', 'חפץ חיים'], ['psalms', 'תהלים']].map(([k, l]) => `<label><input type="checkbox" data-l="${k}" ${s.learning?.[k] ? 'checked' : ''}>${l}</label>`).join('')}</div></section>`;
  const p = $('#panel');
  p.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.s) { s[el.dataset.s] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; setDirty(); }
  });
  p.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.s) { s[el.dataset.s] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; setDirty(); }
    if (el.dataset.z) { s.zmanimShown = ZMANIM.map((z) => z.key).filter((k) => p.querySelector(`[data-z="${k}"]`).checked); setDirty(); }
    if (el.dataset.l) { s.learning = { ...(s.learning || {}), [el.dataset.l]: el.checked }; setDirty(); }
  });
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
  $('#panel').innerHTML = `
    <div class="panel-head"><div><h2>תצוגה</h2><p>סדר המסכים, כמה זמן כל אחד מוצג, ועיצוב. מסך בלי תוכן (למשל אין אזכרות השבוע) מדולג אוטומטית.</p></div></div>
    <section class="box"><div class="form">
      <label for="d-theme">ערכת עיצוב</label><select id="d-theme" data-d="theme">${THEMES.map(([k, l]) => `<option value="${k}" ${d.theme === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label for="d-scene">רקעים</label><select id="d-scene" data-d="scene">${SCENE_CHOICES.map(([k, l]) => `<option value="${k}" ${(d.scene || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label for="d-hol">עיצוב מיוחד בחגים</label><input id="d-hol" data-d="holidayDesign" type="checkbox" ${d.holidayDesign !== false ? 'checked' : ''}>
      <label for="d-greet">מסך "ברוכים הבאים" בימי חול</label><input id="d-greet" data-d="greetingDaily" type="checkbox" ${d.greetingDaily ? 'checked' : ''}>
      <label for="d-bg">תמונת רקע משלך (כתובת)</label><input id="d-bg" data-d="bgImage" value="${esc(d.bgImage)}" placeholder="https://… (לא חובה; בחגים יוצג עיצוב החג)">
      <label for="d-sec">זמן ברירת מחדל למסך (שניות)</label><input id="d-sec" data-d="defaultSeconds" type="number" min="4" value="${esc(d.defaultSeconds)}">
      <label for="d-ticker">פס גולל בתחתית</label><input id="d-ticker" data-d="ticker" type="checkbox" ${d.ticker ? 'checked' : ''}>
      <label for="d-netz">שעון נץ – דקות לפני הנץ</label><input id="d-netz" data-d="netzWindowMin" type="number" min="5" value="${esc(d.netzWindowMin)}">
      <label for="d-off">כיבוי מסך בלילה</label><input id="d-off" data-o="enabled" type="checkbox" ${d.offHours.enabled ? 'checked' : ''}>
      <label for="d-from">מהשעה</label><input id="d-from" data-o="from" type="time" value="${esc(d.offHours.from)}">
      <label for="d-to">עד השעה</label><input id="d-to" data-o="to" type="time" value="${esc(d.offHours.to)}">
    </div></section>
    <p class="sub">במצב "אוטומטי" כל שקופית מקבלת רקע משלה (זמני היום – מסלול השמש, שיעורים – ארון ספרים, אזכרות – נר נשמה…), ובחגים הלוח עובר לעיצוב ולצבעים של החג. <a href="gallery.html" target="_blank">לגלריית הרקעים</a></p>
    <section class="box"><h2>המסכים</h2><div class="items">${d.screens.map((sc, i) => `
      <div class="item" data-i="${i}" style="grid-template-columns:auto 1fr 120px auto;align-items:center">
        <input type="checkbox" data-sc="enabled" ${sc.enabled ? 'checked' : ''} aria-label="הצג ${esc(SCREEN_LABEL[sc.type])}">
        <strong>${esc(SCREEN_LABEL[sc.type] || sc.type)}</strong>
        <input type="number" min="4" data-sc="seconds" value="${esc(sc.seconds)}" aria-label="שניות">
        <span><button data-act="up" aria-label="העלה">▲</button> <button data-act="down" aria-label="הורד">▼</button></span>
      </div>`).join('')}</div>
      <p class="sub">טיפ: למסך שני עם תוכן אחר, פתח את הלוח עם <code>?screens=memorials,parnas</code> בסוף הכתובת.</p></section>`;
  const p = $('#panel');
  const upd = (e) => {
    const el = e.target;
    const val = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value;
    if (el.dataset.d) d[el.dataset.d] = val;
    else if (el.dataset.o) d.offHours[el.dataset.o] = val;
    else if (el.dataset.sc) d.screens[+el.closest('.item').dataset.i][el.dataset.sc] = val;
    else return;
    setDirty();
  };
  p.addEventListener('change', upd);
  p.addEventListener('input', upd);
  p.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
    const i = +b.closest('.item').dataset.i, j = b.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= d.screens.length) return;
    [d.screens[i], d.screens[j]] = [d.screens[j], d.screens[i]];
    setDirty(); renderDisplay();
  });
}

// ---------- גיבוי ----------
function renderBackup() {
  freshPanel();
  $('#panel').innerHTML = `
    <div class="panel-head"><div><h2>גיבוי ושחזור</h2><p>כדאי להוריד גיבוי אחרי כל עדכון גדול.</p></div></div>
    <section class="box"><div class="row-btns">
      <a class="btn" id="dl" download="shul-board-${esc(boardId)}.json">הורד גיבוי</a>
      <label class="btn" for="imp">טען מקובץ</label><input id="imp" type="file" accept="application/json" hidden>
      <button class="danger" id="reset">אפס לנתוני הדגמה</button>
    </div></section>
    <section class="box"><h2>מצב החיבור</h2><div>${mode === 'supabase' ? `מחובר ל-Supabase · לוח: <b>${esc(boardId)}</b>` : 'מצב מקומי: הנתונים נשמרים בדפדפן הזה בלבד. כדי לעדכן מהטלפון את הלוח שבבית הכנסת, חבר Supabase (הוראות ב-README).'}</div></section>`;
  const url = URL.createObjectURL(exportJson(DATA));
  $('#dl').href = url;
  $('#imp').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { DATA = normalize(JSON.parse(await file.text())); setDirty(); flash('הקובץ נטען. לחץ "שמור" כדי להחיל.'); }
    catch { flash('הקובץ לא תקין', true); }
  };
  $('#reset').onclick = (e) => {
    const b = e.currentTarget;
    if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.textContent = 'בטוח? כל הנתונים יוחלפו. לחץ שוב'; return; }
    DATA = normalize(demoData()); setDirty(); flash('נטענו נתוני הדגמה. לחץ "שמור" כדי להחיל.'); renderBackup();
  };
}

// ---------- ניווט ----------
function renderTabs() {
  const nav = $('#tabs');
  nav.hidden = false;
  nav.setAttribute('role', 'tablist');
  nav.innerHTML = TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join('');
  nav.querySelectorAll('button').forEach((b) => b.onclick = () => { tab = b.dataset.tab; renderTabs(); renderPanel(); });
}
function renderPanel() {
  if (LISTS[tab]) renderList(tab);
  else if (tab === 'shul') renderShul();
  else if (tab === 'display') renderDisplay();
  else renderBackup();
}

async function doSave() {
  const b = $('#btn-save');
  b.disabled = true; b.textContent = 'שומר…';
  try { await save(DATA); setDirty(false); flash('נשמר. הלוח יתעדכן תוך כמה שניות.'); }
  catch (e) { setDirty(true); flash('השמירה נכשלה: ' + e.message, true); }
}

async function enter() {
  const user = await currentUser();
  if (mode === 'supabase' && !user) {
    $('#login').hidden = false; $('#tabs').hidden = true; $('#panel').innerHTML = '';
    $('#who').textContent = `לוח: ${boardId}`;
    return;
  }
  $('#login').hidden = true;
  $('#who').innerHTML = mode === 'supabase'
    ? `${esc(user.email)} · לוח ${esc(boardId)} · <a href="#" id="out">התנתק</a>`
    : 'מצב מקומי (בלי ענן) – הנתונים נשמרים בדפדפן הזה';
  $('#out')?.addEventListener('click', async (e) => { e.preventDefault(); await signOut(); location.reload(); });
  const r = await load();
  DATA = r.data;
  if (r.source === 'missing') flash('הלוח עוד לא קיים בשרת. נטענו נתוני הדגמה – ערוך ולחץ "שמור" כדי ליצור אותו.');
  renderTabs(); renderPanel(); setDirty(r.source === 'missing');
}

$('#btn-save').onclick = doSave;
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  try { await signIn($('#email').value, $('#password').value); enter(); }
  catch (err) { flash(err.message, true); }
};
$('#btn-signup').onclick = async () => {
  try { await signUp($('#email').value, $('#password').value); flash('נרשמת. אם נשלח אליך מייל אימות – אשר אותו ואז היכנס.'); }
  catch (err) { flash(err.message, true); }
};
const q = location.search;
$('#lnk-board').href = (window.SHUL_CONFIG?.boardPage || 'index.html') + q;
$('#lnk-mobile').href = 'm.html' + q;
enter().catch((e) => flash('שגיאה: ' + e.message, true));
