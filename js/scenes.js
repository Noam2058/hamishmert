// רקעים לכל שקופית ולכל חג – מצוירים בקוד (canvas), בלי קבצי תמונה.
// הרכב: העניין הוויזואלי בשוליים ובפינות, והאמצע שקט יותר כי שם יושבים הכרטיסים.
import {
  W, H, rng, canvas, rrect, hsl, lin, rad, star, flame, grain, stone,
  kotel, jerusalem, heichal, papercut, candlestick, chanukiah, shofarApples, purimMasks, seder, torahScroll, PALETTES,
} from './art.js';

// ---------- כלים משותפים ----------
const TAU = Math.PI * 2;
function fill(g, style) { g.fillStyle = style; g.fillRect(0, 0, W, H); }
function stars(g, rand, n, maxY = H * 0.6, big = 0.04) {
  for (let i = 0; i < n; i++) {
    const x = rand() * W, y = rand() * maxY, r = rand() < big ? 2.4 : 0.6 + rand() * 1.3;
    g.fillStyle = `rgba(255,250,235,${0.25 + rand() * 0.7})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (r > 2) { g.fillStyle = rad(g, x, y, 0, 14, [[0, 'rgba(255,250,235,.35)'], [1, 'rgba(255,250,235,0)']]); g.fillRect(x - 14, y - 14, 28, 28); }
  }
}
/** שכבת הרים: base = גובה ממוצע, amp = משרעת */
function ridge(g, rand, base, amp, color, f = 1, seed = 0) {
  g.fillStyle = color; g.beginPath(); g.moveTo(0, H);
  const p1 = rand() * 10, p2 = rand() * 10;
  for (let x = 0; x <= W + 20; x += 20) {
    const y = base - amp * (0.55 * Math.sin(x / (330 / f) + p1 + seed) + 0.3 * Math.sin(x / (120 / f) + p2) + 0.15 * Math.sin(x / (47 / f) + seed));
    g.lineTo(x, y);
  }
  g.lineTo(W, H); g.closePath(); g.fill();
}
function vignette(g, a = 0.55, inner = 0.45) {
  g.fillStyle = rad(g, W / 2, H / 2, H * inner, W * 0.62, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${a})`]]);
  g.fillRect(0, 0, W, H);
}
function bokeh(g, rand, n, cols, area = [0, 0, W, H], rMin = 8, rMax = 40) {
  const [x0, y0, w, h] = area;
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * w, y = y0 + rand() * h, r = rMin + rand() * (rMax - rMin), c = cols[i % cols.length];
    g.fillStyle = rad(g, x, y, 0, r, [[0, c.replace('A', (0.35 + rand() * 0.3).toFixed(2))], [0.7, c.replace('A', '0.12')], [1, c.replace('A', '0')]]);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
}
function glow(g, x, y, r, col, a = 0.6) {
  g.fillStyle = rad(g, x, y, 0, r, [[0, col.replace('A', a)], [1, col.replace('A', '0')]]);
  g.fillRect(x - r, y - r, 2 * r, 2 * r);
}
function rays(g, x, y, n, len, col, spread = TAU, start = 0, width = 0.06, alpha = 0.09) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = start + (spread * i) / n;
    g.fillStyle = lin(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, [[0, col.replace('A', String(alpha))], [1, col.replace('A', '0')]]);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - width) * len, y + Math.sin(a - width) * len); g.lineTo(x + Math.cos(a + width) * len, y + Math.sin(a + width) * len); g.closePath(); g.fill();
  }
  g.restore();
}
function confetti(g, rand, n, area = [0, 0, W, H], sat = 80) {
  const [x0, y0, w, h] = area;
  for (let i = 0; i < n; i++) {
    g.save(); g.translate(x0 + rand() * w, y0 + rand() * h); g.rotate(rand() * TAU);
    g.fillStyle = hsl(rand() * 360, sat, 55 + rand() * 15, 0.9);
    if (rand() < 0.5) g.fillRect(-7, -3, 14, 6); else { g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); }
    g.restore();
  }
}
function olive(g, rand, x, y, s) { // עץ זית – גזע מפותל ונוף כסוף
  g.fillStyle = '#3b2e22';
  g.beginPath(); g.moveTo(x - 18 * s, y); g.bezierCurveTo(x - 30 * s, y - 60 * s, x + 20 * s, y - 80 * s, x - 6 * s, y - 130 * s);
  g.lineTo(x + 12 * s, y - 130 * s); g.bezierCurveTo(x + 40 * s, y - 80 * s, x - 4 * s, y - 50 * s, x + 22 * s, y); g.fill();
  for (let i = 0; i < 16; i++) {
    const a = rand() * TAU, d = rand() * 70 * s;
    g.fillStyle = hsl(85 + rand() * 25, 18 + rand() * 12, 30 + rand() * 16, 0.92);
    g.beginPath(); g.ellipse(x + Math.cos(a) * d * 1.4, y - 170 * s + Math.sin(a) * d * 0.6, 50 * s, 32 * s, rand(), 0, TAU); g.fill();
  }
}
function cypress(g, x, base, h, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, base - h / 2, h * 0.11, h / 2, 0, 0, TAU); g.fill(); }
/** קו רקיע עירוני בגוון אחד, עם חלונות מוארים */
function skyline(g, rand, base, col, lights = 0, light = 'rgba(255,205,120,A)') {
  for (let x = -20; x < W; ) {
    const w = 50 + rand() * 90, h = 40 + rand() * 110; g.fillStyle = col; g.fillRect(x, base - h, w + 2, h + 2);
    if (rand() < 0.18) { g.beginPath(); g.arc(x + w / 2, base - h, w * 0.32, Math.PI, 0); g.fill(); }
    for (let i = 0; i < lights * w * h / 4000; i++) { g.fillStyle = light.replace('A', (0.5 + rand() * 0.5).toFixed(2)); g.fillRect(x + 6 + rand() * (w - 14), base - h + 8 + rand() * (h - 16), 5, 7); }
    x += w;
  }
}
function crescent(g, x, y, r, phase = 0.55, col = '#fff6d8') {
  glow(g, x, y, r * 3.2, 'rgba(255,246,216,A)', 0.25);
  const [c, m] = canvas(r * 2 + 4, r * 2 + 4);
  m.fillStyle = col; m.beginPath(); m.arc(r + 2, r + 2, r, 0, TAU); m.fill();
  m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(r + 2 + r * 2 * phase, r + 2 - r * 0.1, r * 1.02, 0, TAU); m.fill();
  g.drawImage(c, x - r - 2, y - r - 2);
}
function pomegranate(g, rand, x, y, s, open = false) {
  g.save(); g.translate(x, y);
  g.fillStyle = rad(g, -18 * s, -20 * s, 4, 90 * s, [[0, '#ff6b5e'], [0.55, '#b4162a'], [1, '#5a0812']]);
  g.beginPath(); g.arc(0, 0, 70 * s, 0, TAU); g.fill();
  g.fillStyle = '#7a0e1b'; g.beginPath(); // כתר
  g.moveTo(-24 * s, -62 * s); for (let i = 0; i <= 5; i++) { const px = -24 * s + i * 9.6 * s; g.lineTo(px, i % 2 ? -78 * s : -96 * s); } g.lineTo(24 * s, -62 * s); g.fill();
  if (open) {
    g.fillStyle = '#f1d3a6'; g.beginPath(); g.ellipse(10 * s, 8 * s, 44 * s, 34 * s, 0.3, 0, TAU); g.fill();
    for (let i = 0; i < 40; i++) { const a = rand() * TAU, d = rand() * 30 * s; g.fillStyle = rand() < 0.5 ? '#c2112a' : '#e8344a'; g.beginPath(); g.ellipse(10 * s + Math.cos(a) * d * 1.3, 8 * s + Math.sin(a) * d, 5 * s, 6.5 * s, a, 0, TAU); g.fill(); }
  }
  g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-30 * s, -28 * s, 14 * s, 22 * s, -0.6, 0, TAU); g.fill();
  g.restore();
}
function leaf(g, x, y, len, w, a, col) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len / 2, -w, len, 0); g.quadraticCurveTo(len / 2, w, 0, 0); g.fill(); g.restore(); }
function flower(g, x, y, r, col, center = '#2a1a10', petals = 6) {
  for (let p = 0; p < petals; p++) { const a = (p / petals) * TAU; g.fillStyle = col; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.62, r * 0.4, a, 0, TAU); g.fill(); }
  g.fillStyle = center; g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill();
}
function branch(g, rand, x, y, a, len, depth, leafFn) {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  g.strokeStyle = '#4a3326'; g.lineWidth = Math.max(2, depth * 4.5); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + ex) / 2 + (rand() - 0.5) * len * 0.3, (y + ey) / 2 + (rand() - 0.5) * len * 0.3, ex, ey); g.stroke();
  if (depth <= 1) { leafFn(ex, ey); return; }
  for (let i = 0; i < 2 + (rand() < 0.4 ? 1 : 0); i++) branch(g, rand, ex, ey, a + (rand() - 0.5) * 1.1, len * (0.62 + rand() * 0.15), depth - 1, leafFn);
  if (rand() < 0.7) leafFn((x + ex) / 2, (y + ey) / 2);
}
function bunting(g, rand, x0, y0, x1, y1, sag, cols, size = 46) {
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); g.stroke();
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / (size * 1.25));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + x1) / 2 + t * t * x1, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag) + t * t * y1;
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(x - size / 2, y); g.lineTo(x + size / 2, y); g.lineTo(x, y + size * 1.1); g.closePath(); g.fill();
  }
}
function stringLights(g, x0, y0, x1, y1, sag, n, col = 'rgba(255,214,140,A)') {
  g.strokeStyle = 'rgba(20,15,10,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); g.stroke();
  for (let i = 1; i < n; i++) {
    const t = i / n, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + x1) / 2 + t * t * x1, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag) + t * t * y1;
    glow(g, x, y + 8, 30, col, 0.5); g.fillStyle = col.replace('A', '1'); g.beginPath(); g.ellipse(x, y + 8, 6, 9, 0, 0, TAU); g.fill();
  }
}
function memorialCandle(g, x, y, s) { // נר נשמה בכוס
  glow(g, x, y - 150 * s, 360 * s, 'rgba(255,190,100,A)', 0.4);
  g.fillStyle = lin(g, x - 60 * s, 0, x + 60 * s, 0, [[0, 'rgba(255,255,255,.10)'], [0.3, 'rgba(255,255,255,.32)'], [1, 'rgba(255,255,255,.06)']]);
  rrect(g, x - 58 * s, y - 170 * s, 116 * s, 170 * s, 10 * s); g.fill();
  g.fillStyle = lin(g, 0, y - 120 * s, 0, y, [[0, '#f3ead7'], [1, '#c9b995']]); rrect(g, x - 50 * s, y - 120 * s, 100 * s, 116 * s, 6 * s); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y - 120 * s); g.lineTo(x, y - 132 * s); g.stroke();
  flame(g, x, y - 146 * s, 0.9 * s);
}
function arch(g, x, y, w, h) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); }

