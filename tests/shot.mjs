// צילומי מסך לפי בקשה: SHOTS="שם|פרמטרים;שם|פרמטרים" (לדוגמה: fri|screens=greeting&date=2026-11-27T15:00)
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const phone = await browser.newPage({ ...devices['iPhone 13'] });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
for (const item of (process.env.SHOTS || '').split(';').filter(Boolean)) {
  const [name, q] = item.split('|');
  // שם שמתחיל ב-phone = צילום בטלפון (כל הדף); פרמטר שמתחיל ב-/ = דף אחר (למשל /m.html)
  const pg = name.startsWith('phone') ? phone : page;
  await pg.goto(q.startsWith('/') ? `https://noam2058.github.io/hamishmert${q}` : `https://noam2058.github.io/hamishmert/index.html?${q}`);
  await pg.waitForTimeout(7000);
  await pg.screenshot({ path: `out/${name}.jpg`, quality: 80, fullPage: name.startsWith('phone') });
}
writeFileSync('out/log.txt', 'errors: ' + errs.join(' | '));
await browser.close();
