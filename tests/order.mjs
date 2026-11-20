// בדיקת סדר מסכים: הסדר השמור מול הסדר שהלוח מציג בפועל
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const log = [];
await page.goto('https://noam2058.github.io/hamishmert/index.html?sec=3');
await page.waitForTimeout(5000);
const saved = await page.evaluate(async () => {
  const { load } = await import('./js/store.js'); const { normalize } = await import('./js/defaults.js');
  const raw = await load(); const d = normalize(raw.data || raw);
  return { raw: (raw.data || raw).display.screens.map((s) => `${s.type}${s.enabled ? '' : '(off)'}`), norm: d.display.screens.filter((s) => s.enabled).map((s) => s.type) };
});
log.push('saved raw: ' + saved.raw.join(', '), 'enabled (normalized): ' + saved.norm.join(', '));
const seen = [];
for (let i = 0; i < 70; i++) {
  const k = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('shulboard:resume')).key; } catch { return null; } });
  if (k && seen[seen.length - 1] !== k) seen.push(k);
  await page.waitForTimeout(1000);
}
log.push('shown: ' + seen.join(' → '));
writeFileSync('out/log.txt', log.join('\n')); console.log(log.join('\n'));
await browser.close();
