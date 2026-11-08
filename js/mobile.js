// דף המתפללים: כל מה שבלוח, מסודר לטלפון.
import { moladInfo, computeDay, fmtTime, minutesOf, ZMAN_LABEL, ZMANIM, inHebrewRange, yahrzeitIn, birthdayIn, renderHeb, minToHhmm } from './jewish.js';
import { prayersForDay, weeklyPrayers, resolveTime, daysLabel } from './prayers.js';
import { HDate } from './lib.js';
import { load, subscribe } from './store.js';
import { cachedHalacha, prefetchHalachot, DEFAULT_START } from './halacha-sa.js';
import { sceneForSlide, renderScene } from './scenes.js';
import { annActive, annBody, annClasses, annStyle } from './ann.js';
import { cachedMishna, prefetchMishna } from './mishna.js';
import { upcomingHolidaySchedules } from './holidays.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s) => document.querySelector(s);
const I = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  prayer: '<path d="M12 3v4M8 5l4-2 4 2"/><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 12h6M9 16h6"/>',
  candle: '<path d="M12 3c2 3 2 4.5 0 6.5C10 7.5 10 6 12 3z"/><rect x="9" y="10" width="6" height="11" rx="1.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  megaphone: '<path d="M4 10v4a1 1 0 001 1h2l5 4V5L7 9H5a1 1 0 00-1 1z"/><path d="M16 8.5a5 5 0 010 7"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5M8 7h7"/>',
  scroll: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3M9 11h6M9 15h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 4a3 3 0 010 6M21 20a6 6 0 00-4-5.6"/>',
  whatsapp: '<path d="M20 11.5a8.5 8.5 0 01-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1120 11.5z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4 4 0 01-2.3-2.3l.8-1-1-2z"/>',
  calplus: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
