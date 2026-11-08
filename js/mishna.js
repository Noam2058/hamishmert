// משנה יומית: שתי משניות בכל יום (לפי סדר הלימוד העולמי), טקסט מנוקד מספריא – Torat Emet 357.
import { mishnaYomiRefs, computeDay } from './jewish.js';

const VERSION = 'Torat Emet 357';
const KEY = (r) => `my1:${r.k}.${r.perek}.${r.mishna}`;
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const clean = (html) => String(html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** המשניות של היום מהמטמון; null אם עוד לא נטענו */
export function cachedMishna(hd) {
  let refs;
  try { refs = mishnaYomiRefs(hd); } catch { return null; }
  const items = refs.map((r) => ls.get(KEY(r)));
  if (!items.length || items.some((x) => !x)) return null;
  const tractate = items[0].tractate;
  const sameTr = items.every((x) => x.tractate === tractate);
  const samePerek = sameTr && items.every((x) => x.perekHe === items[0].perekHe);
  const source = samePerek
    ? `משנה · מסכת ${tractate} · פרק ${items[0].perekHe} · משנה ${items.map((x) => x.mishnaHe).join('–')}`
    : `משנה · ${items.map((x) => `${sameTr ? '' : `${x.tractate} `}${x.perekHe}:${x.mishnaHe}`).join(' – ')}${sameTr ? ` · מסכת ${tractate}` : ''}`;
  return { tractate, items, source };
}

async function fetchOne(r) {
  const ref = `Mishnah_${r.k.replace(/ /g, '_')}.${r.perek}.${r.mishna}`;
  const j = await (await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=${encodeURIComponent(`hebrew|${VERSION}`)}`)).json();
  let text = j.versions?.[0]?.text;
  if (Array.isArray(text)) text = text.flat(3).join(' ');
  if (!text) {
    const k = await (await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=hebrew`)).json();
    text = k.versions?.[0]?.text; if (Array.isArray(text)) text = text.flat(3).join(' ');
  }
  if (!text) throw new Error('no text');
  // heRef: "משנה אהלות ט״ז:ב׳"
  const m = String(j.heRef || '').replace(/^משנה\s+/, '').match(/^(.*)\s+(\S+):(\S+)$/);
  ls.set(KEY(r), { tractate: m ? m[1] : r.k, perekHe: m ? m[2] : String(r.perek), mishnaHe: m ? m[3] : String(r.mishna), text: clean(text) });
}

let last = 0;
/** טוען מראש את המשניות של היום ושל 7 הימים הבאים (פעם בשעה לכל היותר) */
export async function prefetchMishna(s, force = false) {
  if (!force && Date.now() - last < 3600000) return false;
  last = Date.now();
  let got = false;
  const today = computeDay(new Date(), s).hd;
  for (let d = 0; d < 8; d++) {
    let refs; try { refs = mishnaYomiRefs(today.add(d)); } catch { continue; }
    for (const r of refs) {
      if (ls.get(KEY(r))) continue;
      try { await fetchOne(r); got = true; } catch { last = Date.now() - 3300000; return got; } // ננסה שוב בעוד 5 דקות
    }
  }
  return got;
}