// ======================================================================
//  רקעים לימים רגילים – אחד לכל סוג שקופית
// ======================================================================

// זמני היום: שמי יום מעל הרי הגליל, עם מסלול השמש המסומן כמו שעון שמש
function sunpath(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#1f4f8a'], [0.45, '#5f93c6'], [0.72, '#cfe0e8'], [1, '#e9e1c8']]));
  const cx = W / 2, cy = 880, R = 760;
  g.setLineDash([4, 18]); g.strokeStyle = 'rgba(255,248,220,.55)'; g.lineWidth = 4;
  g.beginPath(); g.ellipse(cx, cy, R, 700, 0, Math.PI, TAU); g.stroke(); g.setLineDash([]);
  for (let i = 1; i < 12; i++) { // שעות היום
    const a = Math.PI + (i / 12) * Math.PI, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * 700;
    g.fillStyle = 'rgba(255,248,220,.75)'; g.beginPath(); g.arc(x, y, i === 6 ? 7 : 4, 0, TAU); g.fill();
  }
  const a = Math.PI * 1.78, sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * 700;
  glow(g, sx, sy, 420, 'rgba(255,240,190,A)', 0.55); rays(g, sx, sy, 18, 520, 'rgba(255,244,200,A)', TAU, 0.1, 0.03);
  g.fillStyle = rad(g, sx, sy, 0, 56, [[0, '#fffef4'], [0.7, '#fff2bf'], [1, 'rgba(255,230,150,0)']]); g.beginPath(); g.arc(sx, sy, 56, 0, TAU); g.fill();
  for (let i = 0; i < 7; i++) { // עננים קלים
    const x = rand() * W, y = 90 + rand() * 260; g.fillStyle = 'rgba(255,255,255,.18)';
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + k * 46 - 120, y + Math.sin(k) * 10, 80, 22, 0, 0, TAU); g.fill(); }
  }
  ridge(g, rand, 760, 70, '#8ea3b4', 0.8, 1); ridge(g, rand, 820, 60, '#6d8a83', 1, 2); ridge(g, rand, 900, 55, '#4f6f4e', 1.3, 3); ridge(g, rand, 990, 40, '#33502f', 1.6, 4);
  for (let i = 0; i < 9; i++) olive(g, rand, (i < 5 ? 40 + i * 110 : W - 40 - (i - 5) * 120) + rand() * 30, 1060 + rand() * 20, 0.75 + rand() * 0.3);
  for (let i = 0; i < 10; i++) cypress(g, rand() * W, 930 + rand() * 40, 60 + rand() * 60, '#2a4529');
  vignette(g, 0.35);
}

