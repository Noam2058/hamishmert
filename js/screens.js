// המסכים של הלוח. כל מסך מחזיר HTML, מערך של שקפים, או null כשאין מה להציג.
import { cachedHalacha, DEFAULT_START } from './halacha-sa.js';
import { zmanimFor, moladInfo, computeDay, minToHhmm, fmtTime, minutesOf, ZMAN_LABEL, ZMANIM, inHebrewRange, yahrzeitIn, birthdayIn, renderHeb, hhmmToMin } from './jewish.js';
import { HDate } from './lib.js';
import { daysLabel, resolveTime } from './prayers.js';
import { cachedMishna } from './mishna.js';
import { upcomingHolidaySchedules } from './holidays.js';
import { greetingArt } from './art.js';
import { annActive, annBody, annClasses, annBig, annStyle } from './ann.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const title = (t) => `<div class="screen-title"><span>${esc(t)}</span></div>`;
const flourish = '<svg class="flourish" viewBox="0 0 260 18" aria-hidden="true"><path d="M0 9h100M160 9h100" stroke="currentColor" stroke-width="2"/><path d="M130 2l7 7-7 7-7-7z" fill="currentColor"/><circle cx="112" cy="9" r="3" fill="currentColor"/><circle cx="148" cy="9" r="3" fill="currentColor"/></svg>';
/** שינויים בתפילה – רשימה מעוצבת: כל שינוי בשורה משלו, מופרד בעיטור זהב. extra: [{t, v}] (שעה/מידע נוסף) */
// איורים קטנים לכרטיסי השבת
const CANDLES_SVG = `<svg class="side-art" viewBox="0 0 200 170" aria-hidden="true"><defs>
  <linearGradient id="cs-m" x1="0" x2="1"><stop offset="0" stop-color="#8f6a22"/><stop offset=".45" stop-color="#f3d98c"/><stop offset="1" stop-color="#9c7322"/></linearGradient>
  <linearGradient id="cs-w" x1="0" x2="1"><stop offset="0" stop-color="#e9e1cf"/><stop offset=".5" stop-color="#fffdf6"/><stop offset="1" stop-color="#ddd3bd"/></linearGradient>
  <radialGradient id="cs-g"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient></defs>
  ${[62, 138].map((x) => `<circle cx="${x}" cy="30" r="30" fill="url(#cs-g)" class="glow"/>
  <path class="flame" d="M${x} 10c7 10 9 16 0 26c-9-10-7-16 0-26z" fill="#ffb53b"/><path d="M${x} 20c3 5 4 8 0 13c-4-5-3-8 0-13z" fill="#fff4c4"/>
  <rect x="${x - 9}" y="38" width="18" height="62" rx="3" fill="url(#cs-w)"/><path d="M${x} 36v6" stroke="#3a2a12" stroke-width="2"/>
  <path d="M${x - 22} 102h44l-6 8h-32z" fill="url(#cs-m)"/><rect x="${x - 5}" y="110" width="10" height="34" fill="url(#cs-m)"/>
  <path d="M${x - 26} 158c4-10 16-14 26-14s22 4 26 14z" fill="url(#cs-m)"/>`).join('')}</svg>`;
