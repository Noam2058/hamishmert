// הלכה יומית מתוך שולחן ערוך – סעיף אחד בכל יום, לפי הסדר.
// ההיקף תואם לכרכים: אורח חיים סימנים א–רמא, ואחריו יורה דעה סימנים א–קיא. בסוף – מתחילים מחדש.
// הטקסט: מנוקד (מהדורת "תורת אמת", ספריא); כותרות הסימנים ממהדורת למברג, נטען מהרשת ונשמר במכשיר לשבוע קדימה – עובד גם בלי אינטרנט.

// מספר הסעיפים בכל סימן (מתוך ספריא)
const OC = [9,6,17,23,1,4,4,17,6,12,15,3,3,5,6,1,3,3,2,2,4,1,4,6,13,2,11,3,1,5,2,52,5,4,1,3,3,13,10,8,1,3,9,1,2,9,14,1,1,1,9,1,26,3,22,5,2,7,5,5,26,5,9,4,3,10,1,1,2,5,7,5,4,6,6,8,2,1,9,1,2,2,5,1,2,1,3,1,8,27,6,10,4,9,4,2,5,5,3,1,4,5,3,8,1,3,4,12,3,8,3,2,9,9,1,1,5,1,4,1,3,3,6,12,2,4,2,45,2,1,8,2,1,2,14,1,6,1,11,3,8,2,5,4,3,4,8,1,1,5,12,1,22,15,2,1,1,13,20,15,4,10,2,2,2,1,20,17,3,22,5,2,3,8,6,1,5,7,6,5,10,7,12,6,5,2,4,10,2,5,3,2,6,3,3,4,4,1,11,2,4,18,8,13,5,6,1,18,3,2,6,2,3,1,4,14,8,9,10,2,2,4,6,13,10,1,3,3,2,5,1,3,2,2,4,4,1,2,2,17,1];
const YD = [14,11,1,7,3,4,1,1,1,3,4,2,6,6,3,12,3,20,8,4,5,2,6,20,3,2,1,24,1,2,4,8,11,10,10,17,7,5,25,6,10,9,6,10,2,6,5,12,5,3,4,7,5,5,13,10,21,12,2,3,33,4,2,21,14,10,6,15,21,6,3,4,6,1,3,6,1,1,3,6,9,5,10,17,3,10,11,2,4,4,8,9,1,9,7,5,3,9,7,4,9,4,7,3,14,2,2,7,2,10,7];

export const BOOKS = [
  { key: 'oc', ref: 'Shulchan_Arukh,_Orach_Chayim', he: 'אורח חיים', shape: OC, nikud: 'Torat Emet 363' },
  { key: 'yd', ref: "Shulchan_Arukh,_Yoreh_De'ah", he: 'יורה דעה', shape: YD, nikud: 'Torat Emet 357' },
];
const TOTAL = BOOKS.reduce((a, b) => a + b.shape.reduce((x, y) => x + y, 0), 0);
export const DEFAULT_START = '2026-11-05'; // ביום הזה – אורח חיים סימן א סעיף א

const dayNum = (iso) => Math.floor(Date.parse(`${iso}T12:00:00Z`) / 86400000);

/** איזה סעיף לומדים בתאריך (yyyy-mm-dd) */
export function refForDate(iso, startIso = DEFAULT_START) {
  let n = ((dayNum(iso) - dayNum(startIso)) % TOTAL + TOTAL) % TOTAL;
  for (const b of BOOKS) for (let i = 0; i < b.shape.length; i++) {
    if (n < b.shape[i]) return { book: b, siman: i + 1, seif: n + 1 };
    n -= b.shape[i];
  }
  return { book: BOOKS[0], siman: 1, seif: 1 };
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];
export function heNum(n) {
  let s = HUNDREDS[Math.floor(n / 100)] || ''; n %= 100;
  if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else s += TENS[Math.floor(n / 10)] + ONES[n % 10];
  return s.length > 1 ? `${s.slice(0, -1)}״${s.slice(-1)}` : `${s}׳`;
}

// ---------- ניקוי הטקסט ----------
const NQ = '[֑-ׇ]*';
const HAGAH = new RegExp(`(?:^|\\s)ה${NQ}ג${NQ}ה${NQ}\\s*:?\\s+`, 'g'); // "הגה:" עם או בלי ניקוד

