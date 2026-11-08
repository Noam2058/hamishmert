// חישוב זמני תפילות ושיעורים: שעה קבועה או יחסית לזמן הלכתי.
import { zmanimFor, tzParts, minutesOf, hhmmToMin, minToHhmm } from './jewish.js';
import { holidayKeysOn } from './holidays.js';

export const SCHEDULES = [
  ['weekday', 'חול'], ['friday', 'ערב שבת'], ['shabbat', 'שבת ומוצ"ש'],
  ['rosh-chodesh', 'ראש חודש'], ['chol-hamoed', 'חול המועד'], ['erev-yomtov', 'ערב חג'],
  ['yomtov', 'חג'], ['fast', 'תענית'], ['chanuka', 'חנוכה'],
  ['holiday', 'חג / מועד מסוים (לבחור מרשימה)'],
];
export const SCHEDULE_LABEL = Object.fromEntries(SCHEDULES);

// סדר עדיפות: מאוחר ברשימה גובר
const SPECIAL_ORDER = ['chanuka', 'rosh-chodesh', 'chol-hamoed', 'erev-yomtov', 'fast', 'yomtov'];

export const ZMAN_BASES = [
  ['sunrise', 'הנץ'], ['sunset', 'השקיעה'], ['tzeit', 'צאת הכוכבים'], ['plag', 'פלג המנחה'],
  ['minchaGedola', 'מנחה גדולה'], ['minchaKetana', 'מנחה קטנה'], ['chatzot', 'חצות'],
  ['alot', 'עלות השחר'], ['misheyakir', 'טלית ותפילין'], ['candles', 'הדלקת נרות'], ['havdalah', 'צאת השבת'],
];

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function baseMinutes(base, civil, s, ctx) {
  if (base === 'candles') return ctx.candles ? minutesOf(ctx.candles, s.tz) : null;
  if (base === 'havdalah') return ctx.havdalah ? minutesOf(ctx.havdalah, s.tz) : null;
  const z = zmanimFor(civil, s)[base];
  return z ? minutesOf(z, s.tz) : null;
}

function roundMin(min, step, dir) {
  if (!step) return Math.round(min);
  if (dir === 'up') return Math.ceil(min / step) * step;
  if (dir === 'nearest') return Math.round(min / step) * step;
  return Math.floor(min / step) * step;
}

/** מחשב שעה (בדקות מחצות) לפריט עם time = {type,...} בתאריך אזרחי נתון */
export function resolveTime(t, civil, s, ctx = {}) {
  if (!t) return null;
  if (t.type !== 'zman') return hhmmToMin(t.value);
  let min;
  if (t.basis === 'week-min' || t.basis === 'week-max') {
    const sunday = addDays(civil, -civil.getDay());
    const vals = [0, 1, 2, 3, 4].map((i) => baseMinutes(t.zman, addDays(sunday, i), s, ctx)).filter((v) => v != null);
    if (!vals.length) return null;
    min = t.basis === 'week-min' ? Math.min(...vals) : Math.max(...vals);
  } else {
    min = baseMinutes(t.zman, civil, s, ctx);
    if (min == null) return null;
  }
  min += +(t.offset || 0);
  return roundMin(min, +(t.round || 0), t.dir || 'down');
}

export function describeTime(t) {
  if (!t) return '';
  if (t.type !== 'zman') return t.value;
  const base = Object.fromEntries(ZMAN_BASES)[t.zman] || t.zman;
  const off = +(t.offset || 0);
  const rel = off === 0 ? `ב${base === 'השקיעה' ? 'שקיעה' : base}` : `${Math.abs(off)} דק' ${off < 0 ? 'לפני' : 'אחרי'} ${base}`;
  const wk = t.basis === 'week-min' ? ' (לפי המוקדם בשבוע)' : t.basis === 'week-max' ? ' (לפי המאוחר בשבוע)' : '';
  return rel + wk;
}

function rowsFor(prayers, tags, dow, hkeys = []) {
  // חג נשען על לוח השבת (ערב חג – על לוח החול, ומה שמוגדר ב"ערב חג" מחליף)
  const baseTag = tags.includes('shabbat') || tags.includes('yomtov') ? 'shabbat'
    : tags.includes('friday') ? 'friday' : 'weekday';
  const ok = (r) => !r.weekdays || !r.weekdays.length || r.weekdays.includes(dow);
  const map = new Map();
  for (const r of prayers.filter((p) => p.schedule === baseTag && ok(p))) map.set(r.name.trim(), r);
  for (const tag of SPECIAL_ORDER) {
    if (!tags.includes(tag)) continue;
    for (const r of prayers.filter((p) => p.schedule === tag && ok(p))) map.set(r.name.trim(), r);
  }
  // תפילות שהוגדרו לחג מסוים (ראש השנה, פורים…) גוברות על הכל באותו יום
  for (const r of prayers.filter((p) => p.schedule === 'holiday' && hkeys.includes(p.holiday) && ok(p))) map.set(r.name.trim(), r);
  return [...map.values()];
}

/** רשימת התפילות ליום (day מגיע מ-computeDay) */
export function prayersForDay(day, data, s, civil = day.civil, tags = day.tags) {
  const ctx = { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah };
  let hkeys = [];
  try { if ((data.prayers || []).some((p) => p.schedule === 'holiday')) hkeys = holidayKeysOn(civil, s.il !== false); } catch { /* */ }
  return rowsFor(data.prayers || [], tags, civil.getDay(), hkeys)
    .map((r) => {
      const min = resolveTime(r.time, civil, s, ctx);
      return { id: r.id, name: r.name, note: r.note || '', min, time: min == null ? '--:--' : minToHhmm(min) };
    })
    .sort((a, b) => (a.min ?? 9999) - (b.min ?? 9999));
}

/** תפילות חול (לפי יום ראשון של השבוע) ותפילות השבת הקרובה */
export function weeklyPrayers(day, data, s) {
  const civil = day.civil;
  const sunday = addDays(civil, -civil.getDay());
  const friday = addDays(sunday, 5);
  const saturday = addDays(sunday, 6);
  const weekdayCivil = civil.getDay() <= 4 ? civil : sunday;
  return {
    weekday: prayersForDay(day, data, s, weekdayCivil, ['weekday']),
    friday: prayersForDay(day, data, s, friday, ['friday']),
    shabbat: prayersForDay(day, data, s, saturday, ['shabbat']),
  };
}

export function lessonsForDay(data, s, civil, ctx = {}) {
  const dow = civil.getDay();
  return (data.lessons || [])
    .filter((l) => !l.weekdays || !l.weekdays.length || l.weekdays.includes(dow))
    .map((l) => {
      const min = resolveTime(l.time, civil, s, ctx);
      return { ...l, min, timeStr: min == null ? '' : minToHhmm(min) };
    })
    .sort((a, b) => (a.min ?? 9999) - (b.min ?? 9999));
}

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
export function daysLabel(arr) {
  if (!arr || !arr.length || arr.length === 7) return 'כל יום';
  const s = [...arr].sort();
  if (s.join() === '0,1,2,3,4') return 'א׳–ה׳';
  if (s.join() === '0,1,2,3,4,5') return 'א׳–ו׳';
  return s.map((d) => DAY_LETTERS[d] + '׳').join(', ');
}

/** הזמן הבא שמגיע היום (לפס הגולל) */
export function nextUpcoming(day, prayers, now, s) {
  const nowMin = minutesOf(now, s.tz);
  const list = prayers.filter((p) => p.min != null && p.min > nowMin);
  return list[0] || null;
}

export { tzParts };
