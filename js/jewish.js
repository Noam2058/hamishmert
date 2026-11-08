// מנוע לוח השנה העברי: זמני היום, תאריך, פרשה, הפטרה, חגים ושינויים בתפילה.
import {
  HDate, Zmanim, GeoLocation, Location, HebrewCalendar, getSedra, DailyLearning, flags, Molad,
  gematriya, getLeyningOnDate,
  DafYomiEvent, MishnaYomiIndex, MishnaYomiEvent, NachYomiIndex, NachYomiEvent,
  dailyRambam1, DailyRambamEvent, chofetzChaim, ChofetzChaimEvent, dailyPsalms, PsalmsEvent,
} from './lib.js';

// עברית בלי ניקוד, וגם הסרת ניקוד שנשאר (למשל בשמות פרשות)
const HE = 'he-x-NoNikud';
export const noNikud = (t) => String(t ?? '').replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');

// ---------- עזרי זמן ----------

export function tzParts(date, tz) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(date);
  const o = {};
  for (const x of p) o[x.type] = x.value;
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: +o.year, m: +o.month, d: +o.day,
    hh: +o.hour % 24, mm: +o.minute, ss: +o.second, dow: days[o.weekday],
  };
}

/** תאריך אזרחי (בצהריים) במיקום בית הכנסת, כדי שחישובי היום לא יזוזו בגלל אזור זמן */
export function civilNoon(date, tz) {
  const p = tzParts(date, tz);
  return new Date(p.y, p.m - 1, p.d, 12, 0, 0);
}

export function fmtTime(date, tz, mode = 'nearest') {
  if (!date || isNaN(date)) return '--:--';
  let t = date.getTime();
  const sec = tzParts(date, tz).ss;
  if (mode === 'ceil' && sec > 0) t += (60 - sec) * 1000;
  else if (mode === 'nearest' && sec >= 30) t += (60 - sec) * 1000;
  const p = tzParts(new Date(t), tz);
  return `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`;
}

export function minutesOf(date, tz) {
  const p = tzParts(date, tz);
  return p.hh * 60 + p.mm + p.ss / 60;
}