export function clean(html) {
  let title = '';
  html = String(html || '').replace(/<b>([\s\S]*?)<\/b>\s*(<br\s*\/?>)?/, (_, t) => { title = t; return ''; });
  html = html.replace(/<i\b[^>]*>\s*<\/i>|<i\b[^>]*\/>/g, '');      // סימני המפרשים
  html = html.replace(/<i\b[^>]*>/g, '<small>').replace(/<\/i>/g, '</small>'); // בחלק מהמהדורות הרמ"א מסומן בנטוי
  // מעבר לפי עומק: <small> ראשון = הגהת הרמ"א; <small> פנימי (מראי מקומות) = טקסט רגיל בתוך ההגהה
  const parts = [];
  let depth = 0;
  const push = (text, rema) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last && !text.trim()) { last.text += ' '; return; } // רווח בין תגיות לא שובר הגהה
    if (last && last.rema === rema) last.text += text; else parts.push({ rema, text });
  };
  for (const tok of html.match(/<small>|<\/small>|<[^>]+>|[^<]+/g) || []) {
    if (tok === '<small>') depth++;
    else if (tok === '</small>') depth = Math.max(0, depth - 1);
    else if (tok.startsWith('<')) push(' ', depth > 0);
    else push(tok, depth > 0);
  }
  const tidy = (t) => t.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
    .replace(/\s+([:.,;)])/g, '$1').replace(/\(\s+/g, '(').replace(/\(\s*\)/g, '').trim();
  const out = [];
  for (const p of parts) {
    if (p.rema) tidy(p.text).split(HAGAH).forEach((t) => { t = tidy(t); if (t && !/^[.:,\s]*$/.test(t)) out.push({ rema: true, text: t }); });
    else { const t = tidy(p.text); if (t && !/^[.:,\s]*$/.test(t)) out.push({ rema: false, text: t }); }
  }
  const strip = (t) => t.replace(/<[^>]+>/g, '').replace(/[.:]?\s*ובו\s+[^.:]*?סעיפים?\s*:?\s*$/, '').replace(/[.:\s]+$/, '').trim();
  return { title: strip(title), parts: out };
}

// ---------- מטמון במכשיר ----------
const KEY = (r) => `sa3:${r.book.key}.${r.siman}.${r.seif}`;
const TITLE_KEY = (b, s) => `sa3:t:${b.key}.${s}`;
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/** ההלכה של היום מהמטמון (או null אם עוד לא נטענה) */
export function cachedHalacha(iso, startIso) {
  const r = refForDate(iso, startIso);
  const v = ls.get(KEY(r));
  if (!v) return null;
  return { ...v, title: ls.get(TITLE_KEY(r.book, r.siman)) || '', ref: r, source: `שולחן ערוך · ${r.book.he} · סימן ${heNum(r.siman)} סעיף ${heNum(r.seif)}` };
}

const inflight = new Map();
async function fetchSiman(book, siman) {
  const id = `${book.key}.${siman}`;
  if (inflight.has(id)) return inflight.get(id);
  const p = (async () => {
    const base = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(`${book.ref}.${siman}`)}`;
    const get = async (v) => { const j = await (await fetch(`${base}?version=${encodeURIComponent(v)}`)).json(); const x = (j.versions || [])[0]; return x ? (Array.isArray(x.text) ? x.text : [x.text]) : null; };
    const [plain, vocal] = await Promise.all([get('hebrew'), get(`hebrew|${book.nikud}`).catch(() => null)]);
    const arr = vocal && vocal.some(Boolean) ? vocal : plain || [];
    if (plain) ls.set(TITLE_KEY(book, siman), clean(String(plain[0] || '')).title || '');
    arr.forEach((html, i) => ls.set(`sa3:${book.key}.${siman}.${i + 1}`, { parts: clean(String(html || '')).parts }));
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

let lastPrefetch = 0;
/** טוען מראש את ההלכות של היום ושל 7 הימים הבאים (פעם בשעה לכל היותר) */
export async function prefetchHalachot(todayIso, startIso, force = false) {
  if (!force && Date.now() - lastPrefetch < 3600000) return false;
  lastPrefetch = Date.now();
  let got = false;
  for (let d = 0; d < 14; d++) {
    const iso = new Date(Date.parse(`${todayIso}T12:00:00Z`) + d * 86400000).toISOString().slice(0, 10);
    const r = refForDate(iso, startIso);
    if (ls.get(KEY(r)) && ls.get(TITLE_KEY(r.book, r.siman)) != null) continue;
    try { await fetchSiman(r.book, r.siman); got = true; } catch { lastPrefetch = Date.now() - 3300000; break; } // ננסה שוב בעוד 5 דקות
  }
  return got;
}