// הנץ: זריחה מעל הרי מואב
function sunrise(g, rand) {
  fill(g, lin(g, 0, 0, 0, 800, [[0, '#1a1c48'], [0.38, '#523a74'], [0.62, '#c8608a'], [0.82, '#f4a261'], [1, '#ffe2a8']]));
  stars(g, rand, 120, 260, 0.02);
  const sx = W * 0.62, sy = 760;
  glow(g, sx, sy, 900, 'rgba(255,190,110,A)', 0.55); rays(g, sx, sy, 26, 1000, 'rgba(255,220,160,A)', Math.PI, Math.PI, 0.025);
  g.fillStyle = rad(g, sx, sy, 0, 120, [[0, '#fffbe6'], [0.6, '#ffd27a'], [1, '#ff9a3c']]); g.beginPath(); g.arc(sx, sy, 120, Math.PI, TAU); g.fill();
  for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(255,${160 + i * 15},${120 + i * 10},.25)`; g.fillRect(0, 520 + i * 46 + rand() * 20, W, 4 + rand() * 6); } // פסי עננים
  ridge(g, rand, 770, 40, '#7a4a6e', 0.7, 1); ridge(g, rand, 820, 60, '#4e2f52', 0.9, 2); ridge(g, rand, 900, 70, '#2e1d3a', 1.2, 3);
  skyline(g, rand, 1000, '#1b1226', 0.6, 'rgba(255,200,120,A)');
  g.fillStyle = '#120c1a'; g.fillRect(0, 998, W, H - 998);
  vignette(g, 0.4);
}

// שבת: ירושלים בדמדומים, שלושה כוכבים ופמוטים בפינות
function shabbatEve(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#121a3c'], [0.45, '#3c2350'], [0.7, '#8a3f4a'], [0.85, '#d98a54'], [1, '#f2c27a']]));
  stars(g, rand, 90, 380, 0.02);
  for (const [x, y] of [[1460, 140], [1530, 190], [1410, 215]]) { glow(g, x, y, 40, 'rgba(255,250,230,A)', 0.8); g.fillStyle = '#fffbe9'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); } // שלושה כוכבים
  ridge(g, rand, 820, 40, '#5a3048', 0.7, 1);
  skyline(g, rand, 900, '#2b1830', 1.4);
  g.fillStyle = '#2b1830'; g.beginPath(); g.arc(1180, 790, 60, Math.PI, 0); g.fill(); g.fillRect(1100, 790, 160, 30); // כיפה
  g.fillStyle = '#1b0f20'; g.fillRect(0, 898, W, H - 898);
  bokeh(g, rand, 40, ['rgba(255,200,120,A)', 'rgba(255,170,90,A)'], [0, 820, W, 260], 10, 46);
  candlestick(g, 170, 1060, 0.62); candlestick(g, 300, 1060, 0.62);
  candlestick(g, W - 300, 1060, 0.62); candlestick(g, W - 170, 1060, 0.62);
  vignette(g, 0.45);
}

// אזכרות: קיר אבן בחושך ונר נשמה
function yahrzeit(g, rand) {
  fill(g, '#14161c');
  let y = 0, row = 0;
  while (y < H) { const h = 90 + rand() * 40; let x = -rand() * 200; while (x < W) { const w = 180 + rand() * 260; stone(g, rand, x, y, w, h, 34, 26 + rand() * 6); x += w; } y += h; row++; }
  fill(g, 'rgba(10,12,20,.55)');
  memorialCandle(g, 230, 1010, 1.15);
  memorialCandle(g, W - 230, 1010, 1.15);
  vignette(g, 0.7, 0.3);
}

// ספירת העומר / שבועות: שדה חיטה בשעת הזהב
function wheatField(g, rand) {
  fill(g, lin(g, 0, 0, 0, 700, [[0, '#5b86b8'], [0.55, '#e8c48a'], [1, '#f6dca4']]));
  glow(g, W * 0.3, 620, 700, 'rgba(255,225,160,A)', 0.6);
  ridge(g, rand, 640, 40, '#9a9a7a', 0.8, 1); ridge(g, rand, 690, 30, '#8a8456', 1, 2);
  g.fillStyle = lin(g, 0, 680, 0, H, [[0, '#c9a24f'], [1, '#7a5a22']]); g.fillRect(0, 680, W, H - 680);
  for (let i = 0; i < 1500; i++) {
    const y = 700 + Math.pow(rand(), 0.7) * 400, x = rand() * W, s = 0.4 + (y - 700) / 300, sway = (rand() - 0.4) * 18 * s;
    g.strokeStyle = hsl(40 + rand() * 8, 55, 38 + rand() * 18); g.lineWidth = 1.4 * s;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + sway / 2, y - 30 * s, x + sway, y - 60 * s); g.stroke();
    g.fillStyle = hsl(42 + rand() * 6, 62, 52 + rand() * 14);
    g.beginPath(); g.ellipse(x + sway, y - 70 * s, 3.4 * s, 12 * s, sway / 60, 0, TAU); g.fill();
  }
  vignette(g, 0.4);
}

// לימוד יומי: ספרייה של ספרי קודש
function library(g, rand, pal) {
  fill(g, '#2a1a10');
  const shelfH = 190, cols = ['#5c1520', '#1e3358', '#1f4a36', '#3d2a1a', '#6b3a18', '#2a2a2a', '#4a1830'];
  for (let y = 20; y < H; y += shelfH) {
    let x = 0;
    while (x < W) {
      const w = 24 + rand() * 30, h = shelfH * (0.62 + rand() * 0.28), c = cols[Math.floor(rand() * cols.length)];
      g.fillStyle = lin(g, x, 0, x + w, 0, [[0, 'rgba(0,0,0,.35)'], [0.3, c], [0.7, c], [1, 'rgba(0,0,0,.45)']]);
      g.fillRect(x, y + shelfH - 22 - h, w - 2, h);
      g.fillStyle = c; g.globalAlpha = 0.9; g.fillRect(x + 3, y + shelfH - 22 - h, w - 8, h); g.globalAlpha = 1;
      g.fillStyle = 'rgba(230,195,110,.75)'; // הטבעה מוזהבת
      g.fillRect(x + 5, y + shelfH - 22 - h + 14, w - 12, 3); g.fillRect(x + 5, y + shelfH - 22 - 18, w - 12, 3);
      for (let k = 0; k < 3; k++) g.fillRect(x + w / 2 - 5, y + shelfH - 22 - h + 34 + k * 14, 8, 6);
      x += w + (rand() < 0.04 ? 30 : 0);
    }
    g.fillStyle = lin(g, 0, y + shelfH - 24, 0, y + shelfH, [[0, '#7a5232'], [1, '#3a2414']]); g.fillRect(0, y + shelfH - 24, W, 24);
  }
  glow(g, W / 2, -60, 1100, 'rgba(255,200,120,A)', 0.35);
  fill(g, 'rgba(20,10,5,.25)');
  vignette(g, 0.65, 0.35);
}

// הלכה יומית: חלונות ויטראז׳ בבית הכנסת
function stainedGlass(g, rand, pal) {
  fill(g, lin(g, 0, 0, 0, H, [[0, pal.wall[0]], [1, pal.wall[1]]]));
  g.strokeStyle = 'rgba(255,220,150,.05)'; g.lineWidth = 2;
  for (let y = 60; y < H; y += 120) for (let x = (y / 120) % 2 ? 60 : 0; x < W; x += 120) star(g, x, y, 22);
  const glassCols = ['#1f5fa8', '#c8312b', '#e2b23a', '#2e8b57', '#7b2fa0', '#3aa0c8'];
  const window_ = (x, y, w, h) => {
    g.save(); arch(g, x, y, w, h); g.clip();
    for (let i = 0; i < 70; i++) { // שברי זכוכית
      const px = x + rand() * w, py = y + rand() * h, r = 30 + rand() * 50;
      g.fillStyle = glassCols[Math.floor(rand() * glassCols.length)]; g.beginPath();
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + rand(); g[k ? 'lineTo' : 'moveTo'](px + Math.cos(a) * r, py + Math.sin(a) * r); }
      g.closePath(); g.fill(); g.strokeStyle = '#1b1410'; g.lineWidth = 5; g.stroke();
    }
    g.strokeStyle = '#f3e3b0'; g.lineWidth = 9; star(g, x + w / 2, y + w / 2 + 20, w * 0.3);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, w, h);
    g.restore();
    g.strokeStyle = pal.gold[0]; g.lineWidth = 14; arch(g, x, y, w, h); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; // אלומת אור
    g.fillStyle = lin(g, x, y + h, x + w * 2, H, [[0, 'rgba(255,230,170,.16)'], [1, 'rgba(255,230,170,0)']]);
    g.beginPath(); g.moveTo(x, y + h * 0.4); g.lineTo(x + w, y + h * 0.4); g.lineTo(x + w * 2.4, H); g.lineTo(x + w * 0.6, H); g.closePath(); g.fill(); g.restore();
  };
  window_(70, 140, 260, 640); window_(W - 330, 140, 260, 640);
  g.save(); g.beginPath(); g.arc(W / 2, 40, 150, 0, TAU); g.clip(); // חלון עגול עליון
  for (let i = 0; i < 12; i++) { g.fillStyle = glassCols[i % glassCols.length]; g.beginPath(); g.moveTo(W / 2, 40); g.arc(W / 2, 40, 150, (i / 12) * TAU, ((i + 1) / 12) * TAU); g.fill(); }
  g.strokeStyle = '#1b1410'; g.lineWidth = 6; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(W / 2, 40); g.lineTo(W / 2 + Math.cos((i / 12) * TAU) * 150, 40 + Math.sin((i / 12) * TAU) * 150); g.stroke(); }
  g.restore(); g.strokeStyle = pal.gold[0]; g.lineWidth = 12; g.beginPath(); g.arc(W / 2, 40, 150, 0, TAU); g.stroke();
  vignette(g, 0.5);
}

// ימי הולדת: דגלונים, בלונים וקונפטי
function festive(g, rand, pal) {
  fill(g, lin(g, 0, 0, W, H, [[0, pal.field[0]], [1, pal.field[1]]]));
  bokeh(g, rand, 30, ['rgba(255,215,130,A)', 'rgba(255,255,255,A)'], [0, 0, W, H], 10, 60);
  const cols = ['#e6c97a', '#c8312b', '#2f6db5', '#f4f1ea', '#2e8b57'];
  bunting(g, rand, -20, 40, 760, 30, 120, cols); bunting(g, rand, W - 760, 30, W + 20, 40, 120, cols);
  const balloon = (x, y, c) => {
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 86); g.bezierCurveTo(x - 20, y + 160, x + 20, y + 220, x, y + 300); g.stroke();
    g.fillStyle = rad(g, x - 20, y - 26, 4, 100, [[0, '#ffffff'], [0.2, c], [1, 'rgba(0,0,0,.4)']]); g.beginPath(); g.ellipse(x, y, 64, 82, 0, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(x - 8, y + 84); g.lineTo(x + 8, y + 84); g.lineTo(x, y + 96); g.fill();
  };
  [[110, 760, '#c8312b'], [230, 700, '#e6c97a'], [170, 880, '#2f6db5'], [W - 110, 760, '#2e8b57'], [W - 230, 690, '#c8312b'], [W - 170, 880, '#e6c97a']].forEach(([x, y, c]) => balloon(x, y, c));
  confetti(g, rand, 160, [0, 0, 520, H]); confetti(g, rand, 160, [W - 520, 0, 520, H]);
  vignette(g, 0.45);
}

// הילולא: לילה בהרי הגליל – צפת ומירון
function safed(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#070b1f'], [0.6, '#1a2350'], [1, '#2f2a4a']]));
  stars(g, rand, 380, 700, 0.03);
  crescent(g, 1650, 170, 46, 0.5);
  ridge(g, rand, 760, 120, '#1a1c34', 0.6, 1);
  const fx = 520, fy = 700; glow(g, fx, fy, 260, 'rgba(255,140,50,A)', 0.6); // מדורה על ההר
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,${150 + rand() * 80},60,${rand()})`; g.fillRect(fx + (rand() - 0.5) * 120, fy - rand() * 260, 3, 3); }
  ridge(g, rand, 860, 90, '#12142a', 0.9, 2);
  for (let i = 0; i < 260; i++) { const x = 1100 + rand() * 600, y = 760 + rand() * 140 + Math.abs(x - 1400) * 0.25; g.fillStyle = `rgba(255,${200 + rand() * 40},140,${0.4 + rand() * 0.6})`; g.fillRect(x, y, 3, 3); } // אורות צפת
  ridge(g, rand, 980, 50, '#0a0b18', 1.4, 3);
  vignette(g, 0.5);
}

