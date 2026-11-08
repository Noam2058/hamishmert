// דף שבועי להדפסה (A4): זמני השבת, תפילות השבוע, טבלת זמני היום, שיעורים והודעות.
import { load } from './store.js';
import { computeDay, zmanimFor, fmtTime, ZMANIM, ZMAN_LABEL, renderHeb, moladInfo, minToHhmm } from './jewish.js';
import { weeklyPrayers, resolveTime, daysLabel } from './prayers.js';
import { annActive, annBody } from './ann.js';
import { upcomingHolidaySchedules } from './holidays.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const params = new URLSearchParams(location.search);
let week = +(params.get('week') || 0);
let DATA = null;
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const PRINT_Z = ['alot', 'sunrise', 'shmaGRA', 'tfillaGRA', 'chatzot', 'minchaGedola', 'plag', 'sunset', 'tzeit'];

function render() {
  const s = DATA.synagogue;
  const now = new Date();
  const today = computeDay(now, s).civil;
  // יום ראשון של השבוע המבוקש
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + week * 7, 12);
  const base = week ? sunday : new Date(Math.max(now, sunday));
  const day = computeDay(base, s);
  const sh = day.shabbat;
  const weekly = weeklyPrayers(day, DATA, s);
  const isShabbat = sh.candlesDate && sh.candlesDate.getDay() === 5;
  const days = Array.from({ length: 7 }, (_, i) => new Date(sunday.getTime() + i * 86400000));
  const dayInfo = days.map((d) => ({ d, cd: computeDay(d, s), z: zmanimFor(d, s) }));
  const iso = (d) => d.toLocaleDateString('en-CA', { timeZone: s.tz || 'Asia/Jerusalem' });
  const zkeys = (s.zmanimShown?.length ? PRINT_Z.filter((k) => s.zmanimShown.includes(k)) : PRINT_Z).slice(0, 9);
  const zround = Object.fromEntries(ZMANIM.map((z) => [z.key, z.round]));
  const heb = (d) => renderHeb(computeDay(d, s).hd);
  const range = `${heb(days[0])} – ${heb(days[6])}`;
  const civ = (d) => `${d.getDate()}.${d.getMonth() + 1}`;
  const prow = (p) => `<tr><td>${esc(p.name)}${p.note ? `<small>${esc(p.note)}</small>` : ''}</td><td class="t">${esc(p.time)}</td></tr>`;
  const ptable = (title, list) => list.length ? `<section class="box"><h3>${title}</h3><table class="pt">${list.map(prow).join('')}</table></section>` : '';

  // שיעורים – השעה לפי היום הקרוב שבו מתקיימים
  const lessons = (DATA.lessons || []).map((l) => {
    const dd = l.weekdays?.length ? l.weekdays : [0, 1, 2, 3, 4, 5, 6];
    const info = dayInfo.find((x) => dd.includes(x.d.getDay())) || dayInfo[0];
    let min = null; try { min = resolveTime(l.time, info.d, s, { candles: info.cd.shabbat.candles, havdalah: info.cd.shabbat.havdalah }); } catch {}
    return { ...l, timeStr: min == null ? '' : minToHhmm(min), days: daysLabel(l.weekdays) };
  });
  const anns = $('#opt-anns').checked ? (DATA.announcements || []).filter((a) => (a.title || a.body) && days.some((d) => annActive(a, iso(d), computeDay(d, s).hd))) : [];
  let hols = []; try { hols = upcomingHolidaySchedules(DATA, s, base, 7); } catch {}
  let molad = null; if (sh.mevarchim?.length && sh.date) { try { molad = moladInfo(sh.date); } catch {} }
  const mUrl = new URL('m.html', location.href).href.replace(/\?.*$/, '');

  $('#sheet').innerHTML = `
    <header class="head">
      <div class="h-main"><div class="shul">${esc(s.name || 'בית הכנסת')}</div>${s.dedication ? `<div class="ded">${esc(s.dedication)}</div>` : ''}
        <div class="range">${esc(range)} · ${civ(days[0])}–${civ(days[6])}.${days[6].getFullYear()}</div></div>
      <div class="qr" id="qr" title="סרקו לזמנים בטלפון"></div>
    </header>

    <section class="shab">
      <div class="sb side"><small>${esc(sh.candlesLabel || 'הדלקת נרות')}</small><b>${fmtTime(sh.candles, s.tz, 'floor')}</b><small>${sh.candlesDate ? esc(DAYS[sh.candlesDate.getDay()]) : ''}</small></div>
      <div class="sb mid"><small>${isShabbat ? 'שבת קודש' : 'חג'}</small><div class="parsha">${sh.parsha ? (sh.parshaIsChag ? esc(sh.parsha) : `פרשת ${esc(sh.parsha)}`) : ''}</div>
        ${sh.haftarah && !sh.parshaIsChag ? `<small>הפטרה: ${esc(sh.haftarah)}</small>` : ''}
        ${[...(sh.specialShabbat || []), ...(sh.mevarchim || [])].length ? `<div class="tags">${[...(sh.specialShabbat || []), ...(sh.mevarchim || [])].map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>
      <div class="sb side"><small>צאת ${isShabbat ? 'השבת' : 'החג'}</small><b>${fmtTime(sh.havdalah, s.tz, 'ceil')}</b><small>${s.havdalahMins ? `${s.havdalahMins} דק' אחרי השקיעה` : 'צאת הכוכבים'}</small></div>
    </section>

    <div class="cols3">
      ${ptable('ערב שבת', weekly.friday)}
      ${ptable('שבת קודש', weekly.shabbat)}
      ${ptable('ימות החול', weekly.weekday)}
    </div>

    ${molad ? `<section class="box molad"><h3>שבת מברכים – חודש ${esc(molad.month)}</h3><p>המולד: יום ${esc(molad.dayName)}, ${esc(molad.time)}${molad.chalakim ? ` ו־${esc(molad.chalakimHe)} חלקים` : ''} (שעון ירושלים) · ראש חודש: ${molad.rc.map((r) => `יום ${esc(r.dayName)} ${esc(r.heb)}`).join(' ו')}</p></section>` : ''}

    ${hols.length ? `<div class="cols3">${hols.slice(0, 3).map((g) => `<section class="box"><h3>${esc(g.label)} <span class="sub">${esc(g.heb)}</span></h3><table class="pt">${g.rows.map(prow).join('')}</table></section>`).join('')}</div>` : ''}

    ${$('#opt-zmanim').checked ? `<section class="box"><h3>זמני היום</h3><table class="zt"><thead><tr><th></th>${zkeys.map((k) => `<th>${esc(ZMAN_LABEL[k])}</th>`).join('')}</tr></thead><tbody>
      ${dayInfo.map(({ d, cd, z }) => `<tr${d.getDay() === 6 ? ' class="sat"' : ''}><th>${esc(DAYS[d.getDay()])}<small>${esc(renderHeb(cd.hd))}</small></th>${zkeys.map((k) => `<td>${fmtTime(z[k], s.tz, zround[k])}</td>`).join('')}</tr>`).join('')}
    </tbody></table></section>` : ''}

    <div class="cols2">
      ${lessons.length ? `<section class="box"><h3>שיעורי תורה</h3><table class="pt">${lessons.map((l) => `<tr><td>${esc(l.title)}<small>${esc([l.teacher, l.days, l.note].filter(Boolean).join(' · '))}</small></td><td class="t">${esc(l.timeStr)}</td></tr>`).join('')}</table></section>` : ''}
      ${anns.length ? `<section class="box anns"><h3>הודעות</h3>${anns.map((a) => `<div class="ann">${a.title ? `<b>${esc(a.title)}</b>` : ''}<p>${annBody(a.body)}</p></div>`).join('')}</section>` : ''}
    </div>

    <footer class="foot">זמנים, הודעות ועדכונים בכל רגע – סרקו את הקוד או היכנסו ל־<span dir="ltr">${esc(mUrl.replace(/^https?:\/\//, ''))}</span></footer>`;

  try { const q = window.qrcode(0, 'M'); q.addData(mUrl); q.make(); $('#qr').innerHTML = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch { $('#qr').remove(); }
  document.querySelectorAll('[data-week]').forEach((b) => b.classList.toggle('on', +b.dataset.week === week));
  document.title = `דף שבועי – ${s.name || 'בית הכנסת'} – ${sh.parsha || ''}`;
}

document.querySelectorAll('[data-week]').forEach((b) => b.onclick = () => { week = +b.dataset.week; render(); });
$('#opt-anns').onchange = render; $('#opt-zmanim').onchange = render;
$('#back').href = 'admin.html' + location.search.replace(/[?&]week=\d/, '');
const r = await load();
DATA = r.data;
render();
