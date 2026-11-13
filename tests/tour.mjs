// סיור מלא בכל מסכי הלוח – צילום 1920×1080 + בדיקת חריגות. רץ ב-GitHub Actions.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const BASE = 'https://noam2058.github.io/hamishmert/index.html';
mkdirSync('out', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCREENS = ['greeting', 'combined', 'prayers', 'zmanim', 'shabbat', 'holidays', 'molad', 'announcements', 'neshama', 'memorials', 'netz', 'omer', 'halacha', 'learning', 'lessons', 'mishna', 'birthdays'];
const RUNS = [['real', '', '2026-11-17T08:20'], ['real', '', '2026-11-19T12:00'], ['real', '', '2026-11-28T10:00'], ['stress', 'demo&', '2026-11-17T08:20'], ['stress', 'demo&', '2026-12-07T18:00']];
const log = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
const page = await ctx.newPage();
page.on('pageerror', (e) => log.push('pageerror: ' + e.message));
// נתוני עומס
await page.goto(BASE + '?demo&screens=greeting'); await sleep(3000);
await page.evaluate(async () => {
  const { demoData, normalize } = await import('./js/defaults.js');
  const d = normalize(demoData()); d.display.offHours = { enabled: false, from: '23:30', to: '05:00' };
  const P = (name, schedule, value, note) => ({ id: 'x' + Math.random().toString(36).slice(2), name, schedule, note, time: { type: 'fixed', value } });
  d.prayers = d.prayers.filter((p) => p.schedule === 'holiday');
  [['שחרית ותיקין (נץ החמה)', '05:40', 'בבית המדרש הקטן'], ['שחרית א׳', '06:15'], ['שחרית ב׳', '07:00', 'בעזרת הנשים'], ['שחרית ג׳', '08:00'], ['מנחה גדולה', '13:15'], ['מנחה', '16:20', 'עשר דקות לפני השקיעה'], ['ערבית א׳', '17:10'], ['ערבית ב׳', '19:30'], ['ערבית מאוחרת', '21:30', 'בבית המדרש']].forEach((x) => d.prayers.push(P(x[0], 'weekday', x[1], x[2])));
  [['מנחה וקבלת שבת', '16:10', 'רבע שעה אחרי הדלקת הנרות'], ['ערבית', '17:10'], ['שיעור לפני ערבית', '16:45'], ['ערבית מאוחרת', '20:00']].forEach((x) => d.prayers.push(P(x[0], 'friday', x[1], x[2])));
  [['שחרית ותיקין', '05:41'], ['הנץ החמה (נראה)', '06:14'], ['שחרית', '08:00'], ['שחרית מניין צעירים', '09:00', 'בבית המדרש'], ['מנחה גדולה', '13:00'], ['מנחה', '16:10', 'בשעת כניסת השבת'], ['סעודה שלישית', '16:45'], ['ערבית מוצאי שבת', '17:11'], ['ערבית ב׳', '18:00']].forEach((x) => d.prayers.push(P(x[0], 'shabbat', x[1], x[2])));
  d.lessons = [['דף יומי', 'הרב משה כהן', [0, 1, 2, 3, 4], '05:00'], ['שיעור בפרשת השבוע', 'הרב דוד לוי', [1], '20:30'], ['הלכות שבת', 'הרב יוסף מזרחי', [6], '15:30'], ['משנה ברורה', 'הרב אברהם', [0, 2, 4], '21:00'], ['גמרא עיון למתקדמים', 'הרב יעקב', [3], '20:00'], ['שיעור נשים', 'הרבנית רחל', [2], '19:00']].map((l, i) => ({ id: 'l' + i, title: l[0], teacher: l[1], weekdays: l[2], time: { type: 'fixed', value: l[3] } }));
  d.announcements = [{ id: 'a1', style: 'simcha', title: 'מזל טוב!', body: 'למשפחת **לוי** לרגל הולדת הבת\nהקידוש בשבת אחרי התפילה\nכולם מוזמנים', dateMode: 'civil', from: '', to: '' }, { id: 'a2', style: 'general', title: 'הודעה חשובה לקהל המתפללים', body: 'החל מהשבוע הבא ישתנו זמני התפילות בימי החול. '.repeat(5), dateMode: 'civil', from: '', to: '' }];
  d.dedications = [{ id: 'n1', style: 'memorial', title: 'אברהם בן יצחק ז״ל', body: 'נלב״ע כ״ט חשון\nתנצב״ה', dateMode: 'civil', from: '', to: '' }];
  d.memorials = [...Array(8)].map((_, i) => ({ id: 'm' + i, name: 'פלוני בן אלמוני ' + i, by: 'המשפחה', hebDay: 3 + i * 3, hebMonth: 'Kislev' }));
  d.birthdays = [...Array(5)].map((_, i) => ({ id: 'b' + i, name: 'ילד ' + i, hebDay: 5 + i * 2, hebMonth: 'Kislev' }));
  localStorage.setItem('shulboard:demo', JSON.stringify(d));
});
const check = () => {
  const scr = document.querySelector('.screen.on'); if (!scr) return ['no screen'];
  const iss = []; const lim = scr.getBoundingClientRect().bottom;
  for (const c of scr.querySelectorAll('.card, .ann, .sb-card, .hol')) { const r = c.getBoundingClientRect(); if (r.height < 5) continue;
    if (r.bottom > lim + 1) iss.push('card clipped ' + Math.round(r.bottom - lim));
    for (const e of c.querySelectorAll('*')) { if (!e.childElementCount && e.textContent.trim()) { const cs = getComputedStyle(e); if (cs.position === 'absolute' || cs.display === 'none') continue; const q = e.getBoundingClientRect(); if (!q.height) continue; const o = Math.max(q.bottom - r.bottom, r.top - q.top, r.left - q.left, q.right - r.right); if (o > 1) iss.push('text outside: ' + e.textContent.trim().slice(0, 20)); } } }
  for (const rows of scr.querySelectorAll('.rows')) { const z = rows.style.getPropertyValue('--rz'); if (z && +z < 0.66) iss.push('small rz ' + z); }
  return [...new Set(iss)].slice(0, 4);
};
for (const [tag, mode, date] of RUNS) {
  for (const s of SCREENS) {
    await page.goto(`${BASE}?${mode}sec=999&date=${date}&screens=${s}`); await sleep(s === 'halacha' || s === 'mishna' ? 6500 : 3800);
    const has = await page.evaluate(() => !!document.querySelector('.screen.on'));
    if (!has) { log.push(`${tag} ${date} ${s}: (not shown)`); continue; }
    await page.addStyleTag({ content: '*{transition:none!important;animation-play-state:paused!important} .screen:not(.on){display:none!important}' }); await sleep(700);
    const iss = await page.evaluate(check);
    const name = `${tag}-${date.slice(5, 10)}-${s}`;
    await page.screenshot({ path: `out/${name}.jpg`, type: 'jpeg', quality: 80 });
    log.push(`${name}: ${iss.join(' ; ') || 'OK'}`);
  }
}
writeFileSync('out/log.txt', log.join('\n')); console.log(log.join('\n'));
await browser.close();
