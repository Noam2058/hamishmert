// צילומי מסך לסרטון התדמית – רץ ב-GitHub Actions (יש שם אינטרנט מלא), שומר JPEG לתיקייה out/
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'https://noam2058.github.io/hamishmert/';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// נתוני תצוגה לסרטון (מצב ניסיון – לא נוגע בנתונים האמיתיים)
async function seed(page) {
  await page.goto(BASE + 'index.html?demo&screens=greeting');
  await page.evaluate(async () => {
    const { demoData, normalize } = await import('./js/defaults.js');
    const d = normalize(demoData());
    d.synagogue.dedication = '';
    d.display.offHours = { enabled: false, from: '23:30', to: '05:00' };
    const F = (o) => ({ align: 'center', size: 'm', bold: false, underline: false, font: 'body', bg: 'auto', color: 'auto', ...o });
    d.lessons = [
      { id: 'l1', title: 'דף יומי', teacher: 'הרב משה כהן', weekdays: [0, 1, 2, 3, 4], time: { type: 'zman', zman: 'sunrise', offset: -60, round: 5, dir: 'down' } },
      { id: 'l2', title: 'שיעור בפרשת השבוע', teacher: 'הרב דוד לוי', weekdays: [1], time: { type: 'fixed', value: '20:30' } },
      { id: 'l3', title: 'הלכות שבת', teacher: 'הרב יוסף מזרחי', weekdays: [6], time: { type: 'zman', zman: 'candles', offset: -45, round: 5 }, note: 'לפני מנחה' },
    ];
    d.announcements = [
      { id: 'a1', style: 'simcha', title: 'מזל טוב!', body: 'למשפחת **לוי**\nלרגל הולדת הבת\nהקידוש בשבת אחרי התפילה', dateMode: 'civil', from: '', to: '', fmt: F({ size: 'l', font: 'display' }) },
      { id: 'a2', style: 'general', title: 'סעודה שלישית', body: 'בכל שבת בבית הכנסת\nלאחר תפילת מנחה\n__כולם מוזמנים__', dateMode: 'civil', from: '', to: '', fmt: F({ bg: 'gold', font: 'festive', size: 'l' }) },
    ];
    d.dedications = [{ id: 'n1', style: 'memorial', title: 'אברהם בן יצחק ז״ל', body: 'נלב״ע כ״ט חשון\nתנצב״ה', dateMode: 'civil', from: '', to: '', fmt: F({}) }];
    d.prayers.push(
      { id: 'h1', name: 'שחרית והלל', schedule: 'holiday', holiday: 'chanuka', time: { type: 'fixed', value: '06:15' } },
      { id: 'h2', name: 'מנחה והדלקת נרות', schedule: 'holiday', holiday: 'chanuka', time: { type: 'zman', zman: 'sunset', offset: -15, round: 5, dir: 'down' } },
      { id: 'h3', name: 'ערבית', schedule: 'holiday', holiday: 'chanuka', time: { type: 'zman', zman: 'tzeit', offset: 0, round: 0 } },
    );
    d.memorials = [{ id: 'm1', name: 'שרה בת רחל', by: 'המשפחה', hebDay: 2, hebMonth: 'Kislev' }];
    localStorage.setItem('shulboard:demo', JSON.stringify(d));
  });
}

async function boardShot(page, name, q, wait = 3800) {
  await page.goto(`${BASE}index.html?demo&sec=999&${q}`);
  await sleep(wait);
  await page.addStyleTag({ content: '.screen{transition:none!important} .screen:not(.on){display:none!important}' });
  await sleep(500);
  await page.screenshot({ path: `out/${name}.jpg`, type: 'jpeg', quality: 92 });
  console.log('shot', name);
}

