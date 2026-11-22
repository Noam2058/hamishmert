import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('https://noam2058.github.io/hamishmert/index.html?demo&screens=zmanim'); await page.waitForTimeout(4000);
const r = await page.evaluate(async () => {
  const J = await import('./js/jewish.js'); const P = await import('./js/prayers.js'); const { demoData, normalize } = await import('./js/defaults.js');
  const s = normalize(demoData()).synagogue; const f = (d) => d ? d.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' }) : null;
  const out = [JSON.stringify(J.chaiInfo())];
  for (const ds of ['2026-11-22', '2026-11-28', '2027-03-26', '2027-06-15', '2027-10-10']) {
    const d = new Date(ds + 'T12:00:00');
    const calc = J.zmanimFor(d, { ...s, netzSource: 'calc' }); const chai = J.zmanimFor(d, { ...s, netzSource: 'chai' });
    const t = { zman: 'netzChai', offset: -21 };
    out.push(`${ds} calc ${f(calc.sunrise)} chai ${f(calc.netzChai)} | chai-mode sunrise ${f(chai.sunrise)} | vatikin-21 ${P.resolveTime ? P.resolveTime(t, d, s, {}) : '?'}`);
  }
  return out;
});
writeFileSync('out/log.txt', r.join('\n') + '\nerrors: ' + errs.join(' | ')); await browser.close();
