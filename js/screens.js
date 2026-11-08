// המסכים של הלוח. כל מסך מחזיר HTML, מערך של שקפים, או null כשאין מה להציג.
import { cachedHalacha, DEFAULT_START } from './halacha-sa.js';
import { computeDay, minToHhmm, fmtTime, minutesOf, ZMAN_LABEL, ZMANIM, inHebrewRange, yahrzeitIn, birthdayIn, renderHeb, hhmmToMin } from './jewish.js';
import { HDate } from './lib.js';
import { daysLabel, resolveTime } from './prayers.js';
import { cachedMishna } from './mishna.js';
import { greetingArt } from './art.js';
import { annActive, annBody, annClasses, annBig, annStyle } from './ann.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const title = (t) => `<div class="screen-title"><span>${esc(t)}</span></div>`;
const flourish = '<svg class="flourish" viewBox="0 0 260 18" aria-hidden="true"><path d="M0 9h100M160 9h100" stroke="currentColor" stroke-width="2"/><path d="M130 2l7 7-7 7-7-7z" fill="currentColor"/><circle cx="112" cy="9" r="3" fill="currentColor"/><circle cx="148" cy="9" r="3" fill="currentColor"/></svg>';
/** שינויים בתפילה – רשימה מעוצבת: כל שינוי בשורה משלו, מופרד בעיטור זהב. extra: [{t, v}] (שעה/מידע נוסף) */
const changesHtml = (changes, extra = []) => {
  if (!changes.length && !extra.length) return '<div class="chg-none">סדר התפילה הרגיל</div>';
  return `<div class="chg-list">${changes.map((c) => `<div class="chg">${esc(c)}</div>`).join('')}${extra.map((x) => `<div class="chg extra">${esc(x.t)}${x.v ? ` <b>${esc(x.v)}</b>` : ''}</div>`).join('')}</div>`;
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
    return `<div class="row ${cls}"><div class="k">${esc(p.name)}${p.note ? `<small>${esc(p.note)}</small>` : ''}</div><div class="v">${p.time}</div></div>`;
  });
  return `<div class="rows${compact ? ' compact' : ''}">${rows.join('')}</div>`;
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

// ---------- המסכים ----------

function greetingFor(ctx) {
  const { day, display } = ctx;
  const descs = day.holidays.map((e) => e.getDesc()).join('|');
  const m = day.hd.getMonth(), d = day.hd.getDate();
  const sh = day.shabbat;
  const parsha = sh.parshaIsChag ? sh.parsha : `פרשת ${sh.parsha}`;
  switch (day.season) {
    case 'chanuka': {
      // הנר הראשון מודלק בערב כ"ד כסלו; טבת באותה שנה עברית כמו כסלו
      const n = day.hd.deltaDays(new HDate(24, 'Kislev', day.hd.getFullYear()));
      const lit = Math.min(8, Math.max(1, day.afterSunset ? n + 1 : n));
      const nights = ['', 'הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי', 'השביעי', 'השמיני'];
      return { kind: 'chanuka', lit, title: 'חנוכה שמח', sub: `נר ${nights[lit]} של חנוכה${lit === 8 ? ' · זאת חנוכה' : ''}` };
    }
    case 'purim': return { kind: 'purim', title: 'פורים שמח', sub: 'משלוח מנות איש לרעהו ומתנות לאביונים' };
    case 'pesach': return { kind: 'pesach', title: 'חג כשר ושמח', sub: /Chol/.test(descs) ? 'מועדים לשמחה' : 'זמן חרותנו' };
    case 'shavuot': return { kind: 'shavuot', title: 'חג שבועות שמח', sub: 'זמן מתן תורתנו' };
    case 'sukkot': return { kind: 'sukkot', title: /Shmini|Simchat/.test(descs) ? 'שמחת תורה שמחה' : 'חג סוכות שמח', sub: 'זמן שמחתנו · מועדים לשמחה' };
    case 'yamim-noraim':
      if (m === 7 && d >= 3) return { kind: 'yamim-noraim', title: 'גמר חתימה טובה', sub: 'עשרת ימי תשובה' };
      return { kind: 'yamim-noraim', title: 'שנה טובה ומתוקה', sub: 'כתיבה וחתימה טובה' };
    case 'shabbat': return { kind: 'shabbat', title: day.dow === 6 || day.dow === 5 ? 'שבת שלום ומבורך' : 'שבת שלום', sub: parsha };
    default:
      if (day.holiday === 'tu-bishvat') return { kind: 'shavuot', title: 'ט"ו בשבט שמח', sub: 'ראש השנה לאילנות' };
      if (day.holiday === 'lag-baomer') return { kind: 'torah', title: 'ל"ג בעומר שמח', sub: 'הילולא דרבי שמעון בר יוחאי' };
      if (day.holiday === 'yom-haatzmaut') return { kind: 'torah', title: 'חג עצמאות שמח', sub: 'ראשית צמיחת גאולתנו' };
      if (day.holiday === 'yom-yerushalayim') return { kind: 'torah', title: 'יום ירושלים שמח', sub: 'ירושלים הבנויה כעיר שחוברה לה יחדיו' };
      if (day.tags.includes('rosh-chodesh')) return { kind: 'torah', title: 'חודש טוב', sub: day.events.join(' · ') };
      if (day.season === 'elul') return { kind: 'yamim-noraim', title: 'חודש אלול', sub: 'ימי רחמים וסליחות' };
      return { kind: 'torah', title: 'ברוכים הבאים', sub: `${day.afterSunset ? day.next.hebDate : day.hebDate} · ${parsha}` }; // כל יום; לכיבוי – מכבים את מסך הברכה ברשימת המסכים
  }
}

