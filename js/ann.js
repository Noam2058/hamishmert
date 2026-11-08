// הודעות: מתי מוצגות (תאריך לועזי או עברי שחוזר כל שנה) ועיצוב הטקסט – משותף ללוח, לדף המתפללים ולממשק.
import { HDate } from './lib.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MONTH_HE = {
  Tishrei: 'תשרי', Cheshvan: 'חשון', Kislev: 'כסלו', Tevet: 'טבת', "Sh'vat": 'שבט', Adar: 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳',
  Nisan: 'ניסן', Iyyar: 'אייר', Sivan: 'סיון', Tamuz: 'תמוז', Av: 'אב', Elul: 'אלול',
};
const HEB_DAYS = ['', 'א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב', 'י״ג', 'י״ד', 'ט״ו', 'ט״ז', 'י״ז', 'י״ח', 'י״ט', 'כ׳', 'כ״א', 'כ״ב', 'כ״ג', 'כ״ד', 'כ״ה', 'כ״ו', 'כ״ז', 'כ״ח', 'כ״ט', 'ל׳'];

/** תאריך עברי בשנה נתונה – אדר בשנה מעוברת = אדר ב׳; אדר א׳/ב׳ בשנה רגילה = אדר; יום 30 בחודש של 29 = יום 29 */
function hdIn(day, month, year) {
  let m = month;
  const leap = HDate.isLeapYear(year);
  if (!leap && (m === 'Adar I' || m === 'Adar II')) m = 'Adar';
  else if (leap && m === 'Adar') m = 'Adar II';
  const probe = new HDate(1, m, year);
  const max = HDate.daysInMonth(probe.getMonth(), year);
  return new HDate(Math.min(Math.max(+day || 1, 1), max), m, year);
}

/** האם היום העברי hd בתוך הטווח השנתי (כולל מעבר דרך ראש השנה, למשל אלול → תשרי) */
export function inHebAnnual(hd, a) {
  if (!a.hFromDay || !a.hFromMonth) return true;
  const toDay = a.hToDay || a.hFromDay, toMonth = a.hToMonth || a.hFromMonth;
  try {
    const y = hd.getFullYear();
    const from = hdIn(a.hFromDay, a.hFromMonth, y).abs(), to = hdIn(toDay, toMonth, y).abs(), t = hd.abs();
    return from <= to ? t >= from && t <= to : t >= from || t <= to;
  } catch { return false; }
}

/** האם ההודעה מוצגת היום. iso = YYYY-MM-DD לועזי, hd = התאריך העברי של היום */
export function annActive(a, iso, hd) {
  if (a.dateMode === 'hebrew') return hd ? inHebAnnual(hd, a) : true;
  return (!a.from || a.from <= iso) && (!a.to || a.to >= iso);
}

const hebLabel = (d, m) => `${HEB_DAYS[+d] || d} ${MONTH_HE[m] || m}`;
const civLabel = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${+d}.${+m}.${y.slice(2)}`; };

/** תיאור קצר של מתי ההודעה מוצגת */
export function annWhen(a) {
  if (a.dateMode === 'hebrew') {
    if (!a.hFromDay || !a.hFromMonth) return 'כל שנה – חסר תאריך';
    const one = !a.hToDay && !a.hToMonth || (+a.hToDay === +a.hFromDay && (a.hToMonth || a.hFromMonth) === a.hFromMonth);
    return one ? `כל שנה ב${hebLabel(a.hFromDay, a.hFromMonth)}` : `כל שנה, ${hebLabel(a.hFromDay, a.hFromMonth)} – ${hebLabel(a.hToDay || a.hFromDay, a.hToMonth || a.hFromMonth)}`;
  }
  if (!a.from && !a.to) return 'מוצגת תמיד';
  return `${civLabel(a.from) || '…'} – ${civLabel(a.to) || '…'}`;
}

/** טקסט ההודעה: **מודגש** ו-__קו תחתון__ */
export function annBody(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/gs, '<b>$1</b>').replace(/__(.+?)__/gs, '<u>$1</u>');
}

export const ANN_DEFAULT_FMT = { align: 'center', size: 'm', bold: false, underline: false, font: 'body', bg: 'auto' };
export const ANN_SIZES = [['s', 'קטן'], ['m', 'רגיל'], ['l', 'גדול'], ['xl', 'גדול מאוד']];
export const ANN_FONTS = [['body', 'רגיל', 'Assistant'], ['display', 'קלאסי', 'Frank Ruhl Libre'], ['festive', 'חגיגי', 'Suez One']];
export const ANN_BGS = [['auto', 'לפי הסגנון', ''], ['parchment', 'קלף', '#f6efdc'], ['white', 'לבן', '#ffffff'], ['gold', 'זהב', '#e9cf86'], ['sky', 'תכלת', '#d7e6f5'], ['mint', 'ירוק', '#d8ecd9'], ['rose', 'ורוד', '#f6dcdc'], ['blue', 'כחול לילה', '#1c3260'], ['wine', 'בורדו', '#6b1f2c'], ['dark', 'כהה', '#23283a']];

/** מחלקות העיצוב של הודעה */
export function annClasses(a) {
  const f = { ...ANN_DEFAULT_FMT, ...(a.fmt || {}) };
  return [`al-${f.align}`, `sz-${f.size}`, `ff-${f.font}`, f.bold ? 'fw-b' : '', f.underline ? 'ul' : '', f.bg !== 'auto' ? `bg-${f.bg}` : ''].filter(Boolean).join(' ');
}
export const annBig = (a) => ['l', 'xl'].includes(a.fmt?.size);
