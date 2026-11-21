// צילום ממשק הניהול בטלפון (מצב הדגמה) – כותרת ולשונית תפילות
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('https://noam2058.github.io/hamishmert/admin.html?demo');
await page.waitForTimeout(5000);
await page.screenshot({ path: 'out/admin-home.png' });
const b = page.locator('.nav button', { hasText: 'תפילות' }).first();
if (await b.count()) { await b.click(); await page.waitForTimeout(1500); }
await page.screenshot({ path: 'out/admin-prayers.png' });
writeFileSync('out/log.txt', 'errors: ' + errs.join(' | ') + '\nlinks: ' + (await page.locator('a[href^="print.html"]').count()));
await browser.close();