// ---------- קהילה: וואטסאפ ויומן ----------
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const icsEsc = (t) => String(t || '').replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
const VTZ = 'BEGIN:VTIMEZONE\r\nTZID:Asia/Jerusalem\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0300\r\nTZNAME:IDT\r\nDTSTART:19700327T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=23,24,25,26,27,28,29;BYDAY=FR\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0300\r\nTZOFFSETTO:+0200\r\nTZNAME:IST\r\nDTSTART:19701025T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE';
/** קובץ יומן לשיעור קבוע – אירוע שבועי בימים שלו, מהפעם הקרובה */
function lessonIcs(l, s, now) {
  const days = l.weekdays?.length ? l.weekdays : [0, 1, 2, 3, 4, 5, 6];
  let off = 0; const base = computeDay(now, s).civil;
  while (off < 7 && !days.includes((base.getDay() + off) % 7)) off++;
  const d = computeDay(new Date(base.getTime() + off * 86400000), s);
  const min = resolveTime(l.time, d.civil, s, { candles: d.shabbat.candles, havdalah: d.shabbat.havdalah });
  if (min == null) return null;
  const c = d.civil, p2 = (n) => String(n).padStart(2, '0');
  const dt = (m) => `${c.getFullYear()}${p2(c.getMonth() + 1)}${p2(c.getDate())}T${p2(Math.floor(m / 60) % 24)}${p2(m % 60)}00`;
  const varies = l.time?.type === 'zman';
  const desc = [l.teacher && `מעביר: ${l.teacher}`, l.note, varies && 'השעה משתנה לפי זמני היום – השעה המעודכנת בלוח ובדף המתפללים', location.href.split('#')[0]].filter(Boolean).join('\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//shulboard//he', 'CALSCALE:GREGORIAN', VTZ, 'BEGIN:VEVENT',
    `UID:${l.id || Math.random().toString(36).slice(2)}@shulboard`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Jerusalem:${dt(min)}`, `DTEND;TZID=Asia/Jerusalem:${dt(min + 60)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${days.map((x) => BYDAY[x]).join(',')}`,
    `SUMMARY:${icsEsc(l.title)}`, `LOCATION:${icsEsc([s.name, s.city].filter(Boolean).join(', '))}`, `DESCRIPTION:${icsEsc(desc)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(l.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
function downloadIcs(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `${name.replace(/[\\/:*?"<>|]/g, '')}.ics`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
/** הודעת וואטסאפ עם זמני השבת */
function shabbatText(s, sh, weekly, isShabbat) {
  const lines = [`*${s.name || 'בית הכנסת'}*`];
  if (sh.parsha) lines.push(sh.parshaIsChag ? sh.parsha : `שבת פרשת ${sh.parsha}${sh.date ? ` · ${renderHeb(sh.date)}` : ''}`);
  lines.push('', `🕯️ ${sh.candlesLabel || 'הדלקת נרות'}: ${fmtTime(sh.candles, s.tz, 'floor')}`, `✨ צאת ${isShabbat ? 'השבת' : 'החג'}: ${fmtTime(sh.havdalah, s.tz, 'ceil')}`);
  if (weekly.friday.length) lines.push('', '*ערב שבת*', ...weekly.friday.map((p) => `${p.name} – ${p.time}`));
  if (weekly.shabbat.length) lines.push('', '*שבת*', ...weekly.shabbat.map((p) => `${p.name} – ${p.time}`));
  lines.push('', `כל הזמנים וההודעות: ${location.href.split('#')[0]}`, 'שבת שלום! 🌿');
  return lines.join('\n');
}

const row = (k, v, sub = '', cls = '') => `<div class="row ${cls}"><div class="k">${esc(k)}${sub ? `<small>${esc(sub)}</small>` : ''}</div><div class="v">${v}</div></div>`;
const inText = (m) => { const mins = Math.max(0, Math.ceil(m)); return mins <= 0 ? 'עכשיו' : mins < 60 ? `בעוד ${mins} דק׳` : `בעוד ${Math.floor(mins / 60)} שע׳${mins % 60 ? ` ו-${mins % 60} דק׳` : ''}`; };
const isoOf = (d, tz) => d.toLocaleDateString('en-CA', { timeZone: tz });

const WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const dayLabel = (day) => (!day.afterSunset ? day.weekday : day.dow === 6 ? 'מוצאי שבת קודש' : day.dow === 5 ? 'ליל שבת קודש' : `ליל יום ${WD[(day.dow + 1) % 7]}`);
let DATA = null;
let sceneSet = '';

function render() {
  // שומרים מה פתוח ואיפה גוללים – הדף מתרענן כל דקה
  const openNow = new Set([...document.querySelectorAll('details.fold[open]')].map((d) => d.closest('.card')?.id));
  const first = !document.querySelector('.quick');
  const y = scrollY;
  const s = DATA.synagogue;
  const now = new Date();
  const day = computeDay(now, s);
  const nowMin = minutesOf(now, s.tz);
  const iso = isoOf(now, s.tz);
  const today = prayersForDay(day, DATA, s);
  const weekly = weeklyPrayers(day, DATA, s);
  const sh = day.shabbat;
  const meta = Object.fromEntries(ZMANIM.map((z) => [z.key, z]));
  const lctx = { candles: sh.candles, havdalah: sh.havdalah };

  // התפילה הבאה – היום, ואם אין – מחר
  let next = today.find((p) => p.min != null && p.min >= nowMin);
  let nextDay = '';
  if (!next) {
    const t = new Date(now.getTime() + 86400000);
    const d2 = computeDay(t, s);
    const p2 = prayersForDay(d2, DATA, s).find((p) => p.min != null);
    if (p2) { next = { ...p2, min: p2.min + 1440 }; nextDay = 'מחר'; }
  }
  const nextIdx = today.indexOf(today.find((p) => p.min != null && p.min >= nowMin));

  const lessonsToday = (DATA.lessons || []).filter((l) => !l.weekdays?.length || l.weekdays.includes(day.civil.getDay()));
  const lessons = (DATA.lessons || []).map((l) => { const m = resolveTime(l.time, day.civil, s, lctx); return { ...l, timeStr: m == null ? '' : minToHhmm(m) }; });
  const anns = (DATA.announcements || []).filter((a) => annActive(a, iso, day.hd) && (a.title || a.body));
  let hols = []; try { hols = upcomingHolidaySchedules(DATA, s, now, 7); } catch { /* */ }
  const deds = DATA.display.screens.some((x) => x.type === 'neshama' && x.enabled) ? (DATA.dedications || []).filter((a) => annActive(a, iso, day.hd) && (a.title || a.body)) : [];
  const slides = (DATA.slides || []).filter((x) => x.url && x.enabled !== false && (!x.from || x.from <= iso) && (!x.to || x.to >= iso));
  const mem = inHebrewRange(DATA.memorials || [], day.hd, day.hd.add(7), yahrzeitIn);
  const bdays = inHebrewRange(DATA.birthdays || [], day.hd, day.hd.add(7), birthdayIn);
  const hil = []; // הילולות הוסרו מהלוח
  const hal = (DATA.halachaSource || 'sa') === 'sa' ? cachedHalacha(iso, DATA.halachaStart || DEFAULT_START) : null;
  const mish = DATA.display.screens.some((x) => x.type === 'mishna' && x.enabled) ? cachedMishna(day.hd) : null;
  const custom = !hal && (DATA.halachot || []).length ? DATA.halachot[Math.floor(day.civil.getTime() / 86400000) % DATA.halachot.length] : null;
  const isShabbat = sh.candlesDate && sh.candlesDate.getDay() === 5;
  const specials = [...(sh.specialShabbat || []), ...(sh.mevarchim || [])];
  const showZ = s.zmanimShown?.length ? s.zmanimShown : ZMANIM.map((z) => z.key);

  document.title = s.name || 'בית הכנסת';
  const nav = [['t-today', 'היום'], ['t-shabbat', isShabbat ? 'שבת' : 'חג'], hols.length && ['t-hol', 'החג'], anns.length && ['t-ann', 'הודעות'], slides.length && ['t-img', 'תמונות'], ['t-zmanim', 'זמנים'], ['t-week', 'השבוע'], (hal || custom) && ['t-hal', 'הלכה'], mish && ['t-mish', 'משנה'], lessons.length && ['t-les', 'שיעורים']].filter(Boolean);

  $('#app').innerHTML = `
    <header class="hero"><div class="hero-in">
      <div class="shul">${esc(s.name || 'בית הכנסת')}</div>
      ${s.dedication ? `<span class="ded">${esc(s.dedication)}</span>` : ''}
      <div class="hd">${esc(day.afterSunset ? `אור ל${day.next.hebDate}` : day.hebDate)}</div>
      <div class="sub">${esc(dayLabel(day))} · ${esc(day.gregDate)}${sh.parsha ? ` · ${sh.parshaIsChag ? esc(sh.parsha) : `פרשת ${esc(sh.parsha)}`}` : ''}</div>
      ${day.events.length ? `<div class="tags">${day.events.map((e) => `<span class="tag">${esc(e)}</span>`).join('')}</div>` : ''}
    </div></header>
    <nav class="quick" aria-label="קיצורים"><div class="quick-in">${nav.map(([id, l]) => `<a href="#${id}">${l}</a>`).join('')}</div></nav>
    <main class="wrap">
      ${next ? `<section class="card next" aria-live="polite"><div><div class="lbl">התפילה הבאה${nextDay ? ` · ${nextDay}` : ''}</div><div class="name">${esc(next.name)}</div><div class="in">${inText(next.min - nowMin)}</div></div><div class="time">${esc(next.time)}</div></section>` : ''}

      <section class="card" id="t-today"><h2>${icon('prayer')}תפילות היום</h2>
        ${today.length ? `<div class="rows">${today.map((p, i) => row(p.name, esc(p.time), p.note, i === nextIdx ? 'next' : p.min != null && p.min < nowMin ? 'past' : '')).join('')}</div>` : '<div class="muted">לא הוגדרו תפילות להיום.</div>'}
        ${day.changes.length ? `<div class="chips">${day.changes.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}
        ${day.omer ? `<div class="muted">${esc(day.afterSunset && day.omerTonight ? `הלילה: ${day.omerTonight.text}` : day.omer.text)}</div>` : ''}
        ${lessonsToday.length ? `<div class="sub-h">שיעורים היום</div><div class="rows">${lessons.filter((l) => lessonsToday.some((x) => x.id === l.id)).map((l) => row(l.title, esc(l.timeStr), [l.teacher, l.note].filter(Boolean).join(' · '))).join('')}</div>` : ''}
      </section>

      <section class="card shabbat" id="t-shabbat"><h2>${icon('candle')}${isShabbat ? 'שבת קודש' : 'חג'}</h2>
        ${sh.parsha ? `<div class="parsha">${sh.parshaIsChag ? esc(sh.parsha) : `פרשת ${esc(sh.parsha)}`}</div>` : ''}
        ${sh.haftarah && !sh.parshaIsChag ? `<div class="haft">הפטרה: ${esc(sh.haftarah)}</div>` : ''}
        ${specials.length ? `<div class="chips center">${specials.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
        <div class="two"><div><small>${esc(sh.candlesLabel || 'הדלקת נרות')}</small><b>${fmtTime(sh.candles, s.tz, 'floor')}</b></div><div><small>צאת ${isShabbat ? 'השבת' : 'החג'}</small><b>${fmtTime(sh.havdalah, s.tz, 'ceil')}</b></div></div>
        ${(() => { if (!sh.mevarchim?.length || !sh.date) return ''; try { const m = moladInfo(sh.date); return `<div class="molad-box"><div class="sub-h">שבת מברכים – חודש ${esc(m.month)}</div>
          <div class="rows">${row('המולד', `<span style="font:700 16px var(--body);direction:rtl">יום ${esc(m.dayName)} ${esc(m.time)}${m.chalakim ? ` ו־${esc(m.chalakimHe)} חלקים` : ''}</span>`)}
          ${row('ראש חודש', `<span style="font:700 16px var(--body);direction:rtl">${m.rc.map((r) => `${r.dayName} (${r.heb})`).join(' ו')}</span>`)}</div></div>`; } catch { return ''; } })()}
        ${weekly.friday.length || weekly.shabbat.length ? `<div class="sub-h">ערב שבת</div><div class="rows">${weekly.friday.map((p) => row(p.name, esc(p.time), p.note)).join('')}</div>
          <div class="sub-h">שבת</div><div class="rows">${weekly.shabbat.map((p) => row(p.name, esc(p.time), p.note)).join('')}</div>` : ''}
        <a class="btn wa" id="wa-shabbat" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shabbatText(s, sh, weekly, isShabbat))}">${icon('whatsapp')}שלח את זמני השבת בוואטסאפ</a>
      </section>

      ${hols.length ? `<section class="card" id="t-hol"><h2>${icon('calendar')}תפילות החג</h2>
        ${hols.map((g) => `<div class="sub-h">${esc(g.label)} · ${esc(g.heb)}</div><div class="rows">${g.rows.map((r) => row(r.name, esc(r.time), r.note)).join('')}</div>`).join('')}</section>` : ''}

      ${deds.length ? `<section class="card" id="t-ded"><h2>${icon('candle')}לעילוי נשמת</h2>
        ${deds.map((a) => `<div class="ann ${esc(a.style || '')} ${annClasses(a)}"${annStyle(a)}>${a.title ? `<h3>${esc(a.title)}</h3>` : ''}<p>${annBody(a.body)}</p></div>`).join('')}</section>` : ''}

      ${anns.length ? `<section class="card" id="t-ann"><h2>${icon('megaphone')}הודעות <span class="pill">${anns.length}</span></h2>
        ${anns.map((a) => `<div class="ann ${esc(a.style || '')} ${annClasses(a)}"${annStyle(a)}>${a.title ? `<h3>${esc(a.title)}</h3>` : ''}<p>${annBody(a.body)}</p>${a.dateMode !== 'hebrew' && a.to ? `<div class="when">עד ${esc(a.to.split('-').reverse().join('.'))}</div>` : ''}</div>`).join('')}</section>` : ''}

      ${slides.length ? `<section class="card" id="t-img"><h2>${icon('image')}מודעות ותמונות</h2>
        <div class="gallery">${slides.map((x, i) => `<button type="button" data-img="${i}" aria-label="הגדל: ${esc(x.title || x.caption || 'תמונה')}"><img src="${esc(x.url)}" alt="" loading="lazy">${x.title || x.caption ? `<span>${esc(x.title || x.caption)}</span>` : ''}</button>`).join('')}</div></section>` : ''}

      <section class="card" id="t-zmanim"><details class="fold" ${(first ? localStorage.getItem('m:z') === '1' : openNow.has('t-zmanim')) ? 'open' : ''}><summary>${icon('sun')}זמני היום</summary>
        <div class="rows" style="margin-top:6px">${showZ.map((k) => row(ZMAN_LABEL[k], fmtTime(day.zmanim[k], s.tz, meta[k]?.round))).join('')}</div>
        <div class="muted" style="font-size:13px">לפי מיקום בית הכנסת${s.city ? ` (${esc(s.city)})` : ''}</div></details></section>

      <section class="card" id="t-week"><details class="fold" ${openNow.has('t-week') ? 'open' : ''}><summary>${icon('calendar')}תפילות השבוע</summary>
        <div class="sub-h">ימות החול</div><div class="rows">${weekly.weekday.map((p) => row(p.name, esc(p.time), p.note)).join('') || '<div class="muted">—</div>'}</div>
        <div class="sub-h">ערב שבת</div><div class="rows">${weekly.friday.map((p) => row(p.name, esc(p.time), p.note)).join('') || '<div class="muted">—</div>'}</div>
        <div class="sub-h">שבת</div><div class="rows">${weekly.shabbat.map((p) => row(p.name, esc(p.time), p.note)).join('') || '<div class="muted">—</div>'}</div>
      </details></section>

      ${hal ? `<section class="card halacha" id="t-hal"><h2>${icon('scroll')}הלכה יומית</h2>${hal.title ? `<div class="t">${esc(hal.title)}</div>` : ''}
        <div class="x">${hal.parts.map((p) => (p.rema ? `<span class="rema"><b>הגה:</b> ${esc(p.text)}</span>` : esc(p.text))).join(' ')}</div><div class="src">${esc(hal.source)}</div></section>`
        : custom ? `<section class="card halacha" id="t-hal"><h2>${icon('scroll')}הלכה יומית</h2><div class="t">${esc(custom.title)}</div><div class="x">${esc(custom.text)}</div>${custom.source ? `<div class="src">${esc(custom.source)}</div>` : ''}</section>` : ''}

      ${mish ? `<section class="card halacha" id="t-mish"><h2>${icon('book')}משנה יומית</h2><div class="t">${mish.seder ? `סדר ${esc(mish.seder)} · ` : ''}מסכת ${esc(mish.tractate)}</div>
        ${mish.items.map((x) => `<div class="x"><span class="ml">פרק ${esc(x.perekHe)} משנה ${esc(x.mishnaHe)}</span> ${esc(x.text)}</div>`).join('')}<div class="src">${esc(mish.source)}</div></section>` : ''}

      ${day.learning?.length ? `<section class="card"><h2>${icon('book')}הלימוד היומי</h2><div class="rows">${day.learning.map((l) => row(l.label, `<span style="font:700 17px var(--body);direction:rtl">${esc(l.text)}</span>`)).join('')}</div></section>` : ''}

      ${lessons.length ? `<section class="card" id="t-les"><h2>${icon('book')}שיעורים קבועים</h2><div class="rows">${lessons.map((l, i) => row(l.title, `${esc(l.timeStr)}<button type="button" class="ics" data-ics="${i}" title="הוסף ליומן" aria-label="הוסף את ${esc(l.title)} ליומן">${icon('calplus')}</button>`, [daysLabel(l.weekdays), l.teacher, l.note].filter(Boolean).join(' · '))).join('')}</div>
        <div class="muted" style="font-size:13px">לחיצה על סמל היומן ליד השעה מוסיפה את השיעור ליומן בטלפון, עם תזכורת רבע שעה לפני.</div></section>` : ''}

      ${mem.length || bdays.length || hil.length ? `<section class="card people"><h2>${icon('people')}השבוע בקהילה</h2><div class="rows">
        ${mem.map((m) => row(`${m.name} ז״ל`, esc(renderHeb(m.hdate)), m.by ? `אזכרה · ${m.by}` : 'אזכרה')).join('')}
        ${bdays.map((b) => row(b.name, esc(renderHeb(b.hdate)), 'יום הולדת – מזל טוב!')).join('')}
        ${hil.map((h) => row(h.name, esc(renderHeb(h.hdate)), 'הילולא')).join('')}</div></section>` : ''}

      <div class="actions">
        <button class="btn primary" type="button" id="share">${icon('share')}שתף</button>
        <button class="btn" type="button" id="install">${icon('phone')}הוסף למסך הבית</button>
      </div>
      <div class="tip" id="install-tip" hidden>באייפון: לחצו על כפתור השיתוף <b>⎙</b> בתחתית Safari ← <b>הוסף למסך הבית</b>. באנדרואיד: תפריט ⋮ ← <b>הוסף למסך הבית</b>.</div>
      <div class="foot">עודכן ${now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })} · הדף מתעדכן לבד</div>
    </main>`;

  if (!first) scrollTo({ top: y, behavior: 'instant' });

  // רקע מצויר בראש הדף (כמו בלוח – כולל עיצובי חגים)
  const disp = { ...DATA.display, scene: DATA.display.scene === 'none' ? 'auto' : DATA.display.scene };
  const scene = sceneForSlide({ screen: 'combined', holiday: day.holiday, theme: DATA.display.theme === 'modern' ? 'classic' : DATA.display.theme, display: disp }) || 'jerusalem';
  if (sceneSet) $('.hero').style.setProperty('--scene', sceneSet);
  renderScene(scene, DATA.display.theme || 'classic').then((u) => { if (u) { sceneSet = `url("${u}")`; $('.hero')?.style.setProperty('--scene', sceneSet); } });

  // אירועים
  $('.wrap').querySelectorAll('[data-img]').forEach((b) => b.onclick = () => { const v = $('#viewer'); v.querySelector('img').src = slides[+b.dataset.img].url; v.showModal?.(); });
  $('.wrap').querySelectorAll('[data-ics]').forEach((b) => b.onclick = () => { const l = lessons[+b.dataset.ics]; const t = lessonIcs(l, s, new Date()); if (t) downloadIcs(t, l.title || 'שיעור'); });
  $('#t-zmanim details')?.addEventListener('toggle', (e) => { try { localStorage.setItem('m:z', e.target.open ? '1' : '0'); } catch {} });
  $('#share').onclick = async () => {
    const data = { title: s.name || 'בית הכנסת', text: `זמני תפילות והודעות – ${s.name || 'בית הכנסת'}`, url: location.href.split('#')[0] };
    if (navigator.share) { try { await navigator.share(data); } catch {} }
    else open(`https://wa.me/?text=${encodeURIComponent(`${data.text}\n${data.url}`)}`, '_blank');
  };
  $('#install').onclick = async () => { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } else $('#install-tip').hidden = false; };
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('#install').hidden = true;
}

let deferredInstall = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
$('#viewer').addEventListener('click', (e) => { if (e.target.tagName !== 'IMG') e.currentTarget.close(); });

const r = await load();
DATA = r.data;
render();
if ((DATA.halachaSource || 'sa') === 'sa') prefetchHalachot(isoOf(new Date(), DATA.synagogue.tz), DATA.halachaStart || DEFAULT_START, true).then((got) => { if (got) render(); }).catch(() => {});
prefetchMishna(DATA.synagogue, true).then((got) => { if (got) render(); }).catch(() => {});
subscribe((d) => { DATA = d; render(); });
setInterval(render, 60000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