// ======================================================================
//  רקעי חגים
// ======================================================================

// ראש השנה: רימונים, תפוחים ודבש על יין עמוק
function pomegranates(g, rand) {
  fill(g, rad(g, W / 2, H / 2, 100, W * 0.7, [[0, '#5a1424'], [1, '#22060d']]));
  bokeh(g, rand, 26, ['rgba(255,210,130,A)'], [0, 0, W, H], 12, 50);
  const cluster = (x, y, flip) => {
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    for (let i = 0; i < 9; i++) leaf(g, -40 + rand() * 300, -60 + rand() * 220, 120 + rand() * 60, 26, rand() * TAU, hsl(110 + rand() * 20, 35, 22 + rand() * 12));
    pomegranate(g, rand, 120, 60, 1.25, false); pomegranate(g, rand, 290, 160, 1.0, true); pomegranate(g, rand, 60, 240, 0.9, false);
    g.restore();
  };
  cluster(-30, -40, false); cluster(W + 30, -40, true);
  cluster(-30, H - 300, false); cluster(W + 30, H - 300, true);
  g.strokeStyle = 'rgba(230,195,110,.5)'; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80);
  vignette(g, 0.4);
}

// ימים נוראים: שופר ושחר זהוב
function shofarDawn(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#1c2346'], [0.45, '#6b4a6a'], [0.75, '#d9a066'], [1, '#f6deb0']]));
  glow(g, W / 2, H + 100, 900, 'rgba(255,220,160,A)', 0.55); rays(g, W / 2, H + 100, 30, 1300, 'rgba(255,230,180,A)', Math.PI, Math.PI, 0.02);
  ridge(g, rand, 960, 50, '#3a2a3a', 0.9, 1);
  shofarApples(g, 380, 940, 1.05);
  g.save(); g.translate(W, 0); g.scale(-1, 1); shofarApples(g, 380, 940, 1.05); g.restore();
  stars(g, rand, 60, 260, 0.02);
  vignette(g, 0.4);
}

// יום כיפור: שערי שמיים נפתחים באור לבן (נעילה)
function gates(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#0e1630'], [0.6, '#2a3a62'], [1, '#55648a']]));
  stars(g, rand, 200, H * 0.8, 0.03);
  const gx = W / 2, gy = 120, gw = 560, gh = 940;
  glow(g, gx, gy + 260, 900, 'rgba(240,245,255,A)', 0.5);
  rays(g, gx, gy + 300, 40, 1400, 'rgba(235,240,255,A)', TAU, 0, 0.02);
  g.save(); arch(g, gx - gw / 2, gy, gw, gh); g.clip();
  fill(g, rad(g, gx, gy + 300, 10, 600, [[0, '#ffffff'], [0.5, '#e6ecff'], [1, '#9fb0d6']]));
  const door = (dir) => { // דלתות פתוחות למחצה
    g.save(); g.translate(gx + dir * gw / 2, 0); g.scale(dir * -1, 1);
    g.fillStyle = lin(g, 0, 0, 170, 0, [[0, '#a8862e'], [0.5, '#f2d78a'], [1, '#b38f35']]); g.globalAlpha = 0.92;
    g.fillRect(0, gy, 170, gh); g.globalAlpha = 1;
    g.strokeStyle = '#6e5418'; g.lineWidth = 6; for (let y = gy + 120; y < gy + gh; y += 120) { g.strokeRect(20, y, 130, 90); }
    g.restore();
  };
  door(1); door(-1);
  g.restore();
  g.strokeStyle = '#e6d39a'; g.lineWidth = 18; arch(g, gx - gw / 2, gy, gw, gh); g.stroke();
  vignette(g, 0.45);
}

// יום כיפור: נרות נשמה גבוהים בארגז חול
function candlesRow(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#121722'], [1, '#262c3a']]));
  g.fillStyle = lin(g, 0, 900, 0, H, [[0, '#d9cfb6'], [1, '#a59a80']]); g.fillRect(0, 900, W, H - 900);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 22; i++) {
    const x = (row ? 45 : 0) + i * 92, side = x < 560 || x > W - 560;
    if (!side) continue;
    const y = 950 + row * 60, h = 260 + rand() * 120;
    g.fillStyle = lin(g, x - 14, 0, x + 14, 0, [[0, '#d8cfbd'], [0.4, '#fffaf0'], [1, '#c8bda5']]); g.fillRect(x - 14, y - h, 28, h);
    flame(g, x, y - h - 18, 0.75);
  }
  vignette(g, 0.55, 0.35);
}

// סוכות: מבט מתוך הסוכה – סכך, קישוטים ושרשרת אורות
function sukkah(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#132a1a'], [0.5, '#2a4a2a'], [1, '#e9dcb8']]));
  stars(g, rand, 80, 300, 0.03);
  for (let i = 0; i < 46; i++) { // סכך – כפות תמרים
    const x = rand() * W, y = rand() * 260, a = rand() * Math.PI;
    g.strokeStyle = hsl(75 + rand() * 30, 40, 18 + rand() * 12); g.lineWidth = 6;
    g.beginPath(); g.moveTo(x - Math.cos(a) * 260, y - Math.sin(a) * 60); g.lineTo(x + Math.cos(a) * 260, y + Math.sin(a) * 60); g.stroke();
    for (let k = -10; k <= 10; k++) leaf(g, x + Math.cos(a) * k * 24, y + Math.sin(a) * k * 6, 90, 8, a + (k % 2 ? 1.1 : -1.1) + Math.PI / 2, hsl(80 + rand() * 30, 45, 22 + rand() * 14));
  }
  g.fillStyle = 'rgba(80,55,30,.9)'; g.fillRect(0, 250, W, 16); // קורה
  stringLights(g, 0, 270, W, 270, 90, 26);
  const hang = (x, len, kind) => { // קישוטים תלויים
    g.strokeStyle = 'rgba(240,220,170,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 266); g.lineTo(x, 266 + len); g.stroke();
    const y = 266 + len;
    if (kind === 0) pomegranate(g, rand, x, y + 40, 0.5);
    else if (kind === 1) { g.fillStyle = rad(g, x - 10, y + 20, 4, 50, [[0, '#fff3a3'], [1, '#c99a2c']]); g.beginPath(); g.ellipse(x, y + 34, 34, 46, 0, 0, TAU); g.fill(); } // אתרוג
    else { g.fillStyle = '#c8312b'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y + 40); g.lineTo(x, y + 80); g.lineTo(x - 30, y + 40); g.closePath(); g.fill(); g.strokeStyle = '#e6c97a'; g.lineWidth = 4; g.stroke(); }
  };
  [60, 200, 330, 470, W - 470, W - 330, W - 200, W - 60].forEach((x, i) => hang(x, 60 + (i % 3) * 70, i % 3));
  for (const side of [0, 1]) { // דפנות בד מפוספס
    const x = side ? W - 40 : 0; for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? 'rgba(240,230,200,.85)' : 'rgba(40,90,140,.85)'; g.fillRect(x + (side ? -k * 10 : k * 10), 266, 10, H); }
  }
  vignette(g, 0.4);
}

