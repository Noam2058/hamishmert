// חגים ומועדים לתפילות מיוחדות: רשימת ימי החג, מתי הם חלים, ולוח התפילות שהגבאי הגדיר לכל אחד.
import { HebrewCalendar, HDate } from './lib.js';
import { renderHeb, computeDay, minToHhmm } from './jewish.js';
import { resolveTime } from './prayers.js';

// [מפתח, שם, תבנית לזיהוי האירוע של hebcal]
export const HOLIDAY_DAYS = [
  ['erev-rh', 'ערב ראש השנה', /^Erev Rosh Hashana/],
  ['rh1', 'ראש השנה – יום א׳', /^Rosh Hashana \d/],
  ['rh2', 'ראש השנה – יום ב׳', /^Rosh Hashana II/],
  ['gedalia', 'צום גדליה', /^Tzom Gedaliah/],
  ['erev-yk', 'ערב יום כיפור', /^Erev Yom Kippur/],
  ['yk', 'יום כיפור', /^Yom Kippur$/],
  ['erev-sukkot', 'ערב סוכות', /^Erev Sukkot/],
  ['sukkot1', 'סוכות – יום טוב', /^Sukkot (I|II)$/],
  ['chm-sukkot', 'חול המועד סוכות', /^Sukkot (II|III|IV|V|VI) \(CH''M\)/],
  ['hoshana', 'הושענא רבה', /Hoshana Raba/],
  ['shmini', 'שמיני עצרת – שמחת תורה', /^(Shmini Atzeret|Simchat Torah)/],
  ['chanuka', 'חנוכה', /^Chanukah: ([2-8] Candles|8th Day)/],
  ['asara', 'עשרה בטבת', /^Asara B'Tevet/],
  ['tubishvat', 'ט״ו בשבט', /^Tu BiShvat/],
  ['esther', 'תענית אסתר', /^Ta'anit Esther/],
  ['purim', 'פורים', /^Purim$/],
  ['shushan', 'שושן פורים', /^Shushan Purim$/],
  ['erev-pesach', 'ערב פסח', /^Erev Pesach/],
  ['pesach1', 'פסח – יום טוב ראשון', /^Pesach (I|II)$/],
  ['chm-pesach', 'חול המועד פסח', /^Pesach (II|III|IV|V|VI) \(CH''M\)/],
  ['pesach7', 'שביעי של פסח', /^Pesach (VII|VIII)$/],
  ['shoah', 'יום השואה', /^Yom HaShoah/],
  ['zikaron', 'יום הזיכרון', /^Yom HaZikaron/],
  ['atzmaut', 'יום העצמאות', /^Yom HaAtzma'ut/],
  ['lag', 'ל״ג בעומר', /^Lag BaOmer/],
  ['yerushalayim', 'יום ירושלים', /^Yom Yerushalayim/],
  ['erev-shavuot', 'ערב שבועות', /^Erev Shavuot/],
  ['shavuot', 'שבועות', /^Shavuot( I| II)?$/],
  ['tammuz', 'צום י״ז בתמוז', /^Tzom Tammuz/],
  ['erev-9av', 'ערב תשעה באב', /^Erev Tish'a B'Av/],
  ['9av', 'תשעה באב', /^Tish'a B'Av/],
];
export const HOLIDAY_LABEL = Object.fromEntries(HOLIDAY_DAYS.map(([k, l]) => [k, l]));

const occCache = new Map();
/** ימי החג בטווח: [{key, label, date (צהרי היום האזרחי), hd}] */
export function holidayOccurrences(from, days, il = true) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  const ck = `${start.toDateString()}|${days}|${il}`;
  if (occCache.has(ck)) return occCache.get(ck);
  const end = new Date(start.getTime() + days * 86400000);
  const out = [];
  const seen = new Set();
  for (const ev of HebrewCalendar.calendar({ start, end, il, noRoshChodesh: true, noSpecialShabbat: true, omer: false, candlelighting: false })) {
    const desc = ev.getDesc();
    const def = HOLIDAY_DAYS.find((h) => h[2].test(desc));
    if (!def) continue;
    const hd = ev.getDate();
    const id = `${def[0]}|${hd.abs()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const g = hd.greg();
    out.push({ key: def[0], label: def[1], hd, date: new Date(g.getFullYear(), g.getMonth(), g.getDate(), 12) });
  }
  out.sort((a, b) => a.hd.abs() - b.hd.abs());
  if (occCache.size > 30) occCache.clear();
  occCache.set(ck, out);
  return out;
}

/** מפתחות החג של יום אזרחי מסוים */
export function holidayKeysOn(civil, il = true) {
  return holidayOccurrences(civil, 1, il).filter((o) => o.date.toDateString() === new Date(civil.getFullYear(), civil.getMonth(), civil.getDate(), 12).toDateString()).map((o) => o.key);
}

/** הפעם הקרובה של חג (לתצוגה המקדימה בממשק) */
export function nextOccurrence(key, from, il = true) {
  return holidayOccurrences(from, 400, il).find((o) => o.key === key) || null;
}

/**
 * לוחות התפילות של החגים הקרובים (מהיום ועד שבוע קדימה) – רק חגים שהוגדרו להם תפילות.
 * ימים רצופים של אותו חג (חול המועד, חנוכה) מאוחדים לכרטיס אחד.
 * מחזיר [{key, label, dates: [Date], heb: 'ט״ז–כ׳ תשרי', rows: [{name, note, time, min}]}]
 */
export function upcomingHolidaySchedules(data, s, now, daysAhead = 7) {
  const list = (data.prayers || []).filter((p) => p.schedule === 'holiday' && p.holiday);
  if (!list.length) return [];
  const keys = new Set(list.map((p) => p.holiday));
  const occ = holidayOccurrences(now, daysAhead + 1, s.il !== false).filter((o) => keys.has(o.key));
  const groups = [];
  for (const o of occ) {
    const last = groups[groups.length - 1];
    if (last && last.key === o.key && o.hd.abs() - last.hds[last.hds.length - 1].abs() === 1) { last.dates.push(o.date); last.hds.push(o.hd); continue; }
    groups.push({ key: o.key, label: o.label, dates: [o.date], hds: [o.hd] });
  }
  return groups.map((g) => {
    let day = null;
    try { day = computeDay(g.dates[0], s); } catch { /* */ }
    const ctx = day ? { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah } : {};
    const rows = list.filter((p) => p.holiday === g.key && (!p.weekdays?.length || p.weekdays.includes(g.dates[0].getDay())))
      .map((p) => { let min = null; try { min = resolveTime(p.time, g.dates[0], s, ctx); } catch { /* */ } return { name: p.name, note: p.note || '', min, time: min == null ? '--:--' : minToHhmm(min) }; })
      .sort((a, b) => (a.min ?? 9999) - (b.min ?? 9999));
    const first = renderHeb(g.hds[0]), lastH = g.hds.length > 1 ? renderHeb(g.hds[g.hds.length - 1]) : '';
    const sameMonth = g.hds.length > 1 && g.hds[0].getMonth() === g.hds[g.hds.length - 1].getMonth();
    const heb = lastH ? (sameMonth ? `${first.split(' ')[0]}–${lastH}` : `${first} – ${lastH}`) : first;
    return { key: g.key, label: g.label, dates: g.dates, heb, rows };
  }).filter((g) => g.rows.length);
}
export { HDate };