export const SCREENS = {
  greeting(ctx) {
    const gr = greetingFor(ctx);
    if (!gr) return null;
    let img = '';
    try { img = greetingArt(gr.kind, { lit: gr.lit }); } catch { /* */ }
    return `<div class="greet">
      ${img ? `<img class="art" src="${img}" alt="">` : ''}
      <div class="words"><div class="gt">${esc(gr.title)}</div>${flourish}<div class="gs">${esc(gr.sub || '')}</div>
      ${ctx.s.name ? `<div class="gn">${esc(ctx.s.name)}</div>` : ''}</div></div>`;
  },

  combined(ctx) {
    const { day, s, prayersToday, lessonsToday } = ctx;
    const nowMin = minutesOf(ctx.now, s.tz);
    const tag = dayLabelForSchedule(day);
    const keys = (s.zmanimShown || []).slice(0, 9);
    const extra = [];
    if (day.fast.length) extra.push(...day.fast.map((f) => ({ t: f.label, v: fmtTime(f.time, s.tz, f.label === 'סוף הצום' ? 'ceil' : 'floor') })));
    if (day.omer) extra.push({ t: `היום ${day.omer.day} לעומר` });
    return `
      <div class="grid g-combined">
        <section class="card"><h3>תפילות היום ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</h3>${prayerRows(prayersToday, nowMin)}</section>
        <section class="card"><h3>זמני היום</h3>${zmanimRows(ctx, keys, true)}</section>
        <section class="card"><h3>בתפילה היום</h3><div class="body changes">${changesHtml(day.changes, extra)}</div></section>
      </div>`;
  },

  prayers(ctx) {
    const { day, s, weekly, prayersToday } = ctx;
    const nowMin = minutesOf(ctx.now, s.tz);
    const special = ['yomtov', 'fast', 'chol-hamoed', 'rosh-chodesh', 'erev-yomtov', 'chanuka'].some((t) => day.tags.includes(t));
    const cols = [];
    if (special) cols.push(`<section class="card"><h3>היום <span class="tag">${esc(dayLabelForSchedule(day))}</span></h3>${prayerRows(prayersToday, nowMin)}</section>`);
    cols.push(`<section class="card"><h3>ימות החול</h3>${prayerRows(weekly.weekday, null, false)}${ctx.data.lessons?.length ? '' : ''}</section>`);
    cols.push(`<section class="card"><h3>ערב שבת</h3>${prayerRows(weekly.friday, null, false)}</section>`);
    cols.push(`<section class="card"><h3>שבת קודש</h3>${prayerRows(weekly.shabbat, null, false)}</section>`);
    return `${title('זמני התפילות')}<div class="grid g${Math.min(cols.length, 3) === 3 ? 3 : 2}" style="grid-template-columns:repeat(${cols.length},1fr)">${cols.join('')}</div>`;
  },

  zmanim(ctx) {
    const { day, s } = ctx;
    const keys = s.zmanimShown || [];
    const half = Math.ceil(keys.length / 2);
    return `${title('זמני היום')}
      <div class="grid" style="grid-template-columns:1fr 1fr 0.9fr">
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
        <section class="card side"><div class="label">${esc(sh.candlesLabel)}</div><div class="time">${fmtTime(sh.candles, s.tz, 'floor')}</div>
          <div class="label">${sh.candlesDate ? esc(renderHeb(sh.candlesDate)) : ''}</div></section>
        <section class="card center">
          <div class="label">${isShabbat ? 'שבת קודש' : esc(holidayName || 'חג שמח')}</div>
          <div class="big">${head}</div>${flourish}
          ${sh.haftarah && !sh.parshaIsChag ? `<div class="label">הפטרה</div><div class="mid">${esc(sh.haftarah)}</div>` : ''}
          ${sh.specialShabbat.length || sh.mevarchim.length ? `<div class="chips" style="justify-content:center">${[...sh.specialShabbat, ...sh.mevarchim].map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
        </section>
        <section class="card side"><div class="label">צאת ${isShabbat ? 'השבת' : 'החג'}</div><div class="time">${fmtTime(sh.havdalah, s.tz, 'ceil')}</div>
          <div class="label">${s.havdalahMins ? `${s.havdalahMins} דק' אחרי השקיעה` : 'צאת הכוכבים'}</div></section>
      </div>`;
  },

  announcements(ctx) {
    const today = ctx.todayIso;
    const list = (ctx.data.announcements || []).filter((a) => annActive(a, today, ctx.day.hd) && (a.title || a.body));
    if (!list.length) return null;
    const slides = [];
    const per = list.some((a) => (a.body || '').length > 140 || annBig(a)) ? 1 : 2;
    for (let i = 0; i < list.length; i += per) {
      slides.push(`<div class="ann-grid">${list.slice(i, i + per).map((a) => `
        <section class="card ann ${esc(a.style || 'general')} ${annClasses(a)}"${annStyle(a)}>
          ${a.style === 'memorial' ? candle : ''}
          ${a.title ? `<div class="t">${esc(a.title)}</div>${a.style !== 'memorial' ? flourish : ''}` : ''}
          <div class="b">${annBody(a.body)}</div>
        </section>`).join('')}</div>`);
    }
    return slides;
  },

  memorials(ctx) {
    const { day } = ctx;
    const hd = day.hd;
    const list = ctx.data.memorials || [];
    const today = inHebrewRange(list, hd, hd, yahrzeitIn);
    const week = inHebrewRange(list, hd.next(), hd.add(7), yahrzeitIn);
    if (!today.length && !week.length) return null;
    const todayHtml = today.length ? `<div class="mem-today">${today.slice(0, 3).map((m) => `
      <section class="card mem">${candle}<div><div class="when">האזכרה היום · ${esc(renderHeb(m.hdate))}</div>
      <div class="who">${esc(m.name)} ז"ל</div>${m.by ? `<div class="by">${esc(m.by)}</div>` : ''}</div></section>`).join('')}</div>` : '';
    const weekHtml = week.length ? `<section class="card"><h3>אזכרות השבוע</h3><div class="mem-week">${week.map((m) => `
      <div class="row"><div class="k">${esc(m.name)} ז"ל</div><div class="v">${esc(renderHeb(m.hdate))}</div></div>`).join('')}</div></section>` : '';
    return `${title('לעילוי נשמת')}<div style="display:flex;flex-direction:column;gap:28px;flex:1">${todayHtml}${weekHtml}</div>`;
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
    const sr = day.zmanim.sunrise, shma = day.zmanim.shmaGRA;
    if (!sr || !shma) return null;
    const now = ctx.now;
    const win = +(display.netzWindowMin || 60) * 60000;
    let target, label, sub;
    if (now < sr && sr - now <= win) { target = sr; label = 'הנץ החמה בעוד'; sub = `הנץ היום: <b>${fmtTime(sr, s.tz, 'ceil')}</b>`; }
    else if (now >= sr && now < shma) { target = shma; label = 'סוף זמן קריאת שמע (גר"א) בעוד'; sub = `מג"א: <b>${fmtTime(day.zmanim.shmaMGA, s.tz, 'floor')}</b> · גר"א: <b>${fmtTime(shma, s.tz, 'floor')}</b>`; }
    else return null;
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
      const secs = +x.seconds || ctx.display.defaultSeconds || 12;
      const size = Math.min(100, Math.max(40, +x.size || 100));
      const alt = esc(x.title || x.caption || '');
      const img = fit === 'scroll' ? `<div class="pan"><img src="${u}" alt="${alt}"></div>` : `<img src="${u}" alt="${alt}">`;
      return {
        key: x.id, seconds: +x.seconds || 0, full: fit === 'full',
        html: `${x.title && fit !== 'full' ? title(x.title) : ''}<section class="img-slide fit-${fit} bg-${x.bg || 'board'}" style="--dur:${secs}s;--size:${size / 100}">${img}${x.caption ? `<div class="cap">${esc(x.caption)}</div>` : ''}</section>`,
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
    const list = all.map((l) => {
      const days = l.weekdays?.length ? l.weekdays : [0, 1, 2, 3, 4, 5, 6];
      const next = (from) => { let o = from; while (o < from + 7 && !days.includes((day.civil.getDay() + o) % 7)) o++; return o; };
      const timeAt = (o) => { const d = at(o); try { return d ? resolveTime(l.time, d.civil, s, { candles: d.shabbat.candles, havdalah: d.shabbat.havdalah }) : null; } catch { return null; } };
      let off = next(0), min = timeAt(off);
      // שיעור של היום שכבר הסתיים (יותר משעה) – מציגים את הפעם הבאה
      if (off === 0 && min != null && min < nowMin - 60) { off = next(1); min = timeAt(off); }
      return { ...l, off, min, time: min == null ? '' : minToHhmm(min), days: daysLabel(l.weekdays), today: off === 0, dow: (day.civil.getDay() + off) % 7 };
    }).sort((a, b) => a.off - b.off || (a.min ?? 9999) - (b.min ?? 9999));
    const DN = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
    const when = (l) => (l.today ? 'היום' : l.off === 1 ? 'מחר' : l.dow === 6 ? 'בשבת' : `ביום ${DN[l.dow]}`);
    if (list.length <= 3) {
      return `${title('שיעורי תורה')}<div class="grid lessons-cards" style="grid-template-columns:repeat(${list.length},1fr)">${list.map((l) => `
        <section class="card lesson${l.today ? ' today' : ''}"><span class="when">${esc(when(l))}</span>
          <div class="lt">${esc(l.title)}</div>${l.teacher ? `<div class="lr">${esc(l.teacher)}</div>` : ''}
          <div class="time">${esc(l.time)}</div><div class="ld">${esc(l.days)}</div>${l.note ? `<div class="ln">${esc(l.note)}</div>` : ''}</section>`).join('')}</div>`;
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
    return `${title('הלימוד היומי')}<div class="grid" style="grid-template-columns:repeat(${Math.min(list.length, 3)},1fr);align-content:center">
      ${list.map((l) => `<section class="card" style="text-align:center;align-items:center;justify-content:center;padding:44px 30px"><div class="label" style="font:700 34px var(--body);color:var(--ink-soft)">${esc(l.label)}</div><div style="font:900 62px/1.15 var(--display)">${esc(l.text)}</div></section>`).join('')}</div>`;
  },

  birthdays(ctx) {
    const hd = ctx.day.hd;
    const list = inHebrewRange(ctx.data.birthdays || [], hd, hd.add(6), birthdayIn);
    if (!list.length) return null;
    return `${title('מזל טוב! ימי הולדת השבוע')}<div class="grid" style="grid-template-columns:repeat(${Math.min(list.length, 3)},1fr);align-content:center">
      ${list.map((b) => `<section class="card ann simcha" style="padding:50px 30px"><div class="t">${esc(b.name)}</div>${flourish}<div class="b">${esc(renderHeb(b.hdate))}${b.note ? ` · ${esc(b.note)}` : ''}</div></section>`).join('')}</div>`;
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

export const LIVE_SCREENS = new Set(['netz']);

/** פס הגולל */
export function tickerItems(ctx) {
  const { day, s, prayersToday, lessonsToday } = ctx;
  const items = [];
  const keys = ['sunrise', 'shmaGRA', 'sunset', 'tzeit'];
  for (const k of keys) items.push(`${ZMAN_LABEL[k]} <b>${fmtTime(day.zmanim[k], s.tz, ZMANIM.find((z) => z.key === k).round)}</b>`);
  if (day.shabbat.candles) items.push(`${day.shabbat.candlesLabel} <b>${fmtTime(day.shabbat.candles, s.tz, 'floor')}</b>`);
  if (day.shabbat.parsha) items.push(day.shabbat.parshaIsChag ? esc(day.shabbat.parsha) : `פרשת ${esc(day.shabbat.parsha)}`);
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