// סוכות: סוכות במרפסות ירושלים מתחת לירח מלא
function sukkahNight(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#0b1430'], [1, '#2b3560']]));
  stars(g, rand, 240, 600, 0.03);
  glow(g, 1600, 180, 300, 'rgba(255,248,220,A)', 0.4); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(1600, 180, 70, 0, TAU); g.fill(); // ירח מלא – ט"ו בתשרי
  g.fillStyle = 'rgba(200,190,160,.25)'; g.beginPath(); g.arc(1580, 165, 16, 0, TAU); g.arc(1625, 200, 10, 0, TAU); g.fill();
  const building = (x, w, floors) => {
    const top = H - floors * 150;
    for (let f = 0; f < floors; f++) for (let k = 0; k < w; k += 120) stone(g, rand, x + k, top + f * 150, 120, 150, 38, 34, false);
    for (let f = 0; f < floors; f++) {
      const y = top + f * 150 + 30;
      g.fillStyle = 'rgba(255,200,120,.85)'; g.fillRect(x + 30, y, w - 60, 90); // סוכה מוארת
      g.fillStyle = 'rgba(40,90,40,.95)'; g.fillRect(x + 22, y - 14, w - 44, 18); // סכך
      g.strokeStyle = 'rgba(255,240,200,.6)'; g.lineWidth = 3; for (let k = x + 40; k < x + w - 40; k += 26) { g.beginPath(); g.moveTo(k, y + 6); g.lineTo(k, y + 30); g.stroke(); }
      g.fillStyle = '#2a2018'; g.fillRect(x + 20, y + 90, w - 40, 10); // מעקה
    }
  };
  building(0, 480, 4); building(W - 480, 480, 4);
  vignette(g, 0.4);
}

// שמחת תורה: ספרי תורה ודגלי שמחת תורה
function torahFlags(g, rand) {
  fill(g, lin(g, 0, 0, W, H, [[0, '#13306b'], [1, '#0a1838']]));
  bokeh(g, rand, 30, ['rgba(255,220,140,A)', 'rgba(140,190,255,A)'], [0, 0, W, H], 10, 50);
  const flag = (x, y, a, c1, c2) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#c99a3e'; g.fillRect(-4, -20, 8, 280);
    g.fillStyle = rad(g, -8, -40, 3, 30, [[0, '#ff8a7a'], [1, '#a5121e']]); g.beginPath(); g.arc(0, -36, 22, 0, TAU); g.fill(); // תפוח בראש המקל
    g.fillStyle = c1; g.beginPath(); g.moveTo(4, 0); g.lineTo(170, 10); g.lineTo(170, 120); g.lineTo(4, 110); g.closePath(); g.fill();
    g.fillStyle = c2; g.fillRect(20, 30, 130, 14); g.fillRect(20, 70, 130, 14);
    g.strokeStyle = '#fff'; g.lineWidth = 4; star(g, 87, 58, 22);
    g.restore();
  };
  const cs = [['#f4f1ea', '#2f6db5'], ['#e6c97a', '#c8312b'], ['#2e8b57', '#f4f1ea'], ['#c8312b', '#e6c97a']];
  for (let i = 0; i < 10; i++) { const left = i < 5; flag(left ? 60 + rand() * 340 : W - 60 - rand() * 340 - 170, 80 + (i % 5) * 190 + rand() * 40, (rand() - 0.5) * 0.6, ...cs[i % 4]); }
  torahScroll(g, 330, 1060, 0.55); torahScroll(g, W - 330, 1060, 0.55);
  confetti(g, rand, 120, [0, 0, W, 300]);
  vignette(g, 0.45);
}

// חנוכה: חנוכייה דולקת בחלון אבן בלילה
function chanukaWindow(g, rand, pal, opts = {}) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#060d26'], [1, '#18275a']]));
  stars(g, rand, 260, H * 0.7, 0.03);
  for (let y = 0, row = 0; y < H; row++) { const h = 110; let x = -rand() * 100; while (x < W) { const w = 160 + rand() * 120; if (x < 560 || x > W - 600) stone(g, rand, x, y, w, h, 36, 36); x += w; } y += h; }
  const win = (x, y, w, h, lit) => {
    g.fillStyle = '#1a1206'; arch(g, x - 16, y - 16, w + 32, h + 32); g.fill();
    g.save(); arch(g, x, y, w, h); g.clip();
    fill(g, rad(g, x + w / 2, y + h * 0.7, 10, h, [[0, '#ffcf7a'], [1, '#6a3a10']]));
    chanukiah(g, x + w / 2, y + h - 30, (w / 900), lit);
    g.restore();
    g.strokeStyle = '#c8b28a'; g.lineWidth = 10; arch(g, x, y, w, h); g.stroke();
  };
  const lit = opts.lit || 8;
  win(110, 260, 360, 560, lit); win(W - 470, 260, 360, 560, lit);
  vignette(g, 0.4);
}

// חנוכה: כדי שמן וסביבונים על כחול
function oilJugs(g, rand) {
  fill(g, lin(g, 0, 0, W, H, [[0, '#0f2f6b'], [1, '#081a3e']]));
  g.strokeStyle = 'rgba(230,200,120,.07)'; g.lineWidth = 2; for (let y = 60; y < H; y += 120) for (let x = (y / 120) % 2 ? 60 : 0; x < W; x += 120) star(g, x, y, 26);
  const gold = (x0, x1) => lin(g, x0, 0, x1, 0, [[0, '#9c7322'], [0.5, '#f6dc8a'], [1, '#9c7322']]);
  const jug = (x, y, s) => {
    g.fillStyle = gold(x - 60 * s, x + 60 * s);
    g.beginPath(); g.moveTo(x - 20 * s, y - 150 * s); g.lineTo(x + 20 * s, y - 150 * s); g.lineTo(x + 18 * s, y - 110 * s);
    g.bezierCurveTo(x + 90 * s, y - 90 * s, x + 80 * s, y, x + 40 * s, y); g.lineTo(x - 40 * s, y); g.bezierCurveTo(x - 80 * s, y, x - 90 * s, y - 90 * s, x - 18 * s, y - 110 * s); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,50,10,.6)'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x - 55 * s, y - 60 * s); g.lineTo(x + 55 * s, y - 60 * s); g.stroke();
    g.fillStyle = '#7a1a1a'; rrect(g, x - 24 * s, y - 166 * s, 48 * s, 20 * s, 6 * s); g.fill();
  };
  const dreidel = (x, y, s, a, letter) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#e6edf7'; g.fillRect(-8 * s, -110 * s, 16 * s, 40 * s);
    g.fillStyle = gold(-60 * s, 60 * s); g.beginPath(); g.moveTo(-55 * s, -70 * s); g.lineTo(55 * s, -70 * s); g.lineTo(55 * s, 20 * s); g.lineTo(0, 90 * s); g.lineTo(-55 * s, 20 * s); g.closePath(); g.fill();
    g.fillStyle = '#16305c'; g.font = `900 ${64 * s}px "Frank Ruhl Libre", serif`; g.textAlign = 'center'; g.fillText(letter, 0, 6 * s);
    g.restore();
  };
  jug(190, 1000, 1.4); jug(W - 190, 1000, 1.4);
  ['נ', 'ג', 'ה', 'פ'].forEach((l, i) => dreidel(i < 2 ? 160 + i * 200 : W - 160 - (i - 2) * 200, 300 + (i % 2) * 220, 1.1, (rand() - 0.5) * 0.7, l));
  bokeh(g, rand, 40, ['rgba(255,210,120,A)'], [0, 0, W, H], 6, 30);
  vignette(g, 0.45);
}