// ---- הלוח (1920×1080) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const page = await ctx.newPage();
  await seed(page);
  // טעינת הלכה ומשנה מספריא למטמון
  await page.goto(`${BASE}index.html?demo&date=2026-11-17T08:00&screens=halacha,mishna`); await sleep(9000);
  const day = 'date=2026-11-17T08:10';
  for (const s of ['greeting', 'combined', 'prayers', 'zmanim', 'lessons', 'halacha', 'mishna', 'learning', 'announcements', 'neshama']) await boardShot(page, `b-${s}`, `${day}&screens=${s}`);
  await boardShot(page, 'b-shabbat', 'date=2026-11-19T12:00&screens=shabbat');
  await boardShot(page, 'b-molad', 'date=2026-11-30T10:00&screens=molad');
  await boardShot(page, 'b-holidays', 'date=2026-11-30T10:00&screens=holidays');
  const hol = { chanuka: '2026-12-07T17:30', purim: '2027-03-23T10:30', pesach: '2027-04-22T10:30', atzmaut: '2027-05-12T10:30', lag: '2027-05-25T18:00',
    shavuot: '2028-05-31T10:30', rh: '2028-09-21T10:30', yk: '2027-10-11T11:00', sukkot: '2028-10-05T10:30', rc: '2026-11-11T10:30', erevshabbat: '2026-11-20T14:00' };
  for (const [k, d] of Object.entries(hol)) await boardShot(page, `h-${k}`, `date=${d}&screens=greeting`);
  await boardShot(page, 'h-chanuka-combined', 'date=2026-12-07T09:00&screens=combined');
  for (const t of ['royal', 'sky', 'sephardi', 'stone', 'night', 'chassidic', 'ashkenaz']) {
    await boardShot(page, `t-${t}`, `${day}&screens=combined&theme=${t}`);
    await boardShot(page, `tg-${t}`, `${day}&screens=greeting&theme=${t}`);
  }
  await ctx.close();
}

// ---- ממשק הניהול (מחשב) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', colorScheme: 'light' });
  const page = await ctx.newPage();
  await seed(page);
  await page.goto(BASE + 'admin.html?demo'); await sleep(3500);
  const tab = async (k) => { await page.click(`nav button[data-tab="${k}"]`); await sleep(900); };
  await tab('home'); await page.screenshot({ path: 'out/a-home.jpg', type: 'jpeg', quality: 90 });
  await page.evaluate(() => scrollTo(0, 620)); await sleep(500); await page.screenshot({ path: 'out/a-home2.jpg', type: 'jpeg', quality: 90 });
  await tab('prayers');
  await page.evaluate(() => { const it = document.querySelector('.item'); it.open = true; it.dispatchEvent(new Event('toggle')); }); await sleep(600);
  await page.screenshot({ path: 'out/a-prayers.jpg', type: 'jpeg', quality: 90 });
  await tab('announcements');
  await page.evaluate(() => { const it = document.querySelector('.item'); it.open = true; }); await sleep(600);
  await page.evaluate(() => scrollTo(0, 120)); await sleep(300);
  await page.screenshot({ path: 'out/a-ann.jpg', type: 'jpeg', quality: 90 });
  await tab('holidayPrayers'); await page.screenshot({ path: 'out/a-hol.jpg', type: 'jpeg', quality: 90 });
  await tab('display'); await page.screenshot({ path: 'out/a-display.jpg', type: 'jpeg', quality: 90 });
  await ctx.close();
}

// ---- טלפון: דף המתפללים וממשק הניהול ----
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'he-IL', timezoneId: 'Asia/Jerusalem', colorScheme: 'light' });
  const page = await ctx.newPage();
  await seed(page);
  await page.goto(BASE + 'm.html?demo'); await sleep(6000);
  await page.goto(BASE + 'm.html?demo'); await sleep(4000);
  await page.screenshot({ path: 'out/m-full.jpg', type: 'jpeg', quality: 88, fullPage: true });
  await page.screenshot({ path: 'out/m-top.jpg', type: 'jpeg', quality: 90 });
  await page.goto(BASE + 'admin.html?demo'); await sleep(3500);
  await page.screenshot({ path: 'out/am-home.jpg', type: 'jpeg', quality: 90 });
  await ctx.close();
}

// ---- דף להדפסה ----
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1500 }, deviceScaleFactor: 1.5, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const page = await ctx.newPage();
  await seed(page);
  await page.goto(BASE + 'print.html?demo'); await sleep(4000);
  await page.evaluate(() => { const s = document.querySelector('#sheet'); s.style.zoom = ''; });
  await (await page.$('#sheet')).screenshot({ path: 'out/p-sheet.jpg', type: 'jpeg', quality: 90 });
  await ctx.close();
}
await browser.close();
console.log('done');
