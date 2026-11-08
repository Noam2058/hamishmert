// דף המתפללים: כל מה שבלוח, מסודר לטלפון.
import { computeDay, fmtTime, minutesOf, ZMAN_LABEL, ZMANIM, inHebrewRange, yahrzeitIn, birthdayIn, renderHeb, minToHhmm } from './jewish.js';
import { prayersForDay, weeklyPrayers, resolveTime, daysLabel } from './prayers.js';
import { HDate } from './lib.js';
import { load, subscribe } from './store.js';
import { cachedHalacha, prefetchHalachot, DEFAULT_START } from './halacha-sa.js';
import { sceneForSlide, renderScene } from './scenes.js';
import { annActive, annBody, annClasses } from './ann.js';

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
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
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
  const slides = (DATA.slides || []).filter((x) => x.url && x.enabled !== false && (!x.from || x.from <= iso) && (!x.to || x.to >= iso));
  const mem = inHebrewRange(DATA.memorials || [], day.hd, day.hd.add(7), yahrzeitIn);
  const bdays = inHebrewRange(DATA.birthdays || [], day.hd, day.hd.add(7), birthdayIn);
  const hil = inHebrewRange(DATA.hilulot || [], day.hd, day.hd.add(7), (y, it) => { try { return new HDate(+it.hebDay, it.hebMonth, y); } catch { return null; } });
  const hal = (DATA.halachaSource || 'sa') === 'sa' ? cachedHalacha(iso, DATA.halachaStart || DEFAULT_START) : null;
  const custom = !hal && (DATA.halachot || []).length ? DATA.halachot[Math.floor(day.civil.getTime() / 86400000) % DATA.halachot.length] : null;
  const isShabbat = sh.candlesDate && sh.candlesDate.getDay() === 5;
  const specials = [...(sh.specialShabbat || []), ...(sh.mevarchim || [])];
  const showZ = s.zmanimShown?.length ? s.zmanimShown : ZMANIM.map((z) => z.key);

  document.title = s.name || 'בית הכנסת';
  const nav = [['t-today', 'היום'], ['t-shabbat', isShabbat ? 'שבת' : 'חג'], anns.length && ['t-ann', 'הודעות'], slides.length && ['t-img', 'תמונות'], ['t-zmanim', 'זמנים'], ['t-week', 'השבוע'], (hal || custom) && ['t-hal', 'הלכה'], lessons.length && ['t-les', 'שיעורים']].filter(Boolean);

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
        ${weekly.friday.length || weekly.shabbat.length ? `<div class="sub-h">ערב שבת</div><div class="rows">${weekly.friday.map((p) => row(p.name, esc(p.time), p.note)).join('')}</div>
          <div class="sub-h">שבת</div><div class="rows">${weekly.shabbat.map((p) => row(p.name, esc(p.time), p.note)).join('')}</div>` : ''}
      </section>

      ${anns.length ? `<section class="card" id="t-ann"><h2>${icon('megaphone')}הודעות <span class="pill">${anns.length}</span></h2>
        ${anns.map((a) => `<div class="ann ${esc(a.style || '')} ${annClasses(a)}">${a.title ? `<h3>${esc(a.title)}</h3>` : ''}<p>${annBody(a.body)}</p>${a.dateMode !== 'hebrew' && a.to ? `<div class="when">עד ${esc(a.to.split('-').reverse().join('.'))}</div>` : ''}</div>`).join('')}</section>` : ''}

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

      ${day.learning?.length ? `<section class="card"><h2>${icon('book')}הלימוד היומי</h2><div class="rows">${day.learning.map((l) => row(l.label, `<span style="font:700 17px var(--body);direction:rtl">${esc(l.text)}</span>`)).join('')}</div></section>` : ''}

      ${lessons.length ? `<section class="card" id="t-les"><h2>${icon('book')}שיעורים קבועים</h2><div class="rows">${lessons.map((l) => row(l.title, esc(l.timeStr), [daysLabel(l.weekdays), l.teacher, l.note].filter(Boolean).join(' · '))).join('')}</div></section>` : ''}

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
subscribe((d) => { DATA = d; render(); });
setInterval(render, 60000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
