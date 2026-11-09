// בדיקת עבודה בלי אינטרנט ושעון לא מכוון – רץ ב-GitHub Actions
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const BASE = 'https://noam2058.github.io/hamishmert/index.html';
mkdirSync('out', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
const page = await ctx.newPage();
page.on('pageerror', (e) => log.push('pageerror: ' + e.message));
const state = async (name) => {
  await sleep(500);
  const s = await page.evaluate(() => ({
    loading: document.getElementById('loading')?.hidden === false ? document.getElementById('loading').textContent : '',
    date: document.getElementById('heb')?.textContent || document.querySelector('header')?.innerText.slice(0, 120),
    event: document.getElementById('event')?.textContent,
    holiday: document.getElementById('stage')?.dataset.holiday,
    season: document.getElementById('stage')?.dataset.season,
    warn: document.getElementById('clockwarn')?.hidden === false ? document.getElementById('clockwarn').innerText : '',
    slides: document.querySelectorAll('#dots i').length,
    sw: !!navigator.serviceWorker?.controller,
  }));
  log.push(`== ${name}: ${JSON.stringify(s)}`);
  await page.screenshot({ path: `out/${name}.jpg`, type: 'jpeg', quality: 80 });
};
// 1. טעינה ראשונה עם אינטרנט (מתקין את ה-Service Worker), ופעם שנייה כדי שישלוט בדף
await page.goto(BASE); await sleep(9000);
await page.reload(); await sleep(9000);
await state('1-online');
// 2. בלי אינטרנט – רענון (כמו הפעלה מחדש של הסטרימר בלי רשת)
await ctx.setOffline(true);
await page.reload(); await sleep(9000);
await state('2-offline-reload');
// 3. בלי אינטרנט כמה דקות של ריצה – מעבר שקופיות
await sleep(30000);
await state('3-offline-running');
// 4. בלי אינטרנט ושעון שחזר אחורה לדצמבר 2025 (כמו סטרימר בלי סוללה)
await page.clock.install({ time: new Date('2025-12-16T10:00:00+02:00') });
await page.reload(); await sleep(9000);
await state('4-offline-bad-clock');
// 5. השעון עדיין שגוי אבל האינטרנט חזר – הלוח אמור לתקן לבד
await ctx.setOffline(false);
await page.reload(); await sleep(10000);
await state('5-online-bad-clock');
writeFileSync('out/log.txt', log.join('\n'));
console.log(log.join('\n'));
await browser.close();