// ט"ו בשבט: ענפי שקדייה פורחים
function almond(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#7fb3e0'], [0.7, '#cfe6f2'], [1, '#e9f2e0']]));
  ridge(g, rand, 920, 60, '#9ebf8a', 0.9, 1); ridge(g, rand, 990, 40, '#7aa66a', 1.3, 2);
  const blossom = (x, y) => { for (let i = 0; i < 3; i++) flower(g, x + (rand() - 0.5) * 40, y + (rand() - 0.5) * 40, 14 + rand() * 8, rand() < 0.6 ? '#fff4f6' : '#f7c6d2', '#b0405a', 5); };
  branch(g, rand, -20, 160, 0.25, 260, 5, blossom);
  branch(g, rand, W + 20, 120, Math.PI - 0.3, 260, 5, blossom);
  branch(g, rand, -20, 900, -0.5, 220, 4, blossom);
  branch(g, rand, W + 20, 940, Math.PI + 0.5, 220, 4, blossom);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,${210 + rand() * 40},${220 + rand() * 30},.85)`; g.beginPath(); g.ellipse(rand() * W, rand() * H, 7, 4, rand() * 3, 0, TAU); g.fill(); } // עלי כותרת נושרים
  vignette(g, 0.25);
}

// פורים: מסכות, קונפטי ורעשנים
function purimConfetti(g, rand) {
  fill(g, lin(g, 0, 0, W, H, [[0, '#3a0f5c'], [0.6, '#6a1b6e'], [1, '#2a0a3e']]));
  bokeh(g, rand, 40, ['rgba(255,120,200,A)', 'rgba(255,220,120,A)', 'rgba(120,200,255,A)'], [0, 0, W, H], 10, 60);
  for (let i = 0; i < 26; i++) { // סרפנטינים
    const x = rand() * W, y = rand() * H; if (x > 560 && x < W - 560) continue;
    g.strokeStyle = hsl(rand() * 360, 80, 62); g.lineWidth = 6; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) g.bezierCurveTo(x + k * 30 + 40, y - 40 + k * 26, x + k * 30 - 30, y + 30 + k * 26, x + (k + 1) * 30, y + (k + 1) * 26);
    g.stroke();
  }
  purimMasks(g, 360, 1000, 0.75, rand);
  g.save(); g.translate(W, 0); g.scale(-1, 1); purimMasks(g, 360, 1000, 0.75, rand); g.restore();
  confetti(g, rand, 300, [0, 0, W, 360]);
  vignette(g, 0.4);
}

// פורים: שושן הבירה – קשתות פרסיות ואריחי טורקיז
function shushan(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#0b1a3a'], [1, '#1d3a6a']]));
  stars(g, rand, 160, 500, 0.03);
  const tile = (x, y, s) => { // אריח כוכב שמונה קצוות
    g.fillStyle = '#e6c97a'; g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? s * 0.5 : s; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill();
    g.fillStyle = '#167a8a'; g.beginPath(); g.arc(x, y, s * 0.35, 0, TAU); g.fill();
  };
  for (const side of [0, 1]) {
    g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
    g.fillStyle = lin(g, 0, 0, 520, 0, [[0, '#0f6a7a'], [1, '#1a8ea0']]); g.fillRect(0, 0, 520, H);
    for (let y = 30; y < H; y += 64) for (let x = 30; x < 520; x += 64) tile(x, y, 22);
    arch(g, 120, 260, 300, 820); g.fillStyle = lin(g, 0, 260, 0, H, [[0, '#0b1a3a'], [0.7, '#1d3a6a'], [1, '#3a3050']]); g.fill();
    g.save(); arch(g, 120, 260, 300, 820); g.clip(); stars(g, rand, 30, 700, 0); glow(g, 270, 640, 140, 'rgba(255,200,110,A)', 0.55);
    g.strokeStyle = '#e6c97a'; g.lineWidth = 3; g.beginPath(); g.moveTo(270, 260); g.lineTo(270, 560); g.stroke();
    g.fillStyle = '#c99a3e'; rrect(g, 246, 560, 48, 70, 10); g.fill(); g.fillStyle = 'rgba(255,220,140,.9)'; rrect(g, 254, 572, 32, 46, 6); g.fill(); g.restore();
    g.strokeStyle = '#e6c97a'; g.lineWidth = 14; arch(g, 120, 260, 300, 820); g.stroke();
    g.beginPath(); g.moveTo(270, 260); g.lineTo(270, 190); g.stroke(); // קשת מחודדת
    g.restore();
  }
  vignette(g, 0.4);
}

// פסח: קריעת ים סוף
function seaSplit(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#1f3f6a'], [0.5, '#e7c48a'], [1, '#d8b071']]));
  glow(g, W / 2, 520, 600, 'rgba(255,240,200,A)', 0.7);
  const wall = (side) => {
    g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
    g.fillStyle = lin(g, 0, 0, 760, 0, [[0, '#0a2a4a'], [0.7, '#1c6a8a'], [1, '#6ac0d0']]);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(560, 0); g.bezierCurveTo(700, 300, 760, 700, 880, H); g.lineTo(0, H); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(220,245,255,.35)'; g.lineWidth = 3;
    for (let i = 0; i < 40; i++) { const y = rand() * H; g.beginPath(); g.moveTo(rand() * 400, y); g.bezierCurveTo(200, y - 20, 400, y + 20, 600 + y * 0.25, y); g.stroke(); }
    for (let i = 0; i < 160; i++) { const y = rand() * H; g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(560 + y * 0.3 + rand() * 30 - 15, y, 2 + rand() * 4, 0, TAU); g.fill(); } // קצף בשפת המים
    g.restore();
  };
  wall(0); wall(1);
  g.fillStyle = lin(g, 0, 620, 0, H, [[0, '#c9a46a'], [1, '#8a6a3a']]); g.beginPath(); g.moveTo(820, 620); g.lineTo(1100, 620); g.lineTo(W - 600, H); g.lineTo(600, H); g.closePath(); g.fill();
  vignette(g, 0.4);
}

// פסח: כלניות אביב ושולחן הסדר
function kalaniot(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#6fa7d8'], [0.7, '#d7ebf0'], [1, '#e8f0d8']]));
  ridge(g, rand, 820, 70, '#9cbc84', 0.8, 1); ridge(g, rand, 900, 50, '#7aa65e', 1.2, 2);
  g.fillStyle = '#5f8f45'; g.fillRect(0, 960, W, 120);
  for (let i = 0; i < 160; i++) {
    const x = rand() * W, y = 880 + rand() * 200, r = 10 + (y - 880) / 12;
    if (x > 620 && x < W - 620 && y < 1000) continue;
    g.strokeStyle = '#3f6a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke();
    flower(g, x, y, r, rand() < 0.85 ? '#d81e2a' : '#f4f1ea', '#1a1010', 6);
  }
  for (let i = 0; i < 8; i++) { const x = rand() < 0.5 ? 80 + rand() * 440 : W - 80 - rand() * 440, y = 640 + rand() * 200, c = ['#f2c14e', '#ffffff', '#e35d6a'][i % 3]; leaf(g, x, y, 22, 14, -0.6, c); leaf(g, x, y, 22, 14, Math.PI + 0.6, c); }
  vignette(g, 0.3);
}

// ל"ג בעומר: מדורה בלילה
function bonfire(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#070912'], [0.7, '#1a1426'], [1, '#2a1a1a']]));
  stars(g, rand, 260, 600, 0.03);
  ridge(g, rand, 900, 80, '#120e18', 0.8, 1);
  const fire = (x, y, s) => {
    glow(g, x, y - 120 * s, 520 * s, 'rgba(255,120,30,A)', 0.55);
    g.fillStyle = '#3a2414'; for (let i = 0; i < 6; i++) { g.save(); g.translate(x, y); g.rotate(-0.9 + i * 0.36); g.fillRect(-120 * s, -10 * s, 240 * s, 20 * s); g.restore(); }
    for (let i = 0; i < 30; i++) {
      const fx = x + (rand() - 0.5) * 180 * s * (1 - i / 40), h = (90 + rand() * 230) * s * (1 - i / 50), w = (18 + rand() * 26) * s;
      g.fillStyle = lin(g, 0, y, 0, y - h, [[0, 'rgba(255,90,20,.9)'], [0.5, 'rgba(255,170,40,.85)'], [1, 'rgba(255,240,170,0)']]);
      g.beginPath(); g.moveTo(fx - w, y); g.quadraticCurveTo(fx - w * 0.6, y - h * 0.6, fx, y - h); g.quadraticCurveTo(fx + w * 0.6, y - h * 0.6, fx + w, y); g.fill();
    }
    for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(255,${160 + rand() * 90},80,${rand()})`; g.fillRect(x + (rand() - 0.5) * 400 * s, y - 200 * s - rand() * 600 * s, 3, 3); }
  };
  fire(260, 1040, 1.1); fire(W - 260, 1040, 1.1);
  vignette(g, 0.45);
}

