// דף נייד למתפללים: אותו מידע כמו בלוח, בטור אחד.
import { computeDay, fmtTime, minutesOf, ZMAN_LABEL, ZMANIM, inHebrewRange, yahrzeitIn, renderHeb } from './jewish.js';
import { prayersForDay, weeklyPrayers, resolveTime, daysLabel } from './prayers.js';
import { minToHhmm } from './jewish.js';
import { load, subscribe } from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const line = (k, v, sub = '', cls = '') => `<div class="line ${cls}"><div>${esc(k)}${sub ? `<small>${esc(sub)}</small>` : ''}</div><div class="t">${v}</div></div>`;

function render(DATA) {
  const s = DATA.synagogue;
  const now = new Date();
  const day = computeDay(now, s);
  const nowMin = minutesOf(now, s.tz);
  const today = prayersForDay(day, DATA, s);
  const weekly = weeklyPrayers(day, DATA, s);
  const lessons = (DATA.lessons || []).map((l) => {
    const min = resolveTime(l.time, day.civil, s, { candles: day.shabbat.candles, havdalah: day.shabbat.havdalah });
    return { ...l, timeStr: min == null ? '' : minToHhmm(min) };
  });
  const sh = day.shabbat;
  const meta = Object.fromEntries(ZMANIM.map((z) => [z.key, z]));
  const iso = now.toISOString().slice(0, 10);
  const anns = (DATA.announcements || []).filter((a) => (!a.from || a.from <= iso) && (!a.to || a.to >= iso));
  const mem = inHebrewRange(DATA.memorials || [], day.hd, day.hd.add(7), yahrzeitIn);

  document.title = s.name || 'בית הכנסת';
  document.getElementById('app').innerHTML = `
    <div class="top"><h1>${esc(s.name)}</h1>${s.dedication ? `<div class="sub">${esc(s.dedication)}</div>` : ''}
      <div class="date">${esc(day.weekday)} · ${esc(day.afterSunset ? 'אור ל' + day.next.hebDate : day.hebDate)}</div>
      <div class="sub">${esc(day.gregDate)}${day.events.length ? ' · ' + esc(day.events.join(' · ')) : ''}</div></div>

    <section class="box"><h2>תפילות היום</h2>${today.map((p) => line(p.name, p.time, p.note, p.min != null && p.min < nowMin - 5 ? 'past' : '')).join('') || '<div class="sub">לא הוגדרו</div>'}</section>

    <section class="box"><h2>${sh.parshaIsChag ? esc(sh.parsha) : 'פרשת ' + esc(sh.parsha)}</h2>
      ${sh.haftarah && !sh.parshaIsChag ? `<div>הפטרה: ${esc(sh.haftarah)}</div>` : ''}
      ${[...sh.specialShabbat, ...sh.mevarchim].length ? `<div class="chips">${[...sh.specialShabbat, ...sh.mevarchim].map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
      <div class="two"><div><div class="sub">${esc(sh.candlesLabel)}</div><div class="t">${fmtTime(sh.candles, s.tz, 'floor')}</div></div>
      <div><div class="sub">צאת השבת</div><div class="t">${fmtTime(sh.havdalah, s.tz, 'ceil')}</div></div></div></section>

    <section class="box"><h2>תפילות השבוע</h2>
      <h2 style="font-size:16px">חול</h2>${weekly.weekday.map((p) => line(p.name, p.time)).join('')}
      <h2 style="font-size:16px">ערב שבת</h2>${weekly.friday.map((p) => line(p.name, p.time)).join('')}
      <h2 style="font-size:16px">שבת</h2>${weekly.shabbat.map((p) => line(p.name, p.time)).join('')}</section>

    <section class="box"><h2>זמני היום</h2>${(s.zmanimShown || []).map((k) => line(ZMAN_LABEL[k], fmtTime(day.zmanim[k], s.tz, meta[k]?.round))).join('')}
      <div class="chips">${day.changes.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      ${day.omer ? `<div>${esc(day.omer.text)}</div>` : ''}</section>

    ${anns.length ? `<section class="box"><h2>הודעות</h2>${anns.map((a) => `<div class="ann"><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p></div>`).join('<hr style="border:0;border-top:1px dashed var(--line)">')}</section>` : ''}

    ${lessons.length ? `<section class="box"><h2>שיעורים</h2>${lessons.map((l) => line(l.title, l.timeStr || '', [daysLabel(l.weekdays), l.teacher, l.note].filter(Boolean).join(' · '))).join('')}</section>` : ''}

    ${mem.length ? `<section class="box"><h2>אזכרות השבוע</h2>${mem.map((m) => line(m.name + ' ז"ל', esc(renderHeb(m.hdate)))).join('')}</section>` : ''}

    <div class="foot">הזמנים מחושבים למיקום בית הכנסת (${esc(s.city || '')}). התעדכן: ${now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>`;
}

const r = await load();
render(r.data);
subscribe((d) => render(d));
setInterval(async () => render((await load()).data), 60000);
