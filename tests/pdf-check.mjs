import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch(); const ctx = await browser.newContext({ acceptDownloads: true }); const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('dialog', (d) => { errs.push('dialog ' + d.message()); d.dismiss(); });
await page.goto('https://noam2058.github.io/hamishmert/print.html?week=2'); await page.waitForTimeout(6000);
await page.screenshot({ path: 'out/page.jpg', quality: 80 });
page.on('console', (m) => errs.push('console ' + m.type() + ': ' + m.text()));
let dl = null;
try { [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.click('#pdfbtn')]); await dl.saveAs('out/sheet.pdf'); }
catch (e) { writeFileSync('out/log.txt', 'FAIL ' + e.message + '\nerrors: ' + errs.join(' | ')); await page.screenshot({ path: 'out/after.jpg' }); await browser.close(); process.exit(0); }
const buf = readFileSync('out/sheet.pdf').toString('latin1');
const uris = [...buf.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((m) => m[1]);
const rects = [...buf.matchAll(/\/Rect\s*\[([^\]]*)\]/g)].map((m) => m[1]);
writeFileSync('out/log.txt', `name: ${dl.suggestedFilename()}\nuris: ${JSON.stringify(uris)}\nrects: ${JSON.stringify(rects)}\nerrors: ${errs.join(' | ')}`);
await browser.close();