// שבועות: הר סיני בענן ובאור
function sinai(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#1d2a4a'], [0.5, '#6a6a8a'], [1, '#d9c49a']]));
  rays(g, W / 2, 140, 30, 1300, 'rgba(255,245,210,A)', Math.PI, 0, 0.02, 0.06);
  glow(g, W / 2, 200, 500, 'rgba(255,250,225,A)', 0.6);
  for (let i = 0; i < 26; i++) { const x = W / 2 + (rand() - 0.5) * 1200, y = 220 + rand() * 160; g.fillStyle = 'rgba(240,240,250,.22)'; g.beginPath(); g.ellipse(x, y, 160 + rand() * 120, 40 + rand() * 30, 0, 0, TAU); g.fill(); }
  ridge(g, rand, 820, 60, '#6a5a6a', 0.8, 1);
  const peak = [[180, 920], [560, 640], [700, 560], [820, 470], [905, 430], [960, 400], [1030, 440], [1160, 520], [1320, 640], [1740, 920]];
  g.fillStyle = lin(g, 0, 400, 0, 920, [[0, '#8a6a58'], [1, '#3a2a24']]); g.beginPath(); peak.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(960, 400); g.lineTo(1030, 440); g.lineTo(1160, 520); g.lineTo(1320, 640); g.lineTo(1740, 920); g.lineTo(1000, 920); g.closePath(); g.fill(); // צד מוצל
  g.strokeStyle = 'rgba(40,25,20,.35)'; g.lineWidth = 3; for (let i = 0; i < 14; i++) { const x = 600 + rand() * 700; g.beginPath(); g.moveTo(x, 520 + rand() * 80); g.lineTo(x + (x - 960) * 0.4, 900); g.stroke(); }
  g.fillStyle = '#4f7a3a'; g.fillRect(0, 900, W, H - 900);
  for (let i = 0; i < 220; i++) { const x = rand() * W, y = 900 + rand() * 180; if (x > 560 && x < W - 560 && y < 1000) continue; flower(g, x, y, 8 + rand() * 10, ['#f4f4f4', '#f2c14e', '#e35d6a', '#b06ad8'][i % 4], '#f2c14e', 5); }
  vignette(g, 0.35);
}

// יום העצמאות: דגלים וזיקוקים
function israelFlags(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#06143a'], [1, '#14306a']]));
  const burst = (x, y, r, col) => { for (let i = 0; i < 46; i++) { const a = (i / 46) * TAU; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 0, TAU); g.fill(); } glow(g, x, y, r, col.replace(/[\d.]+\)$/, 'A)'), 0.3); };
  burst(260, 260, 170, 'rgba(120,180,255,1)'); burst(W - 300, 220, 200, 'rgba(255,255,255,1)'); burst(420, 560, 120, 'rgba(255,220,120,1)'); burst(W - 420, 600, 140, 'rgba(120,180,255,1)');
  const isFlag = (x, y, w) => {
    const h = w * 0.73; g.fillStyle = '#fff'; g.fillRect(x, y, w, h);
    g.fillStyle = '#0038b8'; g.fillRect(x, y + h * 0.1, w, h * 0.15); g.fillRect(x, y + h * 0.75, w, h * 0.15);
    g.strokeStyle = '#0038b8'; g.lineWidth = w * 0.03; star(g, x + w / 2, y + h / 2, h * 0.2);
  };
  for (let i = 0; i < 9; i++) { isFlag(i * 90 - 10, 20 + Math.sin(i / 2.5) * 30 + i * 8, 70); isFlag(W - 60 - i * 90, 20 + Math.sin(i / 2.5) * 30 + i * 8, 70); }
  skyline(g, rand, 1080, '#081028', 0.5, 'rgba(180,210,255,A)');
  vignette(g, 0.4);
}

// תשעה באב: חורבות
function ruins(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#15171c'], [0.7, '#3a3a40'], [1, '#4a4640']]));
  for (let i = 0; i < 40; i++) glow(g, rand() * W, 150 + rand() * 600, 120 + rand() * 200, 'rgba(130,130,135,A)', 0.12); // עשן
  const column = (x, h, w, a) => {
    g.save(); g.translate(x, 1000); g.rotate(a);
    g.fillStyle = lin(g, -w / 2, 0, w / 2, 0, [[0, '#55534e'], [0.4, '#8a867c'], [1, '#45433e']]); g.fillRect(-w / 2, -h, w, h);
    g.fillStyle = '#2a2a2a'; g.beginPath(); g.moveTo(-w / 2, -h); for (let k = 0; k <= 6; k++) g.lineTo(-w / 2 + (k / 6) * w, -h - rand() * 30); g.lineTo(w / 2, -h); g.fill();
    g.restore();
  };
  column(160, 520, 90, 0); column(330, 300, 90, 0.05); column(W - 170, 420, 90, 0); column(W - 360, 220, 90, -0.04);
  for (let i = 0; i < 40; i++) { const x = rand() * W; if (x > 560 && x < W - 560) continue; stone(g, rand, x, 960 + rand() * 80, 60 + rand() * 120, 40 + rand() * 50, 30, 30, false); }
  g.fillStyle = '#26241f'; g.fillRect(0, 1030, W, 50);
  vignette(g, 0.6, 0.3);
}

// ראש חודש: ירח חדש ומופעי הירח
function moonNight(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#050a1e'], [1, '#1a2450']]));
  stars(g, rand, 420, H, 0.03);
  for (let i = 0; i < 9; i++) { // מופעי הירח בקשת
    const a = Math.PI * (1.12 + i * 0.095), x = W / 2 + Math.cos(a) * 860, y = 1040 + Math.sin(a) * 860;
    g.fillStyle = 'rgba(40,46,70,.9)'; g.beginPath(); g.arc(x, y, 34, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, 34, 0, TAU); g.clip();
    g.fillStyle = '#efe6c4'; g.beginPath(); g.arc(x + (i - 4) * 17, y, 34, 0, TAU); g.fill();
    g.restore();
  }
  crescent(g, 1700, 520, 90, 0.42);
  ridge(g, rand, 1000, 40, '#0a0e22', 1, 1);
  vignette(g, 0.4);
}

// אלול וסליחות: ירושלים בלילה
function selichot(g, rand) {
  fill(g, lin(g, 0, 0, 0, H, [[0, '#04141c'], [0.7, '#0f3a44'], [1, '#1e4a4a']]));
  stars(g, rand, 300, 700, 0.03);
  crescent(g, 300, 180, 50, 0.6);
  ridge(g, rand, 860, 50, '#0c2a30', 0.8, 1);
  skyline(g, rand, 960, '#071a1e', 1.1, 'rgba(255,214,150,A)');
  for (let i = 0; i < 14; i++) { const x = 60 + i * 140; glow(g, x, 940, 60, 'rgba(255,200,120,A)', 0.5); } // פנסי רחוב
  g.fillStyle = '#05120f'; g.fillRect(0, 958, W, H - 958);
  vignette(g, 0.45);
}

// ======================================================================
//  רישום ובחירה
// ======================================================================

