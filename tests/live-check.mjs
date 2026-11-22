// בדיקת הלוח החי: הגדרות נץ, תפילות שתלויות בנץ, וצילומים
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const B = 'https://noam2058.github.io/hamishmert/';
await page.goto(B + 'index.html?screens=greeting'); await page.waitForTimeout(5000);
const info = await page.evaluate(async () => {
  const { load } = await import('./js/store.js'); const { normalize } = await import('./js/defaults.js');
  const J = await import('./js/jewish.js'); const P = await import('./js/prayers.js');
  const raw = await load(); const d = normalize(raw.data || raw); const s = d.synagogue;
  const f = (x) => (x ? x.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' }) : '-');
  const out = [`netzSource=${s.netzSource} chai=${JSON.stringify(J.chaiInfo())}`];
  out.push('prayers with zman rules:');
  for (const p of d.prayers || []) { const t = p.time || {}; if (t.type === 'zman') out.push(`  [${p.schedule}] ${p.name}: ${t.offset} ${t.zman} basis=${t.basis || ''}`); }
  for (const ds of ['2026-11-23', '2026-11-27', '2026-11-28']) {
    const civ = new Date(ds + 'T12:00:00'); const z = J.zmanimFor(civ, s);
    const day = J.computeDay(new Date(ds + 'T05:00:00'), s);
    let rows = []; try { rows = P.prayersForDay(day, d, s, day.civil, day.tags, true).map((r) => `${r.name} ${r.time || J.minToHhmm?.(r.min) || ''}`); } catch (e) { rows = ['ERR ' + e.message]; }
    out.push(`${ds}: sunrise(used)=${f(z.sunrise)} calc=${f(z.sunriseCalc)} chai=${f(z.netzChai)} :: ${rows.join(' | ')}`);
  }
  return out;
});
for (const [n, q] of [['prayers', 'screens=prayers'], ['zmanim', 'screens=zmanim'], ['shabbat', 'screens=prayers&date=2026-11-27T12:00']]) {
  await page.goto(B + 'index.html?' + q); await page.waitForTimeout(6000); await page.screenshot({ path: `out/${n}.jpg`, quality: 85 });
}
await page.goto(B + 'print.html'); await page.waitForTimeout(6000); await page.screenshot({ path: 'out/print.jpg', quality: 85, fullPage: true });
writeFileSync('out/log.txt', info.join('\n') + '\nerrors: ' + errs.join(' | ')); await browser.close();