export const hhmmToMin = (s) => {
  const [h, m] = String(s || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const minToHhmm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const weekdayHe = (dow) => (dow === 6 ? 'שבת קודש' : `יום ${WEEKDAYS_HE[dow]}`);

// ---------- זמני היום ----------

export const ZMANIM = [
  { key: 'alot', label: 'עלות השחר', fn: (z) => z.alotHaShachar(), round: 'ceil' },
  { key: 'misheyakir', label: 'טלית ותפילין', fn: (z) => z.misheyakir(), round: 'ceil' },
  { key: 'sunrise', label: 'הנץ החמה', fn: (z) => z.sunrise(), round: 'ceil' },
  { key: 'shmaMGA', label: 'סוף זמן ק"ש מג"א', fn: (z) => z.sofZmanShmaMGA(), round: 'floor' },
  { key: 'shmaGRA', label: 'סוף זמן ק"ש גר"א', fn: (z) => z.sofZmanShma(), round: 'floor' },
  { key: 'tfillaMGA', label: 'סוף זמן תפילה מג"א', fn: (z) => z.sofZmanTfillaMGA(), round: 'floor' },
  { key: 'tfillaGRA', label: 'סוף זמן תפילה גר"א', fn: (z) => z.sofZmanTfilla(), round: 'floor' },
  { key: 'chatzot', label: 'חצות היום', fn: (z) => z.chatzot(), round: 'nearest' },
  { key: 'minchaGedola', label: 'מנחה גדולה', fn: (z) => z.minchaGedola(), round: 'ceil' },
  { key: 'minchaKetana', label: 'מנחה קטנה', fn: (z) => z.minchaKetana(), round: 'ceil' },
  { key: 'plag', label: 'פלג המנחה', fn: (z) => z.plagHaMincha(), round: 'nearest' },
  { key: 'sunset', label: 'שקיעה', fn: (z) => z.sunset(), round: 'floor' },
  { key: 'tzeit', label: 'צאת הכוכבים', fn: (z) => z.tzeit(8.5), round: 'ceil' },
  { key: 'chatzotNight', label: 'חצות הלילה', fn: (z) => z.chatzotNight(), round: 'nearest' },
];
export const ZMAN_LABEL = Object.fromEntries(ZMANIM.map((z) => [z.key, z.label]));

function geo(s) {
  return new GeoLocation(s.name || 'shul', +s.lat, +s.lon, +(s.elevation || 0), s.tz || 'Asia/Jerusalem');
}
function loc(s) {
  return new Location(+s.lat, +s.lon, !!s.il, s.tz || 'Asia/Jerusalem', s.city || s.name || 'shul', s.il ? 'IL' : 'US', undefined, +(s.elevation || 0));
}

export function zmanimFor(civilDate, s) {
  const z = new Zmanim(geo(s), civilDate, !!s.useElevation);
  const out = {};
  for (const item of ZMANIM) {
    try { out[item.key] = item.fn(z); } catch { out[item.key] = null; }
  }
  return out;
}

// ---------- המרות טקסט ----------

const BOOKS = {
  'Joshua': 'יהושע', 'Judges': 'שופטים', 'I Samuel': 'שמואל א׳', 'II Samuel': 'שמואל ב׳',
  'I Kings': 'מלכים א׳', 'II Kings': 'מלכים ב׳', 'Isaiah': 'ישעיהו', 'Jeremiah': 'ירמיהו',
  'Ezekiel': 'יחזקאל', 'Hosea': 'הושע', 'Joel': 'יואל', 'Amos': 'עמוס', 'Obadiah': 'עובדיה',
  'Jonah': 'יונה', 'Micah': 'מיכה', 'Nahum': 'נחום', 'Habakkuk': 'חבקוק', 'Zephaniah': 'צפניה',
  'Haggai': 'חגי', 'Zechariah': 'זכריה', 'Malachi': 'מלאכי',
};

export function haftarahHe(str) {
  if (!str) return '';
  const gg = (n) => gematriya(+n); // עם גרש/גרשיים
  return str.split(/;\s*/).map((part) => {
    let p = part.trim();
    let book = '';
    for (const [en, he] of Object.entries(BOOKS).sort((a, b) => b[0].length - a[0].length)) {
      if (p.startsWith(en)) { book = he; p = p.slice(en.length).trim(); break; }
    }
    // 1:1 - 1:31  |  1:1-31  |  42:5 - 43:11
    const m = p.match(/^(\d+):(\d+)\s*[-–]\s*(?:(\d+):)?(\d+)$/);
    if (m) {
      const [, c1, v1, c2, v2] = m;
      const range = !c2 || c2 === c1 ? `${gg(c1)}:${gg(v1)}–${gg(v2)}` : `${gg(c1)}:${gg(v1)}–${gg(c2)}:${gg(v2)}`;
      return `${book} ${range}`.trim();
    }
    return `${book} ${p.replace(/(\d+)/g, (_, n) => gg(n))}`.trim();
  }).join('; ');
}

const stripParsha = (s) => noNikud(s).replace(/^פרשת\s+/, '');

// ---------- ספירת העומר ----------

const UNITS_M = ['', 'אחד', 'שנים', 'שלושה', 'ארבעה', 'חמשה', 'ששה', 'שבעה', 'שמונה', 'תשעה', 'עשרה'];
const TENS = { 20: 'עשרים', 30: 'שלושים', 40: 'ארבעים' };
const SEFIROT = ['חסד', 'גבורה', 'תפארת', 'נצח', 'הוד', 'יסוד', 'מלכות'];

function daysWords(n, edot) {
  if (n === 1) return 'יום אחד';
  if (n === 2) return 'שני ימים';
  if (n <= 10) return `${UNITS_M[n]} ימים`;
  if (n < 20) return `${n === 12 ? 'שנים' : UNITS_M[n - 10]} עשר יום`;
  const tens = Math.floor(n / 10) * 10;
  const u = n % 10;
  if (!u) return `${TENS[tens]} יום`;
  return edot ? `${TENS[tens]} ו${UNITS_M[u]} יום` : `${UNITS_M[u]} ו${TENS[tens]} יום`;
}
function weeksWords(w) {
  if (w === 1) return 'שבוע אחד';
  if (w === 2) return 'שני שבועות';
  return `${UNITS_M[w]} שבועות`;
}
function remWords(r) {
  if (r === 1) return 'ויום אחד';
  if (r === 2) return 'ושני ימים';
  return `ו${UNITS_M[r]} ימים`;
}

export function omerText(n, nusach) {
  const edot = nusach === 'edot';
  let t = `היום ${daysWords(n, edot)}`;
  if (n >= 7) {
    const w = Math.floor(n / 7), r = n % 7;
    t += `, שהם ${weeksWords(w)}${r ? ' ' + remWords(r) : ''}`;
  }
  t += nusach === 'ashkenaz' ? ' בעומר' : ' לעומר';
  const sefira = `${SEFIROT[(n - 1) % 7]} שב${SEFIROT[Math.floor((n - 1) / 7)]}`;
  return { text: t, sefira };
}

/** מספר היום בעומר לתאריך עברי, או 0 */
export function omerDay(hd) {
  const y = hd.getFullYear();
  const start = new HDate(16, 'Nisan', y);
  const n = hd.deltaDays(start) + 1;
  return n >= 1 && n <= 49 ? n : 0;
}

// ---------- שינויים בתפילה ----------

function rainSeason(hd, il, civil) {
  // משיב הרוח: משמיני עצרת (כ"ב תשרי) עד יום א' של פסח (ט"ו ניסן)
  const m = hd.getMonth(), d = hd.getDate();
  const T = 7, N = 1; // Tishrei=7, Nisan=1 ב-hebcal
  const geshem = (m === T && d >= 22) || (m > T || m < N) || (m === N && d < 15);
  // ותן טל ומטר
  let matar = false;
  if (geshem) {
    if (il) {
      // בארץ: מז' חשון
      matar = !(m === T) && !(m === 8 && d < 7);
    } else {
      // בחו"ל: מערבית של 4 בדצמבר (5 בדצמבר בשנה שלפני שנה לועזית מעוברת)
      const cm = civil.getMonth();
      if (cm <= 4) matar = true;
      else {
        const y = civil.getFullYear();
        const startDay = ((y + 1) % 4 === 0) ? 5 : 4;
        matar = civil >= new Date(y, 11, startDay);
      }
    }
  }
  return { geshem, matar };
}

/** יום בחנוכה (1–8) או 0. כ"ד כסלו הוא ערב חנוכה ואינו נחשב */
export function chanukaDay(hd) {
  const start = new HDate(25, 'Kislev', hd.getFullYear());
  const n = hd.deltaDays(start) + 1;
  return n >= 1 && n <= 8 ? n : 0;
}
// אירועים אמיתיים של היום (בלי "ערב ...", בלי ערב חנוכה ובלי תענית בכורות)
const realDescs = (holidays) => holidays.map((e) => e.getDesc())
  .filter((d) => !/^Erev |Chanukah: 1 Candle|Ta'anit Bechorot/.test(d));
const PUBLIC_FAST = /Ta'anit Esther|Tzom Gedaliah|Tzom Tammuz|Asara B'Tevet|Tish'a B'Av|Yom Kippur/;

export function tefilaChanges(hd, s, holidays) {
  const il = !!s.il, nusach = s.nusach || 'sefard';
  const out = [];
  const { geshem, matar } = rainSeason(hd, il, hd.greg());
  out.push(geshem ? 'משיב הרוח ומוריד הגשם' : (il || nusach !== 'ashkenaz' ? 'מוריד הטל' : 'אין אומרים משיב הרוח'));
  if (nusach === 'edot') out.push(matar ? 'ברך עלינו' : 'ברכנו');
  else out.push(matar ? 'ותן טל ומטר לברכה' : 'ותן ברכה');

  const descs = realDescs(holidays);
  const has = (re) => descs.some((d) => re.test(d));
  const m = hd.getMonth(), d = hd.getDate();
  if (m === 7 && d <= 10) out.push('המלך הקדוש · המלך המשפט · זכרנו · מי כמוך · וכתוב · ובספר חיים');
  if (has(/Rosh Chodesh|Pesach|Sukkot|Shavuot|Shmini Atzeret|Simchat Torah/)) out.push('יעלה ויבוא');
  if (chanukaDay(hd)) out.push('על הניסים (חנוכה)');
  if (has(/^Purim|Shushan Purim/)) out.push('על הניסים (פורים)');
  if (has(PUBLIC_FAST) && !has(/Yom Kippur/)) out.push('עננו (בתפילת מנחה)');

  try {
    let h = HebrewCalendar.hallel(hd, il);
    if (chanukaDay(hd)) h = 2;
    else if (m === 9 && d === 24) h = 0; // ערב חנוכה
    if (h === 2) out.push('הלל שלם');
    else if (h === 1) out.push('חצי הלל');
  } catch { /* */ }
  try {
    const t = HebrewCalendar.tachanun(hd, il);
    if (hd.getDay() !== 6) {
      if (!t.shacharit && !t.mincha) out.push('אין אומרים תחנון');
      else if (!t.mincha) out.push('אין אומרים תחנון במנחה');
      else if (!t.allCongs) out.push('תחנון – לפי מנהג הקהילה');
    }
  } catch { /* */ }
  // לדוד ה' אורי: מר"ח אלול עד הושענא רבה (אשכנז: עד שמיני עצרת)
  const ledavidEnd = nusach === 'ashkenaz' ? 22 : 21;
  if (m === 6 || (m === 7 && d <= ledavidEnd)) out.push('לדוד ה\' אורי');
  if (omerDay(hd.next())) out.push('ספירת העומר בערב');
  return out;
}

// ---------- ערכת צבע לפי התקופה ----------

export function seasonKey(hd, holidays, dow, isAfternoonFriday) {
  const all = holidays.map((e) => e.getDesc()).join('|');
  const descs = realDescs(holidays).join('|');
  const m = hd.getMonth(), d = hd.getDate();
  if (/Yom Kippur/.test(all) || (m === 7 && d <= 10) || /Rosh Hashana/.test(descs)) return 'yamim-noraim';
  if (/Sukkot|Shmini Atzeret|Simchat Torah/.test(all)) return 'sukkot';
  if (chanukaDay(hd)) return 'chanuka';
  if (/Purim/.test(descs)) return 'purim';
  if (/Pesach/.test(all)) return 'pesach';
  if (/Shavuot/.test(all)) return 'shavuot';
  if (PUBLIC_FAST.test(descs)) return 'fast';
  if ((m === 4 && d >= 17) || (m === 5 && d < 10)) return 'three-weeks';
  if (dow === 6 || isAfternoonFriday) return 'shabbat';
  if (m === 6) return 'elul';
  return 'weekday';
}

/** מפתח עיצוב מפורט לפי החג (לרקעים ולערכות הצבע) */
export function holidayKey(hd, holidays, dow, isAfternoonFriday) {
  const all = holidays.map((e) => e.getDesc()).join('|');
  const descs = realDescs(holidays).join('|');
  const m = hd.getMonth(), d = hd.getDate();
  if (/Yom Kippur/.test(all)) return 'yom-kippur';
  if (/Rosh Hashana/.test(all)) return 'rosh-hashana';
  if (m === 7 && d <= 10) return 'yamim-noraim';
  if (/Shmini Atzeret|Simchat Torah/.test(all)) return 'simchat-torah';
  if (/Sukkot/.test(all)) return 'sukkot';
  if (chanukaDay(hd)) return 'chanuka';
  if (/Purim/.test(descs) || /Erev Purim/.test(all)) return 'purim';
  if (/Pesach/.test(all)) return 'pesach';
  if (/Shavuot/.test(all)) return 'shavuot';
  if (/Lag BaOmer/.test(all)) return 'lag-baomer';
  if (/Tu BiShvat/.test(all)) return 'tu-bishvat';
  if (/Yom HaAtzma/.test(all)) return 'yom-haatzmaut';
  if (/Yom Yerushalayim/.test(all)) return 'yom-yerushalayim';
  if (/Yom HaZikaron|Yom HaShoah/.test(all)) return 'yom-hazikaron';
  if (/Tish'a B'Av/.test(all)) return 'tisha-bav';
  if (PUBLIC_FAST.test(descs)) return 'fast';
  if ((m === 4 && d >= 17) || (m === 5 && d < 10)) return 'three-weeks';
  if (/Rosh Chodesh/.test(all)) return 'rosh-chodesh';
  if (dow === 6 || isAfternoonFriday) return 'shabbat';
  if (m === 6) return 'elul';
  return 'weekday';
}

// ---------- סוג היום (לבחירת לוח תפילות) ----------

export function dayTags(hd, holidays, dow, holidaysTomorrow = []) {
  const tags = [];
  const f = holidays.reduce((a, e) => a | e.getFlags(), 0);
  const ft = holidaysTomorrow.reduce((a, e) => a | e.getFlags(), 0);
  if (f & flags.CHAG) tags.push('yomtov');
  if ((ft & flags.CHAG) && !(f & flags.CHAG)) tags.push('erev-yomtov'); // ערב חג אמיתי בלבד
  if (realDescs(holidays).some((d) => PUBLIC_FAST.test(d))) tags.push('fast');
  if (f & flags.CHOL_HAMOED) tags.push('chol-hamoed');
  if (f & flags.ROSH_CHODESH) tags.push('rosh-chodesh');
  if (chanukaDay(hd)) tags.push('chanuka');
  if (dow === 6) tags.push('shabbat');
  else if (dow === 5) tags.push('friday');
  else tags.push('weekday');
  if (dow === 0) tags.push('sunday');
  return tags;
}

// ---------- מולד וראש חודש (לשבת מברכים) ----------
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
/** המולד וימי ראש החודש של החודש שאחרי השבת sat (HDate) */
export function moladInfo(sat) {
  let d = sat.next();
  for (let i = 0; i < 31 && d.getDate() !== 1; i++) d = d.next();
  const m = new Molad(d.getFullYear(), d.getMonth());
  const month = renderHeb(d).replace(/^\S+\s+/, ''); // "א׳ כסלו" → "כסלו"
  const rc = [];
  const prev = d.prev();
  if (prev.getDate() === 30) rc.push(prev);
  rc.push(d);
  const civ = (h) => { const g = h.greg(); return `${g.getDate()}.${g.getMonth() + 1}`; };
  return {
    month, dow: m.getDow(), dayName: DAY_NAMES[m.getDow()],
    hour: m.getHour(), minutes: m.getMinutes(), chalakim: m.getChalakim(), chalakimHe: m.getChalakim() ? gematriya(m.getChalakim()) : '',
    time: `${String(m.getHour()).padStart(2, '0')}:${String(m.getMinutes()).padStart(2, '0')}`,
    rc: rc.map((h) => ({ dayName: DAY_NAMES[h.getDay()], heb: renderHeb(h), civil: civ(h) })),
  };
}

// ---------- הלימוד היומי ----------

const LEARNING = [
  ['dafYomi', 'דף יומי'], ['mishnaYomi', 'משנה יומית'], ['nachYomi', 'נ"ך יומי'],
  ['rambam1', 'רמב"ם יומי'], ['chofetzChaim', 'חפץ חיים'], ['psalms', 'תהלים'],
];
let mishnaIdx = null, nachIdx = null;
const LEARN_EV = {
  dafYomi: (hd) => new DafYomiEvent(hd),
  mishnaYomi: (hd) => new MishnaYomiEvent(hd, (mishnaIdx ||= new MishnaYomiIndex()).lookup(hd)),
  nachYomi: (hd) => new NachYomiEvent(hd, (nachIdx ||= new NachYomiIndex()).lookup(hd)),
  rambam1: (hd) => new DailyRambamEvent(hd, dailyRambam1(hd)),
  chofetzChaim: (hd) => new ChofetzChaimEvent(hd, chofetzChaim(hd)),
  psalms: (hd) => new PsalmsEvent(hd, dailyPsalms(hd)),
};
/** המשניות של היום: [{k: 'Oholot', perek: 16, mishna: 2}, …] */
export function mishnaYomiRefs(hd) {
  return (mishnaIdx ||= new MishnaYomiIndex()).lookup(hd).map(({ k, v }) => { const [p, m] = String(v).split(':'); return { k, perek: +p, mishna: +m }; });
}
export function dailyLearning(hd, enabled) {
  const out = [];
  for (const [key, label] of LEARNING) {
    if (enabled && enabled[key] === false) continue;
    if (!enabled && !['dafYomi', 'mishnaYomi'].includes(key)) continue;
    try {
      const ev = LEARN_EV[key](hd);
      const text = noNikud(ev.render(HE)).replace(/^[^:\d]+:\s*/, '')
        .replace(/(\d+)\.(\d+)/g, '$1:$2').replace(/\d+/g, (n) => gematriya(+n));
      if (text) out.push({ key, label, text });
    } catch (e) { console.warn('learning', key, e); }
  }
  return out;
}

// ---------- ריכוז כל המידע ליום ----------

const cache = new Map();

/**
 * מידע מלא ליום אזרחי. now – הרגע הנוכחי; s – הגדרות בית הכנסת.
 */
export function computeDay(now, s) {
  const tz = s.tz || 'Asia/Jerusalem';
  const civil = civilNoon(now, tz);
  const key = civil.toDateString() + JSON.stringify([s.lat, s.lon, s.il, s.nusach, s.candleMins, s.havdalahDeg, s.useElevation, s.learning]);
  const base = cache.get(key) || buildDay(civil, s);
  if (!cache.has(key)) { cache.clear(); cache.set(key, base); }

  // החלק שתלוי בשעה: אחרי השקיעה התאריך העברי מתחלף
  const afterSunset = base.zmanim.sunset && now >= base.zmanim.sunset;
  const evening = afterSunset ? base.next : null;
  return { ...base, now, afterSunset, evening };
}

function buildDay(civil, s) {
  const tz = s.tz || 'Asia/Jerusalem';
  const il = !!s.il;
  const hd = new HDate(civil);
  const dow = civil.getDay();
  const holidays = HebrewCalendar.getHolidaysOnDate(hd, il) || [];
  const tomorrow = hd.next();
  const holidaysTomorrow = HebrewCalendar.getHolidaysOnDate(tomorrow, il) || [];
  const zmanim = zmanimFor(civil, s);

  // שבת הקרובה
  const sat = dow === 6 ? hd : hd.onOrAfter(6);
  const sedra = getSedra(sat.getFullYear(), il);
  const look = sedra.lookup(sat);
  let parsha = '', parshaIsChag = !!look.chag;
  try { parsha = stripParsha(sedra.getString(sat, HE)); } catch { parsha = look.parsha.join('-'); }
  if (parshaIsChag || /[A-Za-z]/.test(parsha)) {
    // שבת שחל בה חג: שם החג בעברית
    const hs = (HebrewCalendar.getHolidaysOnDate(sat, il) || []).filter((e) => e.getFlags() & (flags.CHAG | flags.CHOL_HAMOED));
    if (hs.length) {
      parsha = noNikud(hs[0].render(HE));
      if (hs[0].getFlags() & flags.CHOL_HAMOED) parsha = 'שבת חול המועד ' + (/Pesach/.test(hs[0].getDesc()) ? 'פסח' : 'סוכות');
      parshaIsChag = true;
    }
  }
  let haftarah = '';
  try {
    const ley = getLeyningOnDate(sat, il);
    const raw = (s.nusach === 'edot' || s.nusach === 'sefard') && ley?.sephardic ? ley.sephardic : ley?.haftara;
    haftarah = haftarahHe(raw);
  } catch { /* */ }

  // שבתות מיוחדות ושבת מברכים
  const satEvents = HebrewCalendar.calendar({ start: sat, end: sat, il, shabbatMevarchim: true, noRoshChodesh: true });
  const specialShabbat = satEvents.filter((e) => e.getFlags() & flags.SPECIAL_SHABBAT).map((e) => noNikud(e.render(HE)));
  const mevarchim = satEvents.filter((e) => e.getFlags() & flags.SHABBAT_MEVARCHIM).map((e) => noNikud(e.render(HE)));

  // הדלקת נרות והבדלה – לשבוע הקרוב
  const opts = {
    start: hd.prev(), end: hd.add(8), il, location: loc(s), candlelighting: true,
    candleLightingMins: +(s.candleMins ?? (il ? 30 : 18)), noHolidays: false,
  };
  if (s.havdalahMins) opts.havdalahMins = +s.havdalahMins; else opts.havdalahDeg = +(s.havdalahDeg || 8.5);
  const timed = HebrewCalendar.calendar(opts).filter((e) => e.eventTime);
  // נרות: ההדלקה של השבת/החג הנוכחי או הקרוב – זו שההבדלה שאחריה עוד לא עברה
  const candleEvs = timed.filter((e) => /Candle lighting/.test(e.getDesc()));
  const havdalahEvs = timed.filter((e) => /Havdalah/.test(e.getDesc()));
  let candles = null, havdalah = null;
  // סוף רצף שבת+חג: הבדלה שאין אחריה הדלקת נרות באותו ערב
  const endsChain = (h) => !candleEvs.some((c) => c.getDate().isSameDate(h.getDate()) && c.eventTime >= h.eventTime - 3600000);
  for (const c of candleEvs) {
    const h = havdalahEvs.find((x) => x.eventTime > c.eventTime && endsChain(x));
    if (h && h.getDate().deltaDays(hd) >= 0) {
      // אם ההדלקה הזו היא המשך של רצף שכבר התחיל – נשארים עם ההדלקה הראשונה ברצף
      if (!candles) { candles = c; havdalah = h; }
      break;
    }
  }
  const bechorotOnly = holidays.some((e) => /Ta'anit Bechorot/.test(e.getDesc())) && !realDescs(holidays).some((d) => PUBLIC_FAST.test(d));
  const fastToday = timed.filter((e) => !bechorotOnly && /Fast (begins|ends)/.test(e.getDesc()) && e.getDate().isSameDate(hd))
    .map((e) => ({ label: /begins/.test(e.getDesc()) ? 'תחילת הצום' : 'סוף הצום', time: e.eventTime }));

  const om = omerDay(hd);
  const omTomorrow = omerDay(tomorrow);

  const isAfternoonFriday = dow === 5; // ערכת שבת כבר מיום שישי
  const hdNext = hd.next();

  return {
    civil, tz, hd, dow, holidays, holidaysTomorrow, zmanim,
    hebDate: hd.renderGematriya(true),
    gregDate: civil.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }),
    weekday: weekdayHe(dow),
    events: holidays.map((e) => noNikud(e.render(HE))),
    eventsTomorrow: holidaysTomorrow.map((e) => noNikud(e.render(HE))),
    shabbat: {
      date: sat, parsha, parshaIsChag, haftarah, specialShabbat, mevarchim,
      candles: candles?.eventTime || null, candlesDate: candles?.getDate() || null,
      candlesLabel: candles && candles.getDate().getDay() !== 5 ? 'הדלקת נרות חג' : 'הדלקת נרות',
      havdalah: havdalah?.eventTime || null,
    },
    fast: fastToday,
    omer: om ? { day: om, ...omerText(om, s.nusach) } : null,
    omerTonight: omTomorrow ? { day: omTomorrow, ...omerText(omTomorrow, s.nusach) } : null,
    changes: tefilaChanges(hd, s, holidays),
    tags: dayTags(hd, holidays, dow, holidaysTomorrow),
    season: seasonKey(hd, holidays, dow, isAfternoonFriday),
    holiday: holidayKey(hd, holidays, dow, isAfternoonFriday),
    learning: dailyLearning(hd, s.learning),
    next: {
      hd: hdNext, hebDate: hdNext.renderGematriya(true),
      events: holidaysTomorrow.map((e) => noNikud(e.render(HE))),
    },
  };
}

// ---------- אזכרות, ימי הולדת והילולות ----------

/** תאריך האזכרה בשנה העברית הנוכחית (לפי תאריך פטירה לועזי) */
export function yahrzeitIn(hyear, item) {
  try {
    if (item.hebDay && item.hebMonth) return new HDate(+item.hebDay, item.hebMonth, hyear);
    if (!item.date) return null;
    let d = new Date(item.date + 'T12:00:00');
    if (item.afterSunset) d = new Date(d.getTime() + 86400000);
    return HebrewCalendar.getYahrzeit(hyear, d) || null;
  } catch { return null; }
}

export function birthdayIn(hyear, item) {
  try {
    if (item.hebDay && item.hebMonth) return new HDate(+item.hebDay, item.hebMonth, hyear);
    if (!item.date) return null;
    let d = new Date(item.date + 'T12:00:00');
    if (item.afterSunset) d = new Date(d.getTime() + 86400000);
    return HebrewCalendar.getBirthdayOrAnniversary(hyear, d) || null;
  } catch { return null; }
}

/** פריטים שהתאריך העברי שלהם נופל בטווח [from, to] כולל */
export function inHebrewRange(items, from, to, fn) {
  const res = [];
  const years = new Set([from.getFullYear(), to.getFullYear()]);
  for (const it of items || []) {
    for (const y of years) {
      const h = fn(y, it);
      if (h && h.deltaDays(from) >= 0 && to.deltaDays(h) >= 0) { res.push({ ...it, hdate: h }); break; }
    }
  }
  return res.sort((a, b) => a.hdate.deltaDays(b.hdate));
}

export const renderHeb = (h) => h ? h.renderGematriya(true).replace(/\s*תש.*$|\s*ה'?תש.*$/, '') : '';

export const HEB_MONTHS = [
  ['Tishrei', 'תשרי'], ['Cheshvan', 'חשון'], ['Kislev', 'כסלו'], ['Tevet', 'טבת'], ['Sh\'vat', 'שבט'],
  ['Adar', 'אדר'], ['Adar I', 'אדר א'], ['Adar II', 'אדר ב'], ['Nisan', 'ניסן'], ['Iyyar', 'אייר'],
  ['Sivan', 'סיון'], ['Tamuz', 'תמוז'], ['Av', 'אב'], ['Elul', 'אלול'],
];