// [פונקציה, שם לתצוגה, קבוצה]
export const SCENE_DEFS = {
  jerusalem: [jerusalem, 'ירושלים העתיקה בשקיעה', 'regular'],
  kotel: [kotel, 'אבני הכותל', 'regular'],
  heichal: [heichal, 'היכל – עמודים ופרוכת', 'regular'],
  papercut: [papercut, 'חיתוך נייר בסגנון כתובה', 'regular'],
  sunpath: [sunpath, 'מסלול השמש מעל הגליל', 'regular'],
  sunrise: [sunrise, 'זריחה מעל ההרים', 'regular'],
  shabbatEve: [shabbatEve, 'ירושלים בכניסת שבת', 'regular'],
  yahrzeit: [yahrzeit, 'נר נשמה וקיר אבן', 'regular'],
  wheatField: [wheatField, 'שדה חיטה', 'regular'],
  library: [library, 'ארון ספרי קודש', 'regular'],
  stainedGlass: [stainedGlass, 'חלונות ויטראז׳', 'regular'],
  festive: [festive, 'חגיגה – בלונים ודגלונים', 'regular'],
  safed: [safed, 'לילה בהרי הגליל', 'regular'],
  pomegranates: [pomegranates, 'ראש השנה – רימונים', 'holiday'],
  shofarDawn: [shofarDawn, 'ימים נוראים – שופר ושחר', 'holiday'],
  gates: [gates, 'יום כיפור – שערי שמיים', 'holiday'],
  candlesRow: [candlesRow, 'יום כיפור – נרות', 'holiday'],
  sukkah: [sukkah, 'סוכות – בתוך הסוכה', 'holiday'],
  sukkahNight: [sukkahNight, 'סוכות – ירח מלא', 'holiday'],
  torahFlags: [torahFlags, 'שמחת תורה – דגלים', 'holiday'],
  chanukaWindow: [chanukaWindow, 'חנוכה – חנוכייה בחלון', 'holiday'],
  oilJugs: [oilJugs, 'חנוכה – כד שמן וסביבונים', 'holiday'],
  almond: [almond, 'ט"ו בשבט – שקדייה פורחת', 'holiday'],
  purimConfetti: [purimConfetti, 'פורים – מסכות וקונפטי', 'holiday'],
  shushan: [shushan, 'פורים – שושן הבירה', 'holiday'],
  seaSplit: [seaSplit, 'פסח – קריעת ים סוף', 'holiday'],
  kalaniot: [kalaniot, 'פסח – כלניות ושולחן הסדר', 'holiday'],
  bonfire: [bonfire, 'ל"ג בעומר – מדורות', 'holiday'],
  sinai: [sinai, 'שבועות – הר סיני', 'holiday'],
  israelFlags: [israelFlags, 'יום העצמאות – דגלים וזיקוקים', 'holiday'],
  ruins: [ruins, 'תשעה באב – חורבן', 'holiday'],
  moonNight: [moonNight, 'ראש חודש – מולד הירח', 'holiday'],
  selichot: [selichot, 'אלול – ירושלים בלילה', 'holiday'],
};

// רקע לכל סוג שקופית בימים רגילים
const BY_SCREEN = {
  combined: 'jerusalem', prayers: 'heichal', zmanim: 'sunpath', netz: 'sunrise', shabbat: 'shabbatEve',
  announcements: 'kotel', neshama: 'yahrzeit', holidays: 'heichal', molad: 'moonNight', memorials: 'yahrzeit', parnas: 'papercut', omer: 'wheatField', halacha: 'stainedGlass',
  learning: 'library', lessons: 'library', mishna: 'papercut', birthdays: 'festive', hilula: 'safed', greeting: 'jerusalem',
};
const THEME_MAIN = { classic: 'jerusalem', chassidic: 'heichal', ashkenaz: 'papercut', royal: 'heichal', sky: 'heichal', sephardi: 'jerusalem', stone: 'kotel', night: 'safed' };

// רקעי החג (הראשון – לברכה ולמסך המשולב; השאר מתחלפים בין השקופיות)
const HOLIDAY_SETS = {
  'rosh-hashana': ['pomegranates', 'shofarDawn'],
  'yamim-noraim': ['shofarDawn', 'gates'],
  'yom-kippur': ['gates', 'candlesRow'],
  sukkot: ['sukkah', 'sukkahNight'],
  'simchat-torah': ['torahFlags', 'sukkah'],
  chanuka: ['chanukaWindow', 'oilJugs'],
  'tu-bishvat': ['almond'],
  purim: ['purimConfetti', 'shushan'],
  pesach: ['seaSplit', 'kalaniot'],
  'lag-baomer': ['bonfire', 'safed'],
  shavuot: ['sinai', 'wheatField'],
  'yom-haatzmaut': ['israelFlags', 'jerusalem'],
  'yom-yerushalayim': ['jerusalem', 'kotel'],
  'tisha-bav': ['ruins'],
  'yom-hazikaron': ['yahrzeit'],
};
// ימים מיוחדים "קלים": רק הברכה, המסך המשולב ומסך השבת מקבלים את רקע היום
const LIGHT_SETS = { 'rosh-chodesh': 'moonNight', elul: 'selichot', shabbat: 'shabbatEve' };

/** האם ליום יש עיצוב חג מלא (רקעים וצבעים) */
export const holidayHasDesign = (h) => !!HOLIDAY_SETS[h];

/** אפשרויות לבחירה בממשק הגבאי */
export const SCENE_CHOICES = [
  ['auto', 'אוטומטי – רקע מיוחד לכל שקופית'],
  ...Object.entries(SCENE_DEFS).filter(([, d]) => d[2] === 'regular').map(([k, d]) => [k, `קבוע: ${d[1]}`]),
  ['none', 'בלי רקע מצויר'],
];

/**
 * איזה רקע להציג בשקופית.
 * display.scene: 'auto' (רקע לכל שקופית) | שם רקע קבוע | 'none'
 * display.holidayDesign: האם להחליף לעיצובי חג (ברירת מחדל: כן)
 */
export function sceneForSlide({ screen, index = 0, holiday, theme = 'classic', display = {} }) {
  const choice = display.scene || 'auto';
  if (choice === 'none') return null;
  const holidayOn = display.holidayDesign !== false;
  const set = holidayOn && HOLIDAY_SETS[holiday];
  if (screen === 'memorials') return holiday === 'tisha-bav' ? 'ruins' : 'yahrzeit'; // אזכרות – תמיד מאופק
  if (set) return screen === 'greeting' || screen === 'combined' ? set[0] : set[index % set.length];
  if (holidayOn && LIGHT_SETS[holiday] && ['greeting', 'combined', 'shabbat'].includes(screen)) return LIGHT_SETS[holiday];
  if (choice !== 'auto') return SCENE_DEFS[choice] ? choice : null;
  if (theme === 'modern') return null;
  if (screen === 'combined' || screen === 'greeting') return THEME_MAIN[theme] || 'jerusalem';
  return BY_SCREEN[screen] || THEME_MAIN[theme] || 'jerusalem';
}

// ---------- ציור ומטמון (Blob URLs, עד 24 רקעים) ----------
const cache = new Map();
const pending = new Map();
function key(scene, theme, opts) { return `${scene}:${theme}:${opts?.lit || ''}`; }

export function cachedScene(scene, theme = 'classic', opts = {}) { return cache.get(key(scene, theme, opts)) || null; }

export const sceneDiag = { ok: 0, fail: 0, last: '' };
export function renderScene(scene, theme = 'classic', opts = {}) {
  if (!scene || !SCENE_DEFS[scene]) return Promise.resolve(null);
  const k = key(scene, theme, opts);
  if (cache.has(k)) { const v = cache.get(k); cache.delete(k); cache.set(k, v); return Promise.resolve(v); }
  if (pending.has(k)) return pending.get(k);
  const p = new Promise((resolve) => {
    const done = (url) => {
      pending.delete(k);
      if (url) { sceneDiag.ok++; cache.set(k, url); while (cache.size > 24) { const [old, u] = cache.entries().next().value; cache.delete(old); if (u.startsWith('blob:')) URL.revokeObjectURL(u); } }
      resolve(url);
    };
    // ניסיון ראשון ברזולוציה מלאה; אם המכשיר נכשל (זיכרון/דפדפן ישן) – ניסיון שני בחצי רזולוציה, כתמונת data
    const draw = (scale) => {
      const [c, g] = scale === 1 ? canvas() : canvas(Math.round(1920 * scale), Math.round(1080 * scale));
      if (scale !== 1) g.scale(scale, scale);
      const rand = rng([...scene].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0);
      SCENE_DEFS[scene][0](g, rand, PALETTES[theme] || PALETTES.classic, opts);
      return c;
    };
    const fallback = (why) => {
      sceneDiag.fail++; sceneDiag.last = `${scene}: ${why}`;
      try { done(draw(0.5).toDataURL('image/jpeg', 0.8)); } catch (e2) { sceneDiag.last += ` | fallback: ${e2?.message || e2}`; done(null); }
    };
    try {
      const c = draw(1);
      if (c.toBlob) c.toBlob((b) => { if (b) done(URL.createObjectURL(b)); else { try { done(c.toDataURL('image/jpeg', 0.86)); } catch (e) { fallback('toDataURL ' + (e?.message || e)); } } }, 'image/jpeg', 0.86);
      else done(c.toDataURL('image/jpeg', 0.86));
    } catch (e) { console.warn('scene failed', scene, e); fallback(e?.message || String(e)); }
  });
  pending.set(k, p);
  return p;
}
