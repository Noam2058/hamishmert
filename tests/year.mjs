// סריקת שנה: אירועים, חג ועונה לכל יום (בוקר וערב) – לבדיקה שאין אירוע מיותר או חג לא נכון
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://noam2058.github.io/hamishmert/index.html?demo&screens=greeting');
await page.waitForTimeout(4000);
const lines = await page.evaluate(async () => {
  const { computeDay } = await import('./js/jewish.js');
  const { demoData, normalize } = await import('./js/defaults.js');
  const s = normalize(demoData()).synagogue;
  const out = [];
  const t0 = new Date(); t0.setUTCHours(6, 0, 0, 0); // 08:00 שעון ישראל בחורף
  for (let t = t0; t < new Date(t0.getTime() + 400 * 86400000); t = new Date(t.getTime() + 86400000)) {
    for (const hh of [8, 20]) {
      const now = new Date(t.getTime() + (hh - 8) * 3600000);
      const d = computeDay(now, s);
      const ev = (d.night ? d.next.events : d.events).join(' | ');
      const tag = `${d.holiday}/${d.season}`;
      if (ev || !/^(weekday|shabbat)\/(weekday|shabbat)$/.test(tag)) out.push(`${now.toISOString().slice(0, 10)} ${hh}h ${d.night ? d.next.hebDate : d.hebDate}: ${tag} :: ${ev} :: ${(d.changes || []).map((c) => c.text || c).join(', ').slice(0, 120)}`);
    }
  }
  return out;
});
writeFileSync('out/log.txt', lines.join('\n')); console.log(lines.length);
await browser.close();