const HAVDALAH_SVG = `<svg class="side-art wide" viewBox="0 0 280 170" aria-hidden="true"><defs>
  <linearGradient id="hv-b" x1="0" x2="1"><stop offset="0" stop-color="#2c5aa0"/><stop offset=".5" stop-color="#6d9be0"/><stop offset="1" stop-color="#23467f"/></linearGradient>
  <linearGradient id="hv-s" x1="0" x2="1"><stop offset="0" stop-color="#8f949e"/><stop offset=".45" stop-color="#f4f6fa"/><stop offset="1" stop-color="#8a909b"/></linearGradient>
  <linearGradient id="hv-m" x1="0" x2="1"><stop offset="0" stop-color="#8f6a22"/><stop offset=".45" stop-color="#f3d98c"/><stop offset="1" stop-color="#9c7322"/></linearGradient>
  <linearGradient id="hv-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b1b30"/><stop offset="1" stop-color="#5c0d1b"/></linearGradient>
  <radialGradient id="hv-g"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient></defs>
  ${[[24, 26, 8], [256, 20, 7], [232, 58, 5], [52, 70, 4]].map(([x, y, r]) => `<path class="star" d="M${x} ${y - r}l${r * .3} ${r * .7} ${r * .7} ${r * .3} -${r * .7} ${r * .3} -${r * .3} ${r * .7} -${r * .3} -${r * .7} -${r * .7} -${r * .3} ${r * .7} -${r * .3}z" fill="#b8892f"/>`).join('')}
  <!-- גביע יין -->
  <g transform="translate(62 70)">
    <path d="M-26 0h52c0 26-10 40-26 42c-16-2-26-16-26-42z" fill="url(#hv-m)"/>
    <path d="M-23 4h46c-1 20-9 32-23 34c-14-2-22-14-23-34z" fill="url(#hv-w)"/>
    <path d="M-23 4h46" stroke="#ffd7dd" stroke-opacity=".5" stroke-width="2"/>
    <rect x="-4" y="42" width="8" height="30" fill="url(#hv-m)"/><circle cy="54" r="6" fill="url(#hv-m)"/>
    <path d="M-24 86c3-9 13-14 24-14s21 5 24 14z" fill="url(#hv-m)"/>
  </g>
  <!-- נר הבדלה -->
  <circle cx="140" cy="34" r="36" fill="url(#hv-g)" class="glow"/>
  <path class="flame" d="M132 8c10 12 14 20 8 32c-4 4-12 4-16 0c-6-12-2-20 8-32z" fill="#ffb53b"/><path class="flame" d="M148 10c8 10 11 17 6 27c-3 3-9 3-12 0c-5-10-2-17 6-27z" fill="#ffc451"/>
  <path d="M140 22c4 6 5 10 0 16c-5-6-4-10 0-16z" fill="#fff4c4"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M126 ${44 + i * 18}c10-6 18-6 28 0v18c-10-6-18-6-28 0z" fill="url(#hv-b)" stroke="#1b3a6b" stroke-width="1"/>`).join('')}
  <!-- קופסת בשמים (מגדל) -->
  <g transform="translate(218 62)">
    <path d="M0 -26v-10" stroke="url(#hv-s)" stroke-width="3"/><path d="M0 -36l12 4-12 4z" fill="#c9a24a"/>
    <path d="M-12 -2l12-24 12 24z" fill="url(#hv-s)" stroke="#6e737d" stroke-width="1"/>
    <rect x="-16" y="-2" width="32" height="44" rx="2" fill="url(#hv-s)" stroke="#6e737d" stroke-width="1"/>
    ${[0, 1].map((r) => [-8, 0, 8].map((x) => `<rect x="${x - 2.5}" y="${6 + r * 16}" width="5" height="9" rx="2.5" fill="#5f6570"/>`).join('')).join('')}
    <path d="M-20 42h40v6h-40z" fill="url(#hv-s)"/><rect x="-4" y="48" width="8" height="22" fill="url(#hv-s)"/>
    <path d="M-20 94c3-12 11-24 20-24s17 12 20 24z" fill="url(#hv-s)" stroke="#6e737d" stroke-width="1"/>
  </g>
  <path d="M28 162h224" stroke="#c9a24a" stroke-width="4" stroke-linecap="round"/></svg>`;

const ribbon = (html, i = 0) => `<div class="ribbon c${i % 5}"><span class="rb-body">${html}</span></div>`;
const capsule = (t) => `<div class="capsule"><span>${esc(t)}</span></div>`;
const changesHtml = (changes, extra = []) => {
  if (!changes.length && !extra.length) return '<div class="chg-none">סדר התפילה הרגיל</div>';
  // כל שינוי – סרט צבעוני עם קצוות מסולסלים בזהב; הצבעים מתחלפים
  let n = 0;
  return `<div class="chg-list">${changes.map((c) => ribbon(esc(c), n++)).join('')}${extra.map((x) => ribbon(`${esc(x.t)}${x.v ? ` <b>${esc(x.v)}</b>` : ''}`, n++)).join('')}</div>`;
};
const candle = '<div class="candle" aria-hidden="true"><div class="flame"></div><div class="wax"></div></div>';

function prayerRows(list, nowMin, markNext = true, compact = false) {
  if (!list.length) return '<div class="empty">לא הוגדרו תפילות</div>';
  let nextMarked = !markNext;
  const rows = list.map((p) => {
    let cls = '';
    if (nowMin != null && p.min != null) {
      if (p.min < nowMin - 5) cls = 'past';
      else if (!nextMarked) { cls = 'next'; nextMarked = true; }
    }
    return `<div class="row ${cls}"><div class="k">${esc(p.name)}${p.note ? `<small>${esc(p.note)}</small>` : ''}</div><div class="v">${p.time}</div></div>`;
  });
  return `<div class="rows${compact ? ' compact' : ''}">${rows.join('')}</div>`;
}

function zmanimRows(ctx, keys, compact) {
  const { day, s } = ctx;
  const nowMin = minutesOf(ctx.now, s.tz);
  const meta = Object.fromEntries(ZMANIM.map((z) => [z.key, z]));
  return `<div class="rows${compact ? ' compact' : ''}">${keys.map((k) => {
    const t = day.zmanim[k];
    const past = t && minutesOf(t, s.tz) < nowMin && !(k === 'chatzotNight');
    return `<div class="row ${past ? 'past' : ''}"><div class="k">${esc(ZMAN_LABEL[k])}</div><div class="v">${fmtTime(t, s.tz, meta[k]?.round)}</div></div>`;
  }).join('')}</div>`;
}

function dayLabelForSchedule(day) {
  const map = { yomtov: 'חג', fast: 'תענית', 'chol-hamoed': 'חול המועד', 'rosh-chodesh': 'ראש חודש', chanuka: 'חנוכה', 'erev-yomtov': 'ערב חג' };
  for (const t of ['yomtov', 'fast', 'chol-hamoed', 'erev-yomtov', 'rosh-chodesh', 'chanuka']) if (day.tags.includes(t)) return map[t];
  return day.dow === 6 ? 'שבת' : day.dow === 5 ? 'ערב שבת' : '';
}

// ---------- המסכים ----------

function greetingFor(ctx) {
  const { day, display } = ctx;
  const descs = day.holidays.map((e) => e.getDesc()).join('|');
  const m = day.hd.getMonth(), d = day.hd.getDate();
  const sh = day.shabbat;
  const parsha = sh.parshaIsChag ? sh.parsha : `פרשת ${sh.parsha}`;
  switch (day.season) {
    case 'chanuka': {
      // הנר הראשון מודלק בערב כ"ד כסלו; טבת באותה שנה עברית כמו כסלו
      const n = day.hd.deltaDays(new HDate(24, 'Kislev', day.hd.getFullYear()));
      const lit = Math.min(8, Math.max(1, day.afterSunset ? n + 1 : n));
      const nights = ['', 'הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי', 'השביעי', 'השמיני'];
      return { kind: 'chanuka', lit, title: 'חנוכה שמח', sub: `נר ${nights[lit]} של חנוכה${lit === 8 ? ' · זאת חנוכה' : ''}` };
    }
    case 'purim': return { kind: 'purim', title: 'פורים שמח', sub: 'משלוח מנות איש לרעהו ומתנות לאביונים' };
    case 'pesach': return { kind: 'pesach', title: 'חג כשר ושמח', sub: /Chol/.test(descs) ? 'מועדים לשמחה' : 'זמן חרותנו' };
    case 'shavuot': return { kind: 'shavuot', title: 'חג שבועות שמח', sub: 'זמן מתן תורתנו' };
    case 'sukkot': return { kind: 'sukkot', title: /Shmini|Simchat/.test(descs) ? 'שמחת תורה שמחה' : 'חג סוכות שמח', sub: 'זמן שמחתנו · מועדים לשמחה' };
    case 'yamim-noraim':
      if (m === 7 && d >= 3) return { kind: 'yamim-noraim', title: 'גמר חתימה טובה', sub: 'עשרת ימי תשובה' };
      return { kind: 'yamim-noraim', title: 'שנה טובה ומתוקה', sub: 'כתיבה וחתימה טובה' };
    case 'shabbat': return { kind: 'shabbat', title: day.dow === 6 || day.dow === 5 ? 'שבת שלום ומבורך' : 'שבת שלום', sub: parsha };
    default:
      if (day.holiday === 'tu-bishvat') return { kind: 'shavuot', title: 'ט"ו בשבט שמח', sub: 'ראש השנה לאילנות' };
      if (day.holiday === 'lag-baomer') return { kind: 'torah', title: 'ל"ג בעומר שמח', sub: 'הילולא דרבי שמעון בר יוחאי' };
      if (day.holiday === 'yom-haatzmaut') return { kind: 'torah', title: 'חג עצמאות שמח', sub: 'ראשית צמיחת גאולתנו' };
      if (day.holiday === 'yom-yerushalayim') return { kind: 'torah', title: 'יום ירושלים שמח', sub: 'ירושלים הבנויה כעיר שחוברה לה יחדיו' };
      if (day.tags.includes('rosh-chodesh')) return { kind: 'torah', title: 'חודש טוב', sub: day.events.join(' · ') };
      if (day.season === 'elul') return { kind: 'yamim-noraim', title: 'חודש אלול', sub: 'ימי רחמים וסליחות' };
      return { kind: 'torah', title: 'ברוכים הבאים', sub: `${day.afterSunset ? day.next.hebDate : day.hebDate} · ${parsha}` }; // כל יום; לכיבוי – מכבים את מסך הברכה ברשימת המסכים
  }
}

/** מסך הכניסה בימים רגילים: ברכה בתוך מסגרת זהב מעוטרת */
function welcomeHtml(ctx, gr) {
  const { day, s } = ctx;
  return `<div class="welcome">
    <div class="w-frame">
      <span class="w-c tl"></span><span class="w-c tr"></span><span class="w-c bl"></span><span class="w-c br"></span>
      <div class="w-crest">${flourish}</div>
      <div class="w-title">${esc(gr.title)}</div>
      <div class="w-sub">${esc(gr.sub || '')}</div>
      ${s.name ? `<div class="w-name">${esc(s.name)}</div>` : ''}
    </div>
  </div>`;
}

export const SCREENS = {
  greeting(ctx) {
    const gr = greetingFor(ctx);
    if (!gr) return null;
    let img = '';
    // ספר התורה במסך הכניסה – תמונה אמיתית (img/torah.webp); בחגים – האיורים המצוירים
    if (gr.kind === 'torah') return welcomeHtml(ctx, gr); // ימים רגילים: מסך כניסה בלי איור – מסגרת מעוטרת ומידע להיום
    try { img = greetingArt(gr.kind, { lit: gr.lit }); } catch { /* */ }
    return `<div class="greet">
      ${img ? `<img class="art" src="${img}" alt="">` : ''}
      <div class="words"><div class="gt">${esc(gr.title)}</div>${flourish}<div class="gs">${esc(gr.sub || '')}</div>
      ${ctx.s.name ? `<div class="gn">${esc(ctx.s.name)}</div>` : ''}</div></div>`;
  },

  combined(ctx) {
    const { day, s, prayersToday, lessonsToday } = ctx;
    const nowMin = minutesOf(ctx.now, s.tz);
    const tag = dayLabelForSchedule(day);
    const keys = (s.zmanimShown || []).slice(0, 9);
    const extra = [];
    if (day.fast.length) extra.push(...day.fast.map((f) => ({ t: f.label, v: fmtTime(f.time, s.tz, f.label === 'סוף הצום' ? 'ceil' : 'floor') })));
    if (day.omer) extra.push({ t: `היום ${day.omer.day} לעומר` });
    return `
      <div class="grid g-combined">
        <section class="card"><h3>תפילות היום ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</h3>${prayerRows(prayersToday, nowMin)}</section>
        <section class="card"><h3>זמני היום</h3>${zmanimRows(ctx, keys, true)}</section>
        <section class="card"><h3>בתפילה היום</h3><div class="body changes">${changesHtml(day.changes, extra)}</div></section>
      </div>`;
  },

  prayers(ctx) {
    const { day, s, weekly, prayersToday } = ctx;
    const nowMin = minutesOf(ctx.now, s.tz);
    const special = ['yomtov', 'fast', 'chol-hamoed', 'rosh-chodesh', 'erev-yomtov', 'chanuka'].some((t) => day.tags.includes(t));
    const cols = [];
    if (special) cols.push(`<section class="card"><h3>היום <span class="tag">${esc(dayLabelForSchedule(day))}</span></h3>${prayerRows(prayersToday, nowMin)}</section>`);
    cols.push(`<section class="card"><h3>ימות החול</h3>${prayerRows(weekly.weekday, null, false)}${ctx.data.lessons?.length ? '' : ''}</section>`);
    cols.push(`<section class="card"><h3>ערב שבת</h3>${prayerRows(weekly.friday, null, false)}</section>`);
    cols.push(`<section class="card"><h3>שבת קודש</h3>${prayerRows(weekly.shabbat, null, false)}</section>`);
    return `${title('זמני התפילות')}<div class="grid g${Math.min(cols.length, 3) === 3 ? 3 : 2}" style="grid-template-columns:repeat(${cols.length},1fr)">${cols.join('')}</div>`;
  },

  zmanim(ctx) {
    const { day, s } = ctx;
    const keys = s.zmanimShown || [];
    const half = Math.ceil(keys.length / 2);
    return `${title('זמני היום')}
      <div class="grid" style="grid-template-columns:1fr 1fr ${day.changes.length + day.fast.length > 3 ? '1.25fr' : '1fr'}">
        <section class="card">${zmanimRows(ctx, keys.slice(0, half))}</section>
        <section class="card">${zmanimRows(ctx, keys.slice(half))}</section>
        <section class="card"><h3>שינויים בתפילה</h3><div class="body changes">${changesHtml(day.changes, day.fast.map((f) => ({ t: f.label, v: fmtTime(f.time, s.tz, f.label === 'סוף הצום' ? 'ceil' : 'floor') })))}</div></section>
      </div>`;
  },

  shabbat(ctx) {
    const { day, s } = ctx;
    const sh = day.shabbat;
    if (!sh.candles) return null;
    const holidayName = sh.candlesLabel !== 'הדלקת נרות' ? (sh.parshaIsChag ? sh.parsha : '') : '';
    const head = sh.parshaIsChag ? esc(sh.parsha) : `פרשת ${esc(sh.parsha)}`;
    const isShabbat = sh.candlesDate && sh.candlesDate.getDay() === 5;
    return `
      <div class="hero">
        <section class="card side sb-card">${capsule(sh.candlesLabel)}${CANDLES_SVG}<div class="time">${fmtTime(sh.candles, s.tz, 'floor')}</div>
          <div class="sb-sub">${sh.candlesDate ? `יום ${['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][sh.candlesDate.getDay()]} · ${esc(renderHeb(sh.candlesDate))}` : ''}</div></section>
        <section class="card center">
          <div class="label">${isShabbat ? 'שבת קודש' : esc(holidayName || 'חג שמח')}</div>
          <div class="big">${head}</div>${flourish}
          ${sh.haftarah && !sh.parshaIsChag ? `<div class="label">הפטרה</div><div class="mid">${esc(sh.haftarah)}</div>` : ''}
          ${sh.specialShabbat.length || sh.mevarchim.length ? `<div class="chips" style="justify-content:center">${[...sh.specialShabbat, ...sh.mevarchim].map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
        </section>
        <section class="card side sb-card">${capsule(`צאת ${isShabbat ? 'השבת' : 'החג'}`)}${HAVDALAH_SVG}<div class="time">${fmtTime(sh.havdalah, s.tz, 'ceil')}</div>
          <div class="sb-sub">${s.havdalahMins ? `${s.havdalahMins} דק' אחרי השקיעה` : 'צאת הכוכבים · הבדלה'}</div></section>
      </div>`;
  },

  molad(ctx) {
    const sh = ctx.day.shabbat;
    if (!sh.mevarchim?.length || !sh.date) return null;
    let m; try { m = moladInfo(sh.date); } catch { return null; }
    const rcDays = m.rc.length > 1 ? `ביום ${m.rc[0].dayName} וביום ${m.rc[1].dayName}` : `ביום ${m.rc[0].dayName}`;
    return `${title(`שבת מברכים – חודש ${m.month}`)}
      <div class="grid g2 molad">
        <section class="card"><h3>המולד</h3><div class="body mo">
          <div class="mo-day">יום ${esc(m.dayName)}</div>
          <div class="time">${esc(m.time)}</div>
          ${m.chalakim ? `<div class="mo-ch">ו־${esc(m.chalakimHe)} חלקים</div>` : ''}
          <div class="mo-note">לפי שעון ירושלים</div></div></section>
        <section class="card"><h3>ראש חודש ${esc(m.month)}</h3><div class="body mo">
          <div class="mo-day">${esc(rcDays)}</div>
          ${m.rc.map((r) => `<div class="mo-rc"><b>${esc(r.heb)}</b> <span>${esc(r.civil)}</span></div>`).join('')}
          <div class="mo-note">יהי רצון שיחדש עלינו חודש טוב</div></div></section>
      </div>`;
  },

  holidays(ctx) {
    const groups = upcomingHolidaySchedules(ctx.data, ctx.s, ctx.now, 7);
    if (!groups.length) return null;
    const todayStr = ctx.day.civil.toDateString();
    const card = (g) => {
      const isToday = g.dates.some((d) => d.toDateString() === todayStr);
      const days = Math.round((g.dates[0] - new Date(ctx.day.civil.getFullYear(), ctx.day.civil.getMonth(), ctx.day.civil.getDate(), 12)) / 86400000);
      const when = isToday ? 'היום' : days === 1 ? 'מחר' : `בעוד ${days} ימים`;
      return `<section class="card hol"><h3>${esc(g.label)}</h3><div class="hol-when"><span class="pillw${isToday ? ' now' : ''}">${when}</span> ${esc(g.heb)}</div>
        <div class="rows${g.rows.length > 6 ? ' compact' : ''}">${g.rows.map((r) => `<div class="row"><div class="k">${esc(r.name)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</div><div class="v">${esc(r.time)}</div></div>`).join('')}</div></section>`;
    };
    const slides = [];
    for (let i = 0; i < groups.length; i += 3) {
      const chunk = groups.slice(i, i + 3);
      slides.push(`${title('תפילות החג')}<div class="grid hol-grid" style="grid-template-columns:repeat(${chunk.length},1fr)">${chunk.map(card).join('')}</div>`);
    }
    return slides.length === 1 ? slides[0] : slides;
  },

  neshama(ctx) {
    return annSlides(ctx, ctx.data.dedications || [], '');
  },

  announcements(ctx) {
    return annSlides(ctx, ctx.data.announcements || [], '');
  },

  memorials(ctx) {
    const { day } = ctx;
    const hd = day.hd;
    const list = ctx.data.memorials || [];
    const today = inHebrewRange(list, hd, hd, yahrzeitIn);
    const week = inHebrewRange(list, hd.next(), hd.add(7), yahrzeitIn);
    if (!today.length && !week.length) return null;
    const todayHtml = today.length ? `<div class="mem-today">${today.slice(0, 3).map((m) => `
      <section class="card mem">${candle}<div><div class="when">האזכרה היום · ${esc(renderHeb(m.hdate))}</div>
      <div class="who">${esc(m.name)} ז"ל</div>${m.by ? `<div class="by">${esc(m.by)}</div>` : ''}</div></section>`).join('')}</div>` : '';
    const weekHtml = week.length ? `<section class="card"><h3>אזכרות השבוע</h3><div class="mem-week">${week.map((m) => `
      <div class="row"><div class="k">${esc(m.name)} ז"ל</div><div class="v">${esc(renderHeb(m.hdate))}</div></div>`).join('')}</div></section>` : '';
    return `${title('לעילוי נשמת')}<div style="display:flex;flex-direction:column;gap:28px;flex:1">${todayHtml}${weekHtml}</div>`;
  },

  parnas(ctx) {
    const today = ctx.todayIso;
    const list = (ctx.data.parnasim || []).filter((p) => p.name && (!p.from || p.from <= today) && (!p.to || p.to >= today));
    if (!list.length) return null;
    const order = { day: 0, week: 1, month: 2, year: 3 };
    return list.sort((a, b) => order[a.period] - order[b.period]).map((p) => `
      <section class="card parnas"><div class="t">${esc(p.title || 'פרנס')}</div><div class="n">${esc(p.name)}</div>${flourish}<div class="x">${esc(p.text || '')}</div></section>`);
  },

  netz(ctx) {
    const { day, s, display } = ctx;
    const sr = day.zmanim.sunrise, shma = day.zmanim.shmaGRA;
    if (!sr || !shma) return null;
    const now = ctx.now;
    const win = +(display.netzWindowMin || 60) * 60000;
    let target, label, sub;
    if (now < sr && sr - now <= win) { target = sr; label = 'הנץ החמה בעוד'; sub = `הנץ היום: <b>${fmtTime(sr, s.tz, 'ceil')}</b>`; }
    else if (now >= sr && now < shma) { target = shma; label = 'סוף זמן קריאת שמע (גר"א) בעוד'; sub = `מג"א: <b>${fmtTime(day.zmanim.shmaMGA, s.tz, 'floor')}</b> · גר"א: <b>${fmtTime(shma, s.tz, 'floor')}</b>`; }
    else return null;
    const ms = Math.max(0, target - now);
    const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `<section class="card netz"><div class="lbl">${label}</div><div class="count">${h ? h + ':' : ''}${pad(m)}:${pad(sec)}</div><div class="sub">${sub}</div></section>`;
  },

  omer(ctx) {
    const { day } = ctx;
    const o = day.afterSunset ? day.omerTonight : day.omer;
    if (!o) return null;
    return `<section class="card omer"><div class="s">${day.afterSunset ? 'ספירת העומר הלילה' : 'ספירת העומר – היום'}</div>
      <div class="n">${o.day}</div><div class="t">${esc(o.text)}</div>${flourish}<div class="s">${esc(o.sefira)}</div>
      <div class="omer-bar">${Array.from({ length: 49 }, (_, i) => `<i class="${i < o.day ? 'on' : ''}"></i>`).join('')}</div></section>`;
  },

  images(ctx) {
    const t = ctx.todayIso;
    const list = (ctx.data.slides || []).filter((x) => x.url && x.enabled !== false && (!x.from || x.from <= t) && (!x.to || x.to >= t));
    if (!list.length) return null;
    return list.map((x) => {
      const u = esc(String(x.url).replace(/"/g, '%22'));
      const fit = ['contain', 'cover', 'width', 'scroll', 'zoom', 'full'].includes(x.fit) ? x.fit : 'contain';
      const secs = +x.seconds || ctx.display.defaultSeconds || 12;
      const size = Math.min(100, Math.max(40, +x.size || 100));
      const alt = esc(x.title || x.caption || '');
      const img = fit === 'scroll' ? `<div class="pan"><img src="${u}" alt="${alt}"></div>` : `<img src="${u}" alt="${alt}">`;
      return {
        key: x.id, seconds: +x.seconds || 0, full: fit === 'full',
        html: `${x.title && fit !== 'full' ? title(x.title) : ''}<section class="img-slide fit-${fit} bg-${x.bg || 'board'}" style="--dur:${secs}s;--size:${size / 100}">${img}${x.caption ? `<div class="cap">${esc(x.caption)}</div>` : ''}</section>`,
      };
    });
  },

  halacha(ctx) {
    if ((ctx.data.halachaSource || 'sa') === 'sa') {
      const h = cachedHalacha(ctx.todayIso, ctx.data.halachaStart || DEFAULT_START);
      if (h) {
        // סעיף ארוך במיוחד – מקצרים בסוף משפט ומפנים לספר
        // האורך נמדד בלי סימני הניקוד
        const plainLen = (t) => t.replace(/[\u0591-\u05C7]/g, '').length;
        const cutAt = (t, n) => { let c = 0, i = 0; for (; i < t.length && c < n; i++) if (!/[\u0591-\u05C7]/.test(t[i])) c++; while (i < t.length && /[\u0591-\u05C7]/.test(t[i])) i++; return t.slice(0, i); };
        let left = 1300, cut = false;
        const parts = [];
        for (const p of h.parts) {
          if (left <= 0) { cut = true; break; }
          let t = p.text;
          if (plainLen(t) > left) { const head = cutAt(t, left); const m = head.match(/^[\s\S]*[.:]/); t = (m ? m[0] : head) + ' …'; cut = true; }
          left -= plainLen(t); parts.push({ ...p, text: t });
        }
        const len = parts.reduce((a, p) => a + plainLen(p.text), 0);
        const size = len > 1100 ? 'xl' : len > 700 ? 'l' : len > 380 ? 'm' : 's';
        const body = parts.map((p) => (p.rema ? `<span class="rema"><b>הגה:</b> ${esc(p.text)}</span>` : esc(p.text))).join(' ');
        return `${title('הלכה יומית')}<section class="card halacha sa len-${size}">${h.title ? `<div class="t">${esc(h.title)}</div>` : ''}<div class="x">${body}</div><div class="src">${esc(h.source)}${cut ? ' · ההמשך בספר' : ''}</div></section>`;
      }
    }
    const list = ctx.data.halachot || [];
    if (!list.length) return null;
    const idx = Math.floor(ctx.day.civil.getTime() / 86400000) % list.length;
    const h = list[idx];
    return `${title('הלכה יומית')}<section class="card halacha"><div class="t">${esc(h.title)}</div><div class="x">${esc(h.text)}</div>${h.source ? `<div class="src">${esc(h.source)}</div>` : ''}</section>`;
  },

  lessons(ctx) {
    const { day, s } = ctx;
    const all = ctx.data.lessons || [];
    if (!all.length) return null;
    const nowMin = minutesOf(ctx.now, s.tz);
    // לכל שיעור: היום הקרוב שבו הוא מתקיים והשעה באותו יום
    const at = (off) => { try { const d = off ? computeDay(new Date(ctx.now.getTime() + off * 86400000), s) : day; return d; } catch { return null; } };
    const list = all.map((l) => {
      const days = l.weekdays?.length ? l.weekdays : [0, 1, 2, 3, 4, 5, 6];
      const next = (from) => { let o = from; while (o < from + 7 && !days.includes((day.civil.getDay() + o) % 7)) o++; return o; };
      const timeAt = (o) => { const d = at(o); try { return d ? resolveTime(l.time, d.civil, s, { candles: d.shabbat.candles, havdalah: d.shabbat.havdalah }) : null; } catch { return null; } };
      let off = next(0), min = timeAt(off);
      // שיעור של היום שכבר הסתיים (יותר משעה) – מציגים את הפעם הבאה
      if (off === 0 && min != null && min < nowMin - 60) { off = next(1); min = timeAt(off); }
      return { ...l, off, min, time: min == null ? '' : minToHhmm(min), days: daysLabel(l.weekdays), today: off === 0, dow: (day.civil.getDay() + off) % 7 };
    }).sort((a, b) => a.off - b.off || (a.min ?? 9999) - (b.min ?? 9999));
    const DN = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
    const when = (l) => (l.today ? 'היום' : l.off === 1 ? 'מחר' : l.dow === 6 ? 'בשבת' : `ביום ${DN[l.dow]}`);
    if (list.length <= 3) {
      return `${title('שיעורי תורה')}<div class="grid lessons-cards" style="grid-template-columns:repeat(${list.length},1fr)">${list.map((l) => `
        <section class="card lesson${l.today ? ' today' : ''}"><span class="when">${esc(when(l))}</span>
          <div class="lt">${esc(l.title)}</div>${l.teacher ? `<div class="lr">${esc(l.teacher)}</div>` : ''}
          <div class="time">${esc(l.time)}</div>${l.note ? `<div class="ln">${esc(l.note)}</div>` : ''}</section>`).join('')}</div>`;
    }
    const row = (l) => `<div class="row${l.today ? ' next' : ''}"><div class="k">${esc(l.title)}<small>${esc([l.teacher, l.days, l.note].filter(Boolean).join(' · '))}</small></div><div class="v">${esc(l.time)}</div></div>`;
    const slides = [];
    for (let i = 0; i < list.length; i += 12) {
      const chunk = list.slice(i, i + 12), half = Math.ceil(chunk.length / 2);
      slides.push(`${title('שיעורי תורה')}<div class="grid g2 lessons-rows">
        <section class="card"><div class="rows">${chunk.slice(0, half).map(row).join('')}</div></section>
        <section class="card"><div class="rows">${chunk.slice(half).map(row).join('')}</div></section></div>`);
    }
    return slides.length === 1 ? slides[0] : slides;
  },

  mishna(ctx) {
    const m = cachedMishna(ctx.day.hd);
    if (!m) return null;
    const plainLen = (t) => t.replace(/[֑-ׇ]/g, '').length;
    const cutAt = (t, n) => { let c = 0, i = 0; for (; i < t.length && c < n; i++) if (!/[֑-ׇ]/.test(t[i])) c++; while (i < t.length && /[֑-ׇ]/.test(t[i])) i++; const h = t.slice(0, i); const mm = h.match(/^[\s\S]*[.:]/); return (mm ? mm[0] : h) + ' …'; };
    const sizeOf = (len) => (len > 850 ? 'xl' : len > 520 ? 'l' : len > 260 ? 'm' : 's'); // יש גם כותרת סדר – מעט קטן יותר מההלכה
    const card = (items, src) => {
      let cut = false;
      const parts = items.map((x) => { let t = x.text; if (plainLen(t) > 1300) { t = cutAt(t, 1300); cut = true; } return { ...x, text: t }; });
      const len = parts.reduce((a, x) => a + plainLen(x.text) + 12, 0);
      return `${title('משנה יומית')}<section class="card halacha sa mishna len-${sizeOf(len)}"><div class="t">${m.seder ? `<span class="seder">סדר ${esc(m.seder)}</span>` : ''}מסכת ${esc(m.tractate)}</div>
        <div class="x">${parts.map((x) => `<p><span class="ml">פרק ${esc(x.perekHe)} משנה ${esc(x.mishnaHe)}</span> ${esc(x.text)}</p>`).join('')}</div>
        <div class="src">${esc(src)}${cut ? ' · ההמשך בספר' : ''}</div></section>`;
    };
    const total = m.items.reduce((a, x) => a + plainLen(x.text), 0);
    // שתי משניות קצרות – בשקופית אחת; ארוכות – כל משנה בשקופית משלה
    if (total <= 560) return card(m.items, m.source);
    return m.items.map((x) => card([x], `משנה · ${m.seder ? `סדר ${m.seder} · ` : ''}מסכת ${x.tractate} · פרק ${x.perekHe} · משנה ${x.mishnaHe}`));
  },

  learning(ctx) {
    const list = ctx.day.learning;
    if (!list.length) return null;
    // כל לימוד: תווית זהב (שם הלימוד) ומתחתיה סרט צבעוני עם המקום היום
    const cols = list.length > 3 ? 2 : 1;
    const per = Math.ceil(list.length / cols);
    const col = (items, off) => `<section class="card learn">${items.map((l, i) => `<div class="learn-item">${capsule(l.label)}${ribbon(esc(l.text), off + i + 1)}</div>`).join('')}</section>`;
    return `${title('הלימוד היומי')}<div class="grid" style="grid-template-columns:repeat(${cols},1fr)">${col(list.slice(0, per), 0)}${cols > 1 ? col(list.slice(per), per) : ''}</div>`;
  },

  birthdays(ctx) {
    const hd = ctx.day.hd;
    const list = inHebrewRange(ctx.data.birthdays || [], hd, hd.add(6), birthdayIn);
    if (!list.length) return null;
    return `${title('מזל טוב! ימי הולדת השבוע')}<div class="grid" style="grid-template-columns:repeat(${Math.min(list.length, 3)},1fr);align-content:center">
      ${list.map((b) => `<section class="card ann simcha" style="padding:50px 30px"><div class="t">${esc(b.name)}</div>${flourish}<div class="b">${esc(renderHeb(b.hdate))}${b.note ? ` · ${esc(b.note)}` : ''}</div></section>`).join('')}</div>`;
  },

  hilula(ctx) {
    const hd = ctx.day.hd;
    const fn = (y, it) => { try { return new HDate(+it.hebDay, it.hebMonth, y); } catch { return null; } };
    const list = inHebrewRange(ctx.data.hilulot || [], hd, hd.add(6), fn);
    if (!list.length) return null;
    return `${title('הילולא דצדיקיא')}<div class="grid" style="grid-template-columns:repeat(${Math.min(list.length, 3)},1fr);align-content:center">
      ${list.map((h) => `<section class="card" style="text-align:center;align-items:center;padding:50px 30px">${candle}<div style="font:900 60px/1.15 var(--display)">${esc(h.name)}</div><div style="font:700 34px var(--body);color:var(--ink-soft)">${h.hdate.isSameDate(hd) ? 'היום · ' : ''}${esc(renderHeb(h.hdate))}</div>${h.note ? `<div class="muted" style="font:600 28px var(--body)">${esc(h.note)}</div>` : ''}<div style="font:700 30px var(--display)">זכותו תגן עלינו</div></section>`).join('')}</div>`;
  },
};

/** שקופיות של הודעות (וגם של 'לעילוי נשמת') */
function annSlides(ctx, all, head) {

    const today = ctx.todayIso;
    const list = all.filter((a) => annActive(a, today, ctx.day.hd) && (a.title || a.body));
    if (!list.length) return null;
    const slides = [];
    const per = list.some((a) => (a.body || '').length > 140 || annBig(a)) ? 1 : 2;
    for (let i = 0; i < list.length; i += per) {
      slides.push(`${head}<div class="ann-grid">${list.slice(i, i + per).map((a) => `
        <section class="card ann ${esc(a.style || 'general')} ${annClasses(a)}"${annStyle(a)}>
          ${a.style === 'memorial' ? candle : ''}
          ${a.title ? `<div class="t">${esc(a.title)}</div>${a.style !== 'memorial' ? flourish : ''}` : ''}
          <div class="b">${annBody(a.body)}</div>
        </section>`).join('')}</div>`);
    }
    return slides;
  }

export const LIVE_SCREENS = new Set(['netz']);

/** פס הגולל */
export function tickerItems(ctx) {
  const { day, s, prayersToday, lessonsToday } = ctx;
  const items = [];
  const keys = ['sunrise', 'shmaGRA', 'sunset', 'tzeit'];
  for (const k of keys) items.push(`${ZMAN_LABEL[k]} <b>${fmtTime(day.zmanim[k], s.tz, ZMANIM.find((z) => z.key === k).round)}</b>`);
  if (day.shabbat.candles) items.push(`${day.shabbat.candlesLabel} <b>${fmtTime(day.shabbat.candles, s.tz, 'floor')}</b>`);
  if (day.shabbat.parsha) items.push(day.shabbat.parshaIsChag ? esc(day.shabbat.parsha) : `פרשת ${esc(day.shabbat.parsha)}`);
  for (const c of day.changes.slice(0, 3)) items.push(esc(c));
  for (const l of lessonsToday) items.push(`${esc(l.title)} <b>${l.timeStr}</b>`);
  for (const a of (ctx.data.announcements || []).filter((a) => annActive(a, ctx.todayIso, ctx.day.hd)).slice(0, 3)) if (a.title) items.push(esc(a.title));
  return items;
}

export function nextPrayer(ctx) {
  const nowMin = minutesOf(ctx.now, ctx.s.tz);
  return ctx.prayersToday.find((p) => p.min != null && p.min >= nowMin) || null;
}

export { daysLabel, hhmmToMin };
