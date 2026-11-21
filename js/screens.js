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
    // "ערבית (צאת הכוכבים)" → שם ראשי + תגית קטנה, כדי שהסוגריים לא יישברו לשורות
    const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(p.name.trim());
    const nm = m && m[1] ? m[1] : p.name, tag = m && m[1] ? m[2] : '';
    return `<div class="row ${cls}"><div class="k"><span class="nm">${esc(nm)}</span>${tag ? `<span class="pq">${esc(tag)}</span>` : ''}${p.note ? `<small>${esc(p.note)}</small>` : ''}</div><div class="v">${p.time}</div></div>`;
  });
  return `<div class="rows${compact ? ' compact' : ''}">${rows.join('')}</div>`;
}

/** במסך המשולב יש מקום מוגבל: כשיש הרבה תפילות – מוותרים על אלה שכבר עברו (משאירים את האחרונה שעברה) */
function upcomingFirst(list, nowMin, max) {
  if (list.length <= max) return list;
  const firstUp = list.findIndex((p) => p.min == null || p.min >= nowMin - 5);
  const start = firstUp < 0 ? Math.max(0, list.length - max) : Math.max(0, Math.min(firstUp - 1, list.length - max));
  return list.slice(start, start + max);
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

// ספר פתוח – לכרטיסי השיעורים
const BOOK_SVG = `<svg class="book" viewBox="0 0 120 70" aria-hidden="true"><defs><linearGradient id="bk-g" x1="0" x2="1"><stop offset="0" stop-color="#8f6a22"/><stop offset=".5" stop-color="#f6dd92"/><stop offset="1" stop-color="#9c7322"/></linearGradient></defs>
  <path d="M60 14C46 4 22 4 6 10v52c16-6 40-6 54 4 14-10 38-10 54-4V10C98 4 74 4 60 14z" fill="url(#bk-g)"/>
  <path d="M60 18C47 9 26 9 12 14v42c14-5 34-5 48 3 14-8 34-8 48-3V14C94 9 73 9 60 18z" fill="#fffaf0"/>
  <path d="M60 18v41" stroke="#b8902f" stroke-width="2"/><g stroke="#c9b48a" stroke-width="2" stroke-linecap="round"><path d="M20 24h30M20 32h30M20 40h26M70 24h30M70 32h30M70 40h26"/></g></svg>`;

// עוגת יום הולדת עם נר
const CAKE_SVG = `<svg class="cake" viewBox="0 0 120 110" aria-hidden="true"><defs><linearGradient id="ck-g" x1="0" x2="1"><stop offset="0" stop-color="#8f6a22"/><stop offset=".5" stop-color="#f6dd92"/><stop offset="1" stop-color="#9c7322"/></linearGradient><radialGradient id="ck-f"><stop offset="0" stop-color="#fff6c8"/><stop offset=".55" stop-color="#ffb84a"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="60" cy="104" rx="52" ry="6" fill="url(#ck-g)"/><rect x="16" y="66" width="88" height="36" rx="8" fill="#c73a55"/><path d="M16 74q11 10 22 0t22 0 22 0 22 0v-2a8 8 0 0 0-8-8H24a8 8 0 0 0-8 8z" fill="#fff4e0"/>
  <rect x="26" y="40" width="68" height="28" rx="7" fill="#f0c3cf"/><path d="M26 48q8.5 8 17 0t17 0 17 0 17 0v-2a7 7 0 0 0-7-7H33a7 7 0 0 0-7 7z" fill="#fff8ee"/>
  <rect x="56" y="18" width="8" height="22" rx="3" fill="#7fb6e6"/><circle cx="60" cy="10" r="10" fill="url(#ck-f)"/><path d="M60 3q5 6 0 12q-5-6 0-12z" fill="#fff3b8"/></svg>`;

// ספר תורה פתוח – לשקופית פרשת השבוע
const SCROLL_SVG = `<svg class="ps-art" viewBox="0 0 320 120" aria-hidden="true"><defs>
  <linearGradient id="ps-w" x1="0" x2="1"><stop offset="0" stop-color="#5a2f14"/><stop offset=".5" stop-color="#a8673a"/><stop offset="1" stop-color="#4a250f"/></linearGradient>
  <linearGradient id="ps-m" x1="0" x2="1"><stop offset="0" stop-color="#8f6a22"/><stop offset=".45" stop-color="#f3d98c"/><stop offset="1" stop-color="#9c7322"/></linearGradient>
  <linearGradient id="ps-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#efe2c4"/></linearGradient></defs>
  <path d="M58 22 Q160 10 262 22 L262 98 Q160 86 58 98 Z" fill="url(#ps-p)" stroke="#c9a85a" stroke-width="2"/>
  <g stroke="#7b6a4a" stroke-width="3" stroke-linecap="round" opacity=".55">
    ${[0, 1, 2, 3, 4].map((i) => `<line x1="76" y1="${34 + i * 13}" x2="150" y2="${32 + i * 13}"/><line x1="170" y1="${32 + i * 13}" x2="244" y2="${34 + i * 13}"/>`).join('')}</g>
  ${[40, 280].map((x) => `<rect x="${x - 6}" y="2" width="12" height="18" rx="5" fill="url(#ps-m)"/><rect x="${x - 6}" y="100" width="12" height="18" rx="5" fill="url(#ps-m)"/>
  <rect x="${x - 18}" y="14" width="36" height="92" rx="16" fill="url(#ps-w)"/><rect x="${x - 18}" y="16" width="36" height="6" rx="3" fill="url(#ps-m)"/><rect x="${x - 18}" y="98" width="36" height="6" rx="3" fill="url(#ps-m)"/>`).join('')}
</svg>`;

// ---------- המסכים ----------

function greetingFor(ctx) {
  const { day, display } = ctx;
  // בלילה (אחרי צאת הכוכבים) – לפי היום העברי הבא
  const hd = day.night ? day.next.hd : day.hd;
  const descs = (day.night ? day.holidaysTomorrow : day.holidays).map((e) => e.getDesc()).join('|');
  const tags = day.night ? day.nightTags : day.tags;
  const m = hd.getMonth(), d = hd.getDate();
  const sh = day.shabbat;
  const parsha = sh.parshaIsChag ? sh.parsha : `פרשת ${sh.parsha}`;
  // חגים "קטנים" – גוברים גם על ברכת השבת (למשל יום ירושלים או ראש חודש ביום שישי)
  const special = () => {
    if (day.holiday === 'tu-bishvat') return { kind: 'shavuot', title: 'ט"ו בשבט שמח', sub: 'ראש השנה לאילנות' };
    if (day.holiday === 'lag-baomer') return { kind: 'torah', title: 'ל"ג בעומר שמח', sub: 'הילולא דרבי שמעון בר יוחאי' };
    if (day.holiday === 'yom-haatzmaut') return { kind: 'torah', title: 'חג עצמאות שמח', sub: 'ראשית צמיחת גאולתנו' };
    if (day.holiday === 'yom-yerushalayim') return { kind: 'torah', title: 'יום ירושלים שמח', sub: 'ירושלים הבנויה כעיר שחוברה לה יחדיו' };
    return null;
  };
  if (/Erev Rosh Hashana/.test(descs)) return { kind: 'yamim-noraim', title: 'שנה טובה ומתוקה', sub: 'כתיבה וחתימה טובה' };
  switch (day.season) {
    case 'chanuka': {
      // הנר הראשון מודלק בערב כ"ד כסלו; טבת באותה שנה עברית כמו כסלו
      const n = day.hd.deltaDays(new HDate(24, 'Kislev', day.hd.getFullYear()));
      const lit = Math.min(8, Math.max(1, day.afterSunset ? n + 1 : n));
      const nights = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני'];
      return { kind: 'chanuka', lit, title: 'חנוכה שמח', sub: `נר ${nights[lit]} של חנוכה${lit === 8 ? ' · זאת חנוכה' : ''}` };
    }
    case 'purim': return { kind: 'purim', title: 'פורים שמח', sub: 'משלוח מנות איש לרעהו ומתנות לאביונים' };
    case 'pesach': return { kind: 'pesach', title: 'חג כשר ושמח', sub: /Chol/.test(descs) ? 'מועדים לשמחה' : 'זמן חרותנו' };
    case 'shavuot': return { kind: 'shavuot', title: 'חג שבועות שמח', sub: 'זמן מתן תורתנו' };
    case 'sukkot': return /Shmini|Simchat/.test(descs) ? { kind: 'simchat-torah', title: 'שמחת תורה שמחה', sub: 'שישו ושמחו בשמחת תורה' } : { kind: 'sukkot', title: 'חג סוכות שמח', sub: 'זמן שמחתנו · מועדים לשמחה' };
    case 'yamim-noraim':
      if (m === 7 && d >= 3) return { kind: 'yamim-noraim', title: 'גמר חתימה טובה', sub: 'עשרת ימי תשובה' };
      return { kind: 'yamim-noraim', title: 'שנה טובה ומתוקה', sub: 'כתיבה וחתימה טובה' };
    case 'shabbat':
      if (special()) return special();
      if (day.dow === 5 && !day.night && tags.includes('rosh-chodesh')) return { kind: 'torah', title: 'חודש טוב', sub: day.events.filter((e) => /ראש חודש/.test(e)).join(' · ') || 'ראש חודש' };
      return { kind: 'shabbat', title: day.dow === 6 || day.dow === 5 ? 'שבת שלום ומבורך' : 'שבת שלום', sub: parsha };
    default:
      if (special()) return special();
      if (tags.includes('rosh-chodesh')) return { kind: 'torah', title: 'חודש טוב', sub: (day.night ? day.next.events : day.events).filter((e) => /ראש חודש/.test(e)).join(' · ') || 'ראש חודש' };
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


/* ---------- מסך כניסה חגיגי לשבת (גרסה 2 – בתצוגה מקדימה: ?greet=v2) ---------- */
const GOLD_DEFS = `<defs>
  <linearGradient id="sg-gold" x1="0" x2="1"><stop offset="0" stop-color="#8a6420"/><stop offset=".22" stop-color="#e9cd84"/><stop offset=".5" stop-color="#fff1c2"/><stop offset=".78" stop-color="#d9b25c"/><stop offset="1" stop-color="#7d5a1c"/></linearGradient>
  <linearGradient id="sg-goldv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c2"/><stop offset=".5" stop-color="#d9b25c"/><stop offset="1" stop-color="#8a6420"/></linearGradient>
  <linearGradient id="sg-wax" x1="0" x2="1"><stop offset="0" stop-color="#e9e2d2"/><stop offset=".45" stop-color="#fffdf6"/><stop offset="1" stop-color="#d8cfbb"/></linearGradient>
  <radialGradient id="sg-halo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".35" stop-color="#ffc861" stop-opacity=".45"/><stop offset="1" stop-color="#ff9a2a" stop-opacity="0"/></radialGradient>
  <radialGradient id="sg-flame" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#fff2b0"/><stop offset=".7" stop-color="#ffb43c"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient>
</defs>`;
const SG_CANDLE = `<svg class="sg-candle" viewBox="0 0 160 600" aria-hidden="true">${GOLD_DEFS}
  <circle class="sg-halo" cx="80" cy="70" r="78" fill="url(#sg-halo)"/>
  <g class="sg-fl"><path d="M80 28c14 20 18 34 10 48-4 7-16 8-20 0-8-14-4-28 10-48z" fill="url(#sg-flame)"/><path d="M80 50c5 9 6 15 2 21-1 3-5 3-6 0-2-6-1-12 4-21z" fill="#fff" opacity=".9"/></g>
  <line x1="80" y1="82" x2="80" y2="92" stroke="#3a2a12" stroke-width="2.5"/>
  <rect x="64" y="90" width="32" height="200" rx="6" fill="url(#sg-wax)"/><path d="M66 96c4 10 2 22 5 30" stroke="#fff" stroke-width="3" opacity=".7" fill="none"/>
  <path d="M44 290h72l-8 16H52z" fill="url(#sg-gold)"/><ellipse cx="80" cy="290" rx="40" ry="7" fill="url(#sg-gold)"/>
  <path d="M60 306h40l-6 24H66z" fill="url(#sg-gold)"/><circle cx="80" cy="346" r="17" fill="url(#sg-gold)"/>
  <path d="M70 362h20l4 90H66z" fill="url(#sg-gold)"/><circle cx="80" cy="410" r="11" fill="url(#sg-gold)"/>
  <ellipse cx="80" cy="458" rx="22" ry="8" fill="url(#sg-gold)"/>
  <path d="M62 462h36l26 92H36z" fill="url(#sg-gold)"/><path d="M80 474l26 74" stroke="#fff4cc" stroke-width="2" opacity=".5"/>
  <ellipse cx="80" cy="560" rx="62" ry="15" fill="url(#sg-gold)"/><ellipse cx="80" cy="556" rx="50" ry="8" fill="#fff1c2" opacity=".35"/>
</svg>`;
const SG_ARCH = `<svg class="sg-arch" viewBox="0 0 1400 820" preserveAspectRatio="none" aria-hidden="true">${GOLD_DEFS}
  <defs><radialGradient id="sg-velvet" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#5a1430" stop-opacity=".92"/><stop offset=".65" stop-color="#2c0918" stop-opacity=".9"/><stop offset="1" stop-color="#14040b" stop-opacity=".85"/></radialGradient>
  <pattern id="sg-dam" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M28 6l5 9h10l-5 9 5 9H33l-5 9-5-9H13l5-9-5-9h10z" fill="none" stroke="#f3d892" stroke-opacity=".07" stroke-width="1.2"/></pattern></defs>
  <path d="M40 820V330C40 150 330 40 700 40s660 110 660 290v490z" fill="url(#sg-velvet)"/>
  <path d="M40 820V330C40 150 330 40 700 40s660 110 660 290v490z" fill="url(#sg-dam)"/>
  <path d="M40 820V330C40 150 330 40 700 40s660 110 660 290v490" fill="none" stroke="url(#sg-gold)" stroke-width="9"/>
  <path d="M66 820V334C66 172 346 66 700 66s634 106 634 268v486" fill="none" stroke="url(#sg-gold)" stroke-width="2.5" stroke-dasharray="1 9" stroke-linecap="round"/>
  <path d="M84 820V338C84 186 356 84 700 84s616 102 616 254v482" fill="none" stroke="url(#sg-gold)" stroke-width="3"/>
</svg>`;
const SG_CROWN = `<svg class="sg-crown" viewBox="0 0 220 120" aria-hidden="true">${GOLD_DEFS}
  <path d="M30 96 18 34l46 34 46-56 46 56 46-34-12 62z" fill="url(#sg-gold)" stroke="#6e4f17" stroke-width="2"/>
  <rect x="26" y="96" width="168" height="16" rx="6" fill="url(#sg-gold)" stroke="#6e4f17" stroke-width="2"/>
  <circle cx="18" cy="30" r="8" fill="url(#sg-gold)"/><circle cx="110" cy="10" r="9" fill="url(#sg-gold)"/><circle cx="202" cy="30" r="8" fill="url(#sg-gold)"/>
  <circle cx="110" cy="64" r="9" fill="#9b1d3d"/><circle cx="66" cy="78" r="6" fill="#1f4f8a"/><circle cx="154" cy="78" r="6" fill="#1f4f8a"/>
  <g fill="#fff6d6"><circle cx="60" cy="104" r="3"/><circle cx="90" cy="104" r="3"/><circle cx="130" cy="104" r="3"/><circle cx="160" cy="104" r="3"/></g>
</svg>`;
const SG_VINE = `<svg class="sg-vine" viewBox="0 0 520 40" aria-hidden="true">${GOLD_DEFS}
  <path d="M10 20h190M320 20h190" stroke="#e2bd65" stroke-width="2.5"/>
  <path d="M200 20c20-18 40-18 60 0s40 18 60 0" fill="none" stroke="url(#sg-gold)" stroke-width="3"/>
  <path d="M260 4l9 16-9 16-9-16z" fill="url(#sg-gold)"/><circle cx="215" cy="20" r="4" fill="url(#sg-gold)"/><circle cx="305" cy="20" r="4" fill="url(#sg-gold)"/>
  <circle cx="10" cy="20" r="5" fill="url(#sg-gold)"/><circle cx="510" cy="20" r="5" fill="url(#sg-gold)"/>
</svg>`;
const SILVER_DEFS = `<defs><linearGradient id="sg-silver" x1="0" x2="1"><stop offset="0" stop-color="#7d8794"/><stop offset=".25" stop-color="#dfe5ec"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".78" stop-color="#b9c2cd"/><stop offset="1" stop-color="#6d7783"/></linearGradient></defs>`;
const SG_CANDLE_SILVER = SG_CANDLE.replace('<svg class="sg-candle"', '<svg class="sg-candle silver"').replace(/url\(#sg-gold\)/g, 'url(#sg-silver)').replace('</defs>`', '</defs>`').replace(GOLD_DEFS, GOLD_DEFS + SILVER_DEFS);
const SG_STONE = `<svg class="sg-arch" viewBox="0 0 1400 820" preserveAspectRatio="none" aria-hidden="true">${GOLD_DEFS}
  <defs><pattern id="sg-blocks" width="120" height="60" patternUnits="userSpaceOnUse"><rect width="120" height="60" fill="#e4d5b2"/><path d="M0 0h120M0 30h120M40 0v30M100 30v30M0 60h120" stroke="#b39d70" stroke-width="3"/><rect x="6" y="5" width="28" height="20" fill="#efe3c6" opacity=".55"/><rect x="48" y="35" width="44" height="20" fill="#d8c69c" opacity=".6"/></pattern>
  <radialGradient id="sg-night" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#1e2f62"/><stop offset=".7" stop-color="#0f1a3d"/><stop offset="1" stop-color="#070d22"/></radialGradient>
  <pattern id="sg-stars" width="90" height="90" patternUnits="userSpaceOnUse"><circle cx="12" cy="20" r="1.6" fill="#fff" opacity=".7"/><circle cx="60" cy="48" r="1.1" fill="#fff" opacity=".5"/><circle cx="34" cy="76" r="1.3" fill="#ffe9b0" opacity=".6"/></pattern></defs>
  <path d="M30 820V330C30 140 330 26 700 26s670 114 670 304v490z" fill="url(#sg-blocks)"/>
  <path d="M30 820V330C30 140 330 26 700 26s670 114 670 304v490" fill="none" stroke="#9c8558" stroke-width="5"/>
  <path d="M110 820V344C110 196 370 104 700 104s590 92 590 240v476z" fill="url(#sg-night)"/>
  <path d="M110 820V344C110 196 370 104 700 104s590 92 590 240v476z" fill="url(#sg-stars)"/>
  <path d="M110 820V344C110 196 370 104 700 104s590 92 590 240v476" fill="none" stroke="url(#sg-gold)" stroke-width="7"/>
  <path d="M660 30h80l-12 70h-56z" fill="#d7c497" stroke="#9c8558" stroke-width="4"/>
  <path d="M700 44l9 15h17l-9 15 9 15h-17l-9 15-9-15h-17l9-15-9-15h17z" fill="none" stroke="#8a6420" stroke-width="3"/>
</svg>`;
const SG_SCROLL = `<svg class="sg-arch scroll" viewBox="0 0 1400 820" preserveAspectRatio="none" aria-hidden="true">${GOLD_DEFS}
  <defs><linearGradient id="sg-parch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf3dc"/><stop offset=".5" stop-color="#f3e6c2"/><stop offset="1" stop-color="#e8d5a6"/></linearGradient>
  <linearGradient id="sg-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3d1c"/><stop offset=".5" stop-color="#a8683a"/><stop offset="1" stop-color="#4f2a11"/></linearGradient></defs>
  <rect x="90" y="56" width="1220" height="720" fill="url(#sg-parch)"/>
  <rect x="90" y="56" width="1220" height="720" fill="none" stroke="#c9a85c" stroke-width="3"/>
  <rect x="122" y="88" width="1156" height="656" fill="none" stroke="url(#sg-gold)" stroke-width="5"/>
  <rect x="136" y="102" width="1128" height="628" fill="none" stroke="#c9a85c" stroke-width="1.5" stroke-dasharray="2 8" stroke-linecap="round"/>
  <rect x="60" y="22" width="1280" height="44" rx="22" fill="url(#sg-wood)"/><rect x="60" y="766" width="1280" height="44" rx="22" fill="url(#sg-wood)"/>
  <g fill="url(#sg-gold)"><circle cx="44" cy="44" r="30"/><circle cx="1356" cy="44" r="30"/><circle cx="44" cy="788" r="30"/><circle cx="1356" cy="788" r="30"/></g>
</svg>`;
const SG_STAR = `<svg class="sg-star" viewBox="0 0 600 600" aria-hidden="true">${GOLD_DEFS}
  <g fill="none" stroke="url(#sg-gold)" stroke-width="4" opacity=".2"><path d="M300 30 534 435H66z"/><path d="M300 570 66 165h468z"/><circle cx="300" cy="300" r="282" stroke-width="3"/><circle cx="300" cy="300" r="268" stroke-width="1.5" stroke-dasharray="2 10"/></g>
</svg>`;
const medal = (k, v, sub) => `<div class="sg-medal${/\d/.test(v) ? '' : ' txt'}"><svg viewBox="0 0 300 300" aria-hidden="true">${GOLD_DEFS}<circle cx="150" cy="150" r="140" fill="url(#sg-gold)"/><circle cx="150" cy="150" r="126" fill="#0f1a3d"/><circle cx="150" cy="150" r="116" fill="none" stroke="url(#sg-gold)" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/></svg>
  <div class="sg-mt"><span>${esc(k)}</span><b>${esc(v)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;
/** וריאציות: v2 שער בורדו · v3 אבן ירושלמית · v4 מגילה · v5 מדליונים */
function shabbatGreetV2(ctx, gr, v = 'v2') {
  const { day, s } = ctx;
  const sh = day.shabbat;
  const isShabbatNow = day.dow === 6 || (day.dow === 5 && day.afterSunset);
  const times = [];
  if (sh.candles && !isShabbatNow) times.push(['הדלקת נרות', fmtTime(sh.candles, s.tz, 'floor')]);
  if (sh.havdalah) times.push(['צאת השבת', fmtTime(sh.havdalah, s.tz, 'ceil')]);
  const chips = [...(sh.specialShabbat || []), ...(sh.mevarchim || [])];
  let frame = SG_ARCH, side = SG_CANDLE, sides = '';
  if (v === 'v3') frame = SG_STONE;
  if (v === 'v4') { frame = SG_SCROLL; side = SG_CANDLE_SILVER; }
  if (v === 'v5') {
    frame = SG_STAR;
    const left = times.find((t) => t[0] === 'צאת השבת');
    const right = times.find((t) => t[0] === 'הדלקת נרות');
    sides = `<div class="sg-side r">${right ? medal(right[0], right[1], 'ערב שבת') : medal('שבת קודש', sh.date ? renderHeb(sh.date).replace(/ תש\S+$/, '') : '', '')}</div><div class="sg-side l">${left ? medal(left[0], left[1], 'הבדלה') : ''}</div>`;
  } else sides = `<div class="sg-side r">${side}</div><div class="sg-side l">${side}</div>`;
  const showTimes = v !== 'v5' && times.length;
  return `<div class="sg2 sg-${v}${chips.length ? ' has-chips' : ''}">
    ${frame}
    ${sides}
    <div class="sg-mid">
      <div class="sg-k">לכבוד שבת קודש</div>
      <div class="sg-t">${esc(gr.title)}</div>
      ${SG_VINE}
      <div class="sg-ribbon"><span>${esc(gr.sub || '')}</span></div>
      ${chips.length ? `<div class="sg-chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
      ${showTimes ? `<div class="sg-times">${times.map(([k, val]) => `<div><span>${k}</span><b>${val}</b></div>`).join('<i></i>')}</div>` : ''}
      ${s.name ? `<div class="sg-n">${esc(s.name)}</div>` : ''}
    </div>
  </div>`;
}
const GREET_V = (() => { try { return new URLSearchParams(location.search).get('greet'); } catch { return null; } })();

export const SCREENS = {
  greeting(ctx) {
    const gr = greetingFor(ctx);
    if (!gr) return null;
    let img = '';
    // ספר התורה במסך הכניסה – תמונה אמיתית (img/torah.webp); בחגים – האיורים המצוירים
    if (gr.kind === 'torah') return welcomeHtml(ctx, gr);
    { const gv = GREET_V || ctx.display.shabbatGreet || 'v2'; if (gr.kind === 'shabbat' && /^v[2-5]$/.test(gv || '')) return shabbatGreetV2(ctx, gr, gv); } // ימים רגילים: מסך כניסה בלי איור – מסגרת מעוטרת ומידע להיום
    try { img = greetingArt(gr.kind, { lit: gr.lit }); } catch { /* */ }
    return `<div class="greet">
      ${img ? `<img class="art" src="${img}" alt="">` : ''}
      <div class="words"><div class="gt">${esc(gr.title)}</div>${flourish}<div class="gs">${esc(gr.sub || '')}</div>
      ${ctx.s.name ? `<div class="gn">${esc(ctx.s.name)}</div>` : ''}</div></div>`;
  },

  combined(ctx) {
    const { day, s, prayersToday, lessonsToday } = ctx;
    const nowMin = minutesOf(ctx.now, s.tz);
    const tag = day.night ? '' : dayLabelForSchedule(day);
    const keys = (s.zmanimShown || []).slice(0, 9);
    const extra = [];
    if (day.fast.length) extra.push(...day.fast.map((f) => ({ t: f.label, v: fmtTime(f.time, s.tz, f.label === 'סוף הצום' ? 'ceil' : 'floor') })));
    if (day.omer) extra.push({ t: `היום ${day.omer.day} לעומר` });
    return `
      <div class="grid g-combined">
        <section class="card"><h3>תפילות היום ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</h3>${prayerRows(upcomingFirst(prayersToday, nowMin, 8), nowMin)}</section>
        <section class="card"><h3>זמני היום</h3>${zmanimRows(ctx, keys, true)}</section>
        <section class="card"><h3>${day.afterSunset ? 'בתפילה מהערב' : 'בתפילה היום'}</h3><div class="body changes">${changesHtml(day.changes, extra)}</div></section>
      </div>`;
  },

  prayers(ctx) {
    const { day, s, weekly, prayersToday } = ctx;
    const nowMin = minutesOf(ctx.now, s.tz);
    // עמודת "היום" – רק כשהיום מיוחד, לוח התפילות שלו באמת שונה מהרגיל, והיום עוד לא נגמר (צאת הכוכבים)
    const sig = (l) => (l || []).map((p) => `${p.name}|${p.time}`).join(';');
    const special = !day.night && ['yomtov', 'fast', 'chol-hamoed', 'rosh-chodesh', 'erev-yomtov', 'chanuka'].some((t) => day.tags.includes(t))
      && sig(prayersToday) !== sig(ctx.prayersRegular);
    const cols = [];
    const weight = (l) => l.reduce((a, p) => a + 1 + (p.note ? 0.45 : 0) + (p.name.length > 16 ? 0.35 : 0), 0);
    if (special) cols.push({ w: weight(prayersToday), html: `<section class="card"><h3>היום <span class="tag">${esc(dayLabelForSchedule(day))}</span></h3>${prayerRows(prayersToday, nowMin)}</section>` });
    cols.push({ w: weight(weekly.weekday), html: `<section class="card"><h3>ימות החול</h3>${prayerRows(weekly.weekday, null, false)}</section>` });
    cols.push({ w: weight(weekly.friday), html: `<section class="card"><h3>ערב שבת</h3>${prayerRows(weekly.friday, null, false)}</section>` });
    cols.push({ w: weight(weekly.shabbat), html: `<section class="card"><h3>שבת קודש</h3>${prayerRows(weekly.shabbat, null, false)}</section>` });
    const grid = (cs) => `${title('זמני התפילות')}<div class="grid g${cs.length >= 3 ? 3 : 2}" style="grid-template-columns:repeat(${cs.length},1fr)">${cs.map((c) => c.html).join('')}</div>`;
    // הרבה תפילות: מפצלים לשתי שקופיות (חול / שבת) – כרטיסים רחבים יותר, והשורות נשארות קריאות
    const maxW = Math.max(...cols.map((c) => c.w));
    const crowded = cols.length >= 4 ? maxW > 6.5 : maxW > 7.5;
    if (!crowded) return grid(cols);
    const n = cols.length - 2;
    return [{ html: grid(cols.slice(0, n)), key: 'weekday' }, { html: grid(cols.slice(n)), key: 'shabbat' }];
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
        <section class="card center ps">
          <div class="ps-date">${isShabbat ? 'שבת קודש' : esc(holidayName || 'חג שמח')}${sh.date ? ` · ${esc(renderHeb(sh.date).replace(/ תש\S+$/, ''))}` : ''}</div>
          ${SCROLL_SVG}
          ${sh.parshaIsChag ? '' : '<div class="ps-k">פרשת השבוע</div>'}
          <div class="ps-name${sh.parsha.length > 14 ? ' long' : sh.parsha.length > 9 ? ' mid' : ''}">${sh.parshaIsChag ? head : esc(sh.parsha)}</div>
          ${flourish}
          ${sh.haftarah && !sh.parshaIsChag ? `<div class="ps-haf"><span>הפטרה</span><b>${esc(sh.haftarah)}</b></div>` : ''}
          ${sh.specialShabbat.length || sh.mevarchim.length ? `<div class="ps-chips">${[...sh.specialShabbat, ...sh.mevarchim].map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
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
    const all = [...today.map((m) => ({ ...m, isToday: true })), ...week].slice(0, 8);
    const cols = Math.min(all.length, 4);
    return `${title('לעילוי נשמת')}<div class="mem-grid${all.length > 4 ? ' many' : ''}" style="--cols:${cols}">${all.map((m) => `
      <section class="card mem-card${m.isToday ? ' is-today' : ''}">${candle}
        <div class="when">${m.isToday ? 'האזכרה היום' : 'אזכרה'} · ${esc(renderHeb(m.hdate))}</div>
        <div class="who">${esc(m.name)} ז״ל</div>${flourish}
        ${m.by ? `<div class="by">${esc(m.by)}</div>` : '<div class="by">תנצב״ה</div>'}</section>`).join('')}</div>`;
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
    const sr = day.zmanim.sunrise, gra = day.zmanim.shmaGRA, mga = day.zmanim.shmaMGA;
    if (!sr) return null;
    const now = ctx.now;
    const win = +(display.netzWindowMin || 60) * 60000;
    const which = display.shmaZman || 'gra';
    const shmaWin = +(display.shmaWindowMin || 0) * 60000; // 0 = מהנץ ועד סוף הזמן
    let target, label, sub;
    const shmaSub = `מג"א: <b>${fmtTime(mga, s.tz, 'floor')}</b> · גר"א: <b>${fmtTime(gra, s.tz, 'floor')}</b>`;
    if (display.netzCountdown !== false && now < sr && sr - now <= win) { target = sr; label = 'הנץ החמה בעוד'; sub = `הנץ היום: <b>${fmtTime(sr, s.tz, 'ceil')}</b>`; }
    else if (display.shmaCountdown !== false) {
      const list = (which === 'mga' ? [mga] : which === 'both' ? [mga, gra] : [gra]).filter(Boolean);
      const t = list.find((x) => now < x);
      if (!t || now < (shmaWin ? t - shmaWin : sr)) return null;
      target = t; label = `סוף זמן קריאת שמע (${t === mga ? 'מג"א' : 'גר"א'}) בעוד`; sub = shmaSub;
    } else return null;
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
      const sx = Math.min(3, Math.max(1, (+x.stretch || 100) / 100));
      const secs = +x.seconds || ctx.display.defaultSeconds || 12;
      const size = Math.min(100, Math.max(40, +x.size || 100));
      const alt = esc(x.title || x.caption || '');
      const img = fit === 'scroll' ? `<div class="pan"><img src="${u}" alt="${alt}"></div>` : `<img src="${u}" alt="${alt}">`;
      return {
        key: x.id, seconds: +x.seconds || 0, full: fit === 'full',
        html: `${x.title && fit !== 'full' ? title(x.title) : ''}<section class="img-slide fit-${fit} bg-${x.bg || 'board'}" style="--dur:${secs}s;--size:${size / 100};--sx:${sx}">${img}${x.caption ? `<div class="cap">${esc(x.caption)}</div>` : ''}</section>`,
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
    const dayKey = (l) => (l.weekdays?.length ? Math.min(...l.weekdays) : -1);
    const list = all.map((l) => {
      const days = l.weekdays?.length ? l.weekdays : [0, 1, 2, 3, 4, 5, 6];
      const next = (from) => { let o = from; while (o < from + 7 && !days.includes((day.civil.getDay() + o) % 7)) o++; return o; };
      const timeAt = (o) => { const d = at(o); try { return d ? resolveTime(l.time, d.civil, s, { candles: d.shabbat.candles, havdalah: d.shabbat.havdalah }) : null; } catch { return null; } };
      let off = next(0), min = timeAt(off);
      // שיעור של היום שכבר הסתיים (יותר משעה) – מציגים את הפעם הבאה
      if (off === 0 && min != null && min < nowMin - 60) { off = next(1); min = timeAt(off); }
      return { ...l, off, min, time: min == null ? '' : minToHhmm(min), days: daysLabel(l.weekdays), today: off === 0, dow: (day.civil.getDay() + off) % 7 };
    // סדר קבוע לפי ימי השבוע (ראשון ← שבת, מימין לשמאל), ובתוך היום לפי השעה
    }).sort((a, b) => dayKey(a) - dayKey(b) || (a.min ?? 9999) - (b.min ?? 9999));
    const DN = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
    const when = (l) => (l.today ? 'היום' : l.dow === 6 ? 'בשבת' : `ביום ${DN[l.dow]}`);
    if (list.length <= 3) {
      return `${title('שיעורי תורה')}<div class="grid lessons-cards" style="grid-template-columns:repeat(${list.length},1fr)">${list.map((l) => `
        <section class="card lesson${l.today ? ' today' : ''}">${BOOK_SVG}<span class="when">${esc(when(l))}</span>
          <div class="lt">${esc(l.title)}</div>${l.teacher ? `<div class="lr">${esc(l.teacher)}</div>` : ''}${flourish}
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
    const cols = Math.min(list.length, 4);
    return `${title('מזל טוב! ימי הולדת השבוע')}<div class="mem-grid bday-grid${list.length > 4 ? ' many' : ''}" style="--cols:${cols}">
      ${list.slice(0, 8).map((b) => `<section class="card bday-card${b.hdate.isSameDate(hd) ? ' is-today' : ''}">${CAKE_SVG}<div class="when">${b.hdate.isSameDate(hd) ? 'היום!' : esc(renderHeb(b.hdate))}</div><div class="who">${esc(b.name)}</div>${flourish}<div class="by">${b.note ? esc(b.note) : 'עד מאה ועשרים'}</div></section>`).join('')}</div>`;
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
  // פרשת השבוע מוצגת תמיד בכותרת העליונה – לא חוזרים עליה בפס
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
