// איורים ורקעים מקוריים בסגנון יודאיקה – מצוירים בקוד (canvas), בלי קבצי תמונה.
// כל רקע נוצר פעם אחת, נשמר בזיכרון ומוצג כתמונת רקע של הלוח.

export const W = 1920, H = 1080;

// ---------- כלים ----------
export function rng(seed) { // מספרים "אקראיים" קבועים – אותו ציור בכל פעם
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function canvas(w = W, h = H) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
export function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
export function rad(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
export function star(g, cx, cy, r) { // מגן דוד
  for (const rot of [0, Math.PI]) {
    g.beginPath();
    for (let i = 0; i < 3; i++) { const a = rot - Math.PI / 2 + i * 2 * Math.PI / 3; g[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    g.closePath(); g.stroke();
  }
}
export function flame(g, x, y, s = 1) {
  g.save();
  g.fillStyle = rad(g, x, y - 10 * s, 0, 120 * s, [[0, 'rgba(255,214,120,.55)'], [1, 'rgba(255,170,60,0)']]);
  g.beginPath(); g.arc(x, y - 10 * s, 120 * s, 0, 7); g.fill();
  g.fillStyle = rad(g, x, y, 1, 26 * s, [[0, '#fffbe6'], [0.45, '#ffd25c'], [1, 'rgba(255,120,20,.0)']]);
  g.beginPath(); g.moveTo(x, y - 40 * s); g.bezierCurveTo(x + 15 * s, y - 15 * s, x + 13 * s, y + 8 * s, x, y + 10 * s);
  g.bezierCurveTo(x - 13 * s, y + 8 * s, x - 15 * s, y - 15 * s, x, y - 40 * s); g.fill();
  g.restore();
}
export function grain(g, rand, x, y, w, h, n, alpha = 0.06) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rand() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    g.fillRect(x + rand() * w, y + rand() * h, 1 + rand() * 2.5, 1 + rand() * 2.5);
  }
}

// אבן ירושלמית עם "מסגרת סיתות" כמו באבני הכותל
export function stone(g, rand, x, y, w, h, base = 40, light = 70, herodian = true) {
  const hue = base + rand() * 8 - 4, l = light - rand() * 12, s = 26 + rand() * 14;
  g.fillStyle = hsl(hue, s, l - 6); g.fillRect(x, y, w, h);
  if (herodian) {
    const m = Math.min(16, h * 0.14);
    g.fillStyle = lin(g, x, y, x + w, y + h, [[0, hsl(hue, s, l + 6)], [1, hsl(hue, s, l - 3)]]);
    g.fillRect(x + m, y + m, w - 2 * m, h - 2 * m);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + m, y + m, w - 2 * m, 3);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + m, y + h - m - 3, w - 2 * m, 3);
  }
  for (let i = 0; i < 3; i++) { // כתמי בליה
    g.fillStyle = rad(g, x + rand() * w, y + rand() * h, 1, 20 + rand() * w * 0.3, [[0, `rgba(80,60,30,${0.05 + rand() * 0.08})`], [1, 'rgba(80,60,30,0)']]);
    g.fillRect(x, y, w, h);
  }
  grain(g, rand, x, y, w, h, Math.floor(w * h / 220));
  g.fillStyle = 'rgba(40,30,20,.55)'; g.fillRect(x, y + h - 3, w, 3); g.fillRect(x + w - 3, y, 3, h); // מישק
}

export function hyssop(g, rand, x, y) { // אזוב שצומח בין האבנים
  g.save(); g.translate(x, y);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI / 2 + (rand() - 0.5) * 2.2, len = 30 + rand() * 50;
    g.strokeStyle = hsl(95 + rand() * 30, 40, 26 + rand() * 14); g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a) * len * 0.5 + 10, Math.sin(a) * len * 0.3, Math.cos(a) * len, Math.sin(a) * len); g.stroke();
    g.fillStyle = hsl(100 + rand() * 25, 45, 30 + rand() * 12);
    g.beginPath(); g.ellipse(Math.cos(a) * len, Math.sin(a) * len, 7, 4, a, 0, 7); g.fill();
  }
  g.restore();
}

// ---------- רקע: הכותל ----------
export function kotel(g, rand) {
  g.fillStyle = lin(g, 0, 0, 0, 260, [[0, '#6f97c4'], [1, '#e7d2a6']]); g.fillRect(0, 0, W, 260);
  let y = 150, row = 0;
  while (y < H) {
    const h = 64 + row * 12 + rand() * 40;
    let x = -rand() * 260;
    while (x < W) {
      const w = 150 + rand() * 340;
      stone(g, rand, x, y, w, h, 38 + rand() * 6, 66 + rand() * 12);
      g.fillStyle = lin(g, x, y, x, y + h, [[0, 'rgba(255,245,220,.18)'], [0.25, 'rgba(255,245,220,0)'], [0.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.22)']]);
      g.fillRect(x, y, w, h);
      if (rand() < 0.09 && row > 0) hyssop(g, rand, x + w, y + h * (0.3 + rand() * 0.5));
      x += w;
    }
    g.fillStyle = 'rgba(30,20,10,.35)'; g.fillRect(0, y + h - 4, W, 4);
    y += h; row++;
  }
  // אור שמש אלכסוני מלמעלה-שמאל
  g.fillStyle = lin(g, 0, 0, W, H, [[0, 'rgba(255,230,170,.22)'], [0.5, 'rgba(255,230,170,0)'], [1, 'rgba(40,20,0,.28)']]);
  g.fillRect(0, 150, W, H - 150);
}

// ---------- רקע: ירושלים העתיקה ----------
export function jerusalem(g, rand) {
  g.fillStyle = lin(g, 0, 0, 0, 640, [[0, '#1d2d58'], [0.45, '#7a5a86'], [0.8, '#e2a06a'], [1, '#f6d69c']]); g.fillRect(0, 0, W, 660);
  g.fillStyle = rad(g, 1380, 600, 10, 520, [[0, 'rgba(255,236,180,.85)'], [1, 'rgba(255,200,120,0)']]); g.fillRect(0, 0, W, 700);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.6})`; g.fillRect(rand() * W, rand() * 220, 2, 2); }
  // הרים רחוקים
  for (const [base, col] of [[560, '#8f6f8e'], [600, '#6f5672']]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, base - 40 * Math.sin(x / 210 + base) - 20 * Math.sin(x / 70 + base * 2) * rand());
    g.lineTo(W, H); g.fill();
  }
  // העיר
  const city = (x, w, h) => {
    const top = 760 - h;
    g.fillStyle = lin(g, x, top, x + w, top, [[0, hsl(36, 30, 72)], [1, hsl(32, 28, 52)]]); g.fillRect(x, top, w, h);
    g.fillStyle = 'rgba(60,40,30,.55)';
    for (let wy = top + 14; wy < 740; wy += 26) for (let wx = x + 8; wx < x + w - 10; wx += 22) if (rand() < 0.5) { g.beginPath(); g.moveTo(wx, wy + 12); g.lineTo(wx, wy + 4); g.arc(wx + 4, wy + 4, 4, Math.PI, 0); g.lineTo(wx + 8, wy + 12); g.fill(); }
  };
  for (let x = -20; x < W; x += 40 + rand() * 50) city(x, 60 + rand() * 70, 70 + rand() * 90);
  const dome = (cx, r, base, col, hi) => {
    g.fillStyle = hsl(36, 28, 64); g.fillRect(cx - r - 12, base - 30, 2 * r + 24, 60);
    g.fillStyle = lin(g, cx - r, 0, cx + r, 0, [[0, hi], [0.55, col], [1, 'rgba(0,0,0,.35)']]);
    g.beginPath(); g.arc(cx, base - 30, r, Math.PI, 0); g.fill();
    g.fillStyle = col; g.fillRect(cx - 2, base - 30 - r - 22, 4, 24);
  };
  dome(1180, 74, 690, '#d9a531', '#fff1b0'); // כיפת הזהב
  g.fillStyle = '#3d6a9e'; g.fillRect(1180 - 86, 660, 172, 30); // בסיס מתומן מעוטר
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8e2cf' : '#2f5d8f'; g.fillRect(1100 + i * 20, 668, 14, 16); }
  dome(890, 58, 700, '#f2efe6', '#ffffff'); // החורבה
  dome(620, 34, 720, '#6c7c8a', '#c9d3db');
  // מגדל דוד
  g.fillStyle = lin(g, 380, 0, 440, 0, [[0, hsl(36, 30, 76)], [1, hsl(32, 26, 54)]]); g.fillRect(380, 470, 60, 290);
  g.fillRect(372, 470, 76, 14); g.beginPath(); g.moveTo(380, 470); g.lineTo(410, 420); g.lineTo(440, 470); g.fill();
  g.fillStyle = 'rgba(60,40,30,.6)'; for (let wy = 500; wy < 740; wy += 50) { g.fillRect(404, wy, 12, 22); }
  // ברושים
  for (let i = 0; i < 14; i++) { const x = rand() * W, hh = 80 + rand() * 90; g.fillStyle = hsl(140, 30, 16 + rand() * 8); g.beginPath(); g.ellipse(x, 760 - hh / 2, 12 + rand() * 6, hh / 2, 0, 0, 7); g.fill(); }
  // חומת העיר העתיקה
  const wallTop = 760;
  for (let x = 0; x < W; x += 54) { stone(g, rand, x, wallTop - 46, 34, 46, 38, 70, false); }
  let y = wallTop, row = 0;
  while (y < H) { const h = 46 + row * 6; let x = -rand() * 80; while (x < W) { const w = 70 + rand() * 90; stone(g, rand, x, y, w, h, 38, 70, false); x += w; } y += h; row++; }
  // שער
  g.fillStyle = 'rgba(25,18,14,.85)'; g.beginPath(); g.moveTo(900, H); g.lineTo(900, 900); g.arc(960, 900, 60, Math.PI, 0); g.lineTo(1020, H); g.fill();
  g.strokeStyle = hsl(36, 30, 80); g.lineWidth = 8; g.beginPath(); g.arc(960, 900, 70, Math.PI, 0); g.stroke();
}

// ---------- רקע: היכל עם עמודים ופרוכת ----------
export function heichal(g, rand, palette) {
  const { wall, velvet, velvetDark, gold } = palette;
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, wall[0]], [1, wall[1]]]); g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,220,150,.07)'; g.lineWidth = 2; // טפט דמשק
  for (let y = 60; y < H; y += 120) for (let x = (y / 120) % 2 ? 60 : 0; x < W; x += 120) { star(g, x, y, 26); g.beginPath(); g.arc(x, y, 40, 0, 7); g.stroke(); }
  // עמודים
  const column = (x, w) => {
    g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#cbbf9f'], [0.35, '#fbf6e8'], [0.7, '#e6dcc2'], [1, '#a99d7e']]); g.fillRect(x, 250, w, H - 250);
    g.strokeStyle = 'rgba(140,120,90,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) { g.beginPath(); let vx = x + rand() * w; g.moveTo(vx, 260); for (let vy = 260; vy < H; vy += 60) { vx += (rand() - 0.5) * 18; g.lineTo(vx, vy); } g.stroke(); }
    for (let i = 1; i < 5; i++) { g.fillStyle = 'rgba(120,100,70,.18)'; g.fillRect(x + (w / 5) * i - 2, 300, 4, H - 360); } // חריצים
    g.fillStyle = lin(g, x - 20, 0, x + w + 20, 0, [[0, gold[1]], [0.5, gold[0]], [1, gold[1]]]); // כותרת
    rrect(g, x - 22, 218, w + 44, 46, 10); g.fill(); rrect(g, x - 12, H - 70, w + 24, 70, 6); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x - 6, 241, 14, 0, 7); g.arc(x + w + 6, 241, 14, 0, 7); g.fill();
  };
  column(18, 96); column(W - 114, 96);
  // פרוכת – וילון קטיפה עם קפלים
  const curtain = (side) => {
    g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
    const path = () => { g.beginPath(); g.moveTo(120, 0); g.lineTo(560, 0); g.bezierCurveTo(470, 260, 300, 470, 200, 560); g.bezierCurveTo(250, 720, 300, 900, 330, H); g.lineTo(120, H); g.closePath(); };
    path(); g.fillStyle = lin(g, 120, 0, 560, 0, [[0, velvetDark], [0.2, velvet], [0.35, velvetDark], [0.55, velvet], [0.7, velvetDark], [0.88, velvet], [1, velvetDark]]); g.fill();
    path(); g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(255,255,255,.08)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.35)']]); g.fill();
    g.strokeStyle = gold[0]; g.lineWidth = 10; g.beginPath(); g.moveTo(560, 0); g.bezierCurveTo(470, 260, 300, 470, 200, 560); g.stroke(); // שוליים מוזהבים
    g.fillStyle = lin(g, 150, 540, 260, 580, [[0, gold[0]], [1, gold[1]]]); rrect(g, 150, 540, 110, 34, 16); g.fill(); // חבל קשירה
    g.strokeStyle = gold[0]; g.lineWidth = 4; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(178 + i * 6, 574); g.lineTo(172 + i * 7, 650); g.stroke(); } // גדיל
    g.restore();
  };
  curtain(0); curtain(1);
  // כרכוב עליון עם גדילים
  g.fillStyle = lin(g, 0, 0, 0, 120, [[0, velvetDark], [1, velvet]]);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 70);
  for (let x = W; x >= 0; x -= 160) g.quadraticCurveTo(x - 80, 150, x - 160, 70);
  g.closePath(); g.fill();
  g.strokeStyle = gold[0]; g.lineWidth = 8; g.beginPath(); g.moveTo(W, 70);
  for (let x = W; x >= 0; x -= 160) g.quadraticCurveTo(x - 80, 150, x - 160, 70);
  g.stroke();
  g.fillStyle = gold[0]; for (let x = 160; x < W; x += 160) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x - 9, 118); g.lineTo(x + 9, 118); g.fill(); g.beginPath(); g.arc(x, 124, 9, 0, 7); g.fill(); }
}

// ---------- רקע: חיתוך נייר בסגנון כתובה ----------
export function papercut(g, rand, palette) {
  const { field, paper } = palette;
  g.fillStyle = lin(g, 0, 0, W, H, [[0, field[0]], [1, field[1]]]); g.fillRect(0, 0, W, H);
  const [c, p] = canvas();
  const B = 96; // עובי המסגרת (הסלסול חורג עוד כמה פיקסלים פנימה)
  p.fillStyle = paper; p.fillRect(0, 0, W, H);
  p.globalCompositeOperation = 'destination-out';
  p.fillRect(B, B, W - 2 * B, H - 2 * B);
  // תחרה: שורת עיגולים חיצונית, חלונות קשת עם יהלום ביניהם, וסלסול בשפה הפנימית
  const along = (fn) => {
    for (let x = 150; x < W - 140; x += 64) { fn(x, 0, 0); fn(x, H, Math.PI); }
    for (let y = 150; y < H - 140; y += 64) { fn(0, y, -Math.PI / 2); fn(W, y, Math.PI / 2); }
  };
  along((x, y, a) => { p.save(); p.translate(x, y); p.rotate(a);
    p.beginPath(); p.arc(0, 16, 6, 0, 7); p.fill(); // עיגול חיצוני
    p.beginPath(); p.moveTo(-13, 76); p.lineTo(-13, 46); p.arc(0, 46, 13, Math.PI, 0); p.lineTo(13, 76); p.closePath(); p.fill(); // חלון קשת
    p.beginPath(); p.moveTo(32, 44); p.lineTo(40, 56); p.lineTo(32, 68); p.lineTo(24, 56); p.closePath(); p.fill(); // יהלום
    p.beginPath(); p.arc(32, 96, 13, Math.PI, 0); p.fill(); // סלסול פנימי
    p.restore(); });
  // מדליונים בפינות עם מגן דוד חלול
  for (const [x, y] of [[B / 2 + 6, B / 2 + 6], [W - B / 2 - 6, B / 2 + 6], [B / 2 + 6, H - B / 2 - 6], [W - B / 2 - 6, H - B / 2 - 6]]) {
    p.globalCompositeOperation = 'source-over'; p.fillStyle = paper; p.beginPath(); p.arc(x, y, 74, 0, 7); p.fill();
    p.globalCompositeOperation = 'destination-out'; p.lineWidth = 10; p.strokeStyle = '#000'; star(p, x, y, 48);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; p.beginPath(); p.arc(x + 62 * Math.cos(a), y + 62 * Math.sin(a), 6, 0, 7); p.fill(); }
  }
  // רימונים באמצע הצדדים
  for (const [x, y, a] of [[W / 2, B / 2 + 6, 0], [W / 2, H - B / 2 - 6, Math.PI]]) {
    p.save(); p.translate(x, y); p.rotate(a);
    p.globalCompositeOperation = 'source-over'; p.fillStyle = paper; p.beginPath(); p.ellipse(0, 0, 150, 62, 0, 0, 7); p.fill();
    p.globalCompositeOperation = 'destination-out';
    for (const dx of [-70, 70]) { p.beginPath(); p.arc(dx, 6, 30, 0, 7); p.fill(); p.beginPath(); p.moveTo(dx - 12, -22); p.lineTo(dx - 6, -40); p.lineTo(dx, -26); p.lineTo(dx + 6, -40); p.lineTo(dx + 12, -22); p.fill(); }
    p.lineWidth = 8; p.strokeStyle = '#000'; p.beginPath(); p.moveTo(-30, 0); p.quadraticCurveTo(0, -36, 30, 0); p.quadraticCurveTo(0, 36, -30, 0); p.stroke();
    p.restore();
  }
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 14; g.shadowOffsetY = 6; g.drawImage(c, 0, 0); g.restore();
  g.strokeStyle = paper; g.lineWidth = 3; g.strokeRect(B + 14, B + 14, W - 2 * B - 28, H - 2 * B - 28);
}

// ---------- איורים לברכות ----------
export function candlestick(g, x, y, s) {
  g.fillStyle = lin(g, x - 40 * s, 0, x + 40 * s, 0, [[0, '#8d8f96'], [0.45, '#f5f6f8'], [1, '#7c7e86']]);
  g.beginPath(); g.ellipse(x, y, 70 * s, 18 * s, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(x - 50 * s, y); g.quadraticCurveTo(x - 14 * s, y - 40 * s, x - 12 * s, y - 120 * s); g.lineTo(x + 12 * s, y - 120 * s); g.quadraticCurveTo(x + 14 * s, y - 40 * s, x + 50 * s, y); g.fill();
  g.fillRect(x - 10 * s, y - 260 * s, 20 * s, 150 * s);
  for (const k of [130, 190, 250]) { g.beginPath(); g.ellipse(x, y - k * s, 22 * s, 9 * s, 0, 0, 7); g.fill(); }
  g.beginPath(); g.ellipse(x, y - 268 * s, 34 * s, 12 * s, 0, 0, 7); g.fill();
  g.fillStyle = lin(g, x - 14 * s, 0, x + 14 * s, 0, [[0, '#e9e2d0'], [0.4, '#fffaf0'], [1, '#d6ccb4']]);
  g.fillRect(x - 13 * s, y - 420 * s, 26 * s, 152 * s);
  g.strokeStyle = '#222'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y - 420 * s); g.lineTo(x, y - 432 * s); g.stroke();
  flame(g, x, y - 446 * s, 1.1 * s);
}
export function challah(g, x, y, s) {
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 40 * s, 230 * s, 34 * s, 0, 0, 7); g.fill();
  g.fillStyle = lin(g, 0, y - 60 * s, 0, y + 40 * s, [[0, '#4b1d2b'], [1, '#2a0f18']]); // כיסוי חלה
  g.beginPath(); g.moveTo(x - 240 * s, y + 30 * s); g.quadraticCurveTo(x - 220 * s, y - 120 * s, x, y - 110 * s); g.quadraticCurveTo(x + 220 * s, y - 120 * s, x + 240 * s, y + 30 * s); g.closePath(); g.fill();
  g.strokeStyle = '#e6c97a'; g.lineWidth = 6 * s; g.stroke(); g.lineWidth = 4 * s; star(g, x, y - 40 * s, 40 * s);
  g.fillStyle = '#e6c97a'; g.font = `700 ${34 * s}px "Frank Ruhl Libre", serif`; g.textAlign = 'center'; g.fillText('שבת קודש', x, y + 18 * s);
}
export function kiddush(g, x, y, s) {
  g.fillStyle = lin(g, x - 60 * s, 0, x + 60 * s, 0, [[0, '#8a8c93'], [0.4, '#f7f8fa'], [1, '#76787f']]);
  g.beginPath(); g.ellipse(x, y, 60 * s, 14 * s, 0, 0, 7); g.fill();
  g.fillRect(x - 9 * s, y - 120 * s, 18 * s, 120 * s);
  g.beginPath(); g.moveTo(x - 70 * s, y - 250 * s); g.quadraticCurveTo(x - 70 * s, y - 120 * s, x, y - 118 * s); g.quadraticCurveTo(x + 70 * s, y - 120 * s, x + 70 * s, y - 250 * s); g.closePath(); g.fill();
  g.fillStyle = '#7b1323'; g.beginPath(); g.ellipse(x, y - 246 * s, 66 * s, 12 * s, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(90,90,100,.5)'; g.lineWidth = 3 * s; star(g, x, y - 180 * s, 26 * s);
}

export function chanukiah(g, x, y, s, lit) {
  const gold = lin(g, x - 400 * s, 0, x + 400 * s, 0, [[0, '#9c7322'], [0.5, '#f6dc8a'], [1, '#9c7322']]);
  g.strokeStyle = gold; g.fillStyle = gold; g.lineCap = 'round';
  // בסיס וגבעול
  g.beginPath(); g.ellipse(x, y, 160 * s, 26 * s, 0, 0, 7); g.fill();
  g.lineWidth = 26 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 330 * s); g.stroke();
  // זרועות בצורת קשתות
  g.lineWidth = 16 * s;
  for (let i = 1; i <= 4; i++) {
    const r = i * 82 * s;
    g.beginPath(); g.arc(x, y - 330 * s, r, Math.PI * 0.0, Math.PI, false); g.stroke();
  }
  const cups = [];
  for (let i = 4; i >= 1; i--) cups.push(x + i * 82 * s); // ימין
  for (let i = 1; i <= 4; i++) cups.push(x - i * 82 * s); // שמאל
  // הנרות מתווספים מימין לשמאל (מבט המתבונן)
  const order = [...cups].sort((a, b) => b - a);
  g.lineWidth = 4 * s;
  order.forEach((cx, idx) => {
    const top = y - 330 * s;
    g.fillStyle = gold; rrect(g, cx - 24 * s, top - 30 * s, 48 * s, 30 * s, 8 * s); g.fill();
    if (idx < lit) {
      g.fillStyle = idx === lit - 1 ? '#d6e6ff' : '#f2f2f2'; g.fillRect(cx - 9 * s, top - 120 * s, 18 * s, 90 * s);
      flame(g, cx, top - 136 * s, 0.7 * s);
    }
  });
  // השמש
  g.fillStyle = gold; rrect(g, x - 28 * s, y - 470 * s, 56 * s, 34 * s, 8 * s); g.fill();
  g.lineWidth = 20 * s; g.beginPath(); g.moveTo(x, y - 330 * s); g.lineTo(x, y - 440 * s); g.stroke();
  g.fillStyle = '#f2f2f2'; g.fillRect(x - 10 * s, y - 570 * s, 20 * s, 100 * s); flame(g, x, y - 586 * s, 0.8 * s);
}

export function lulavEtrog(g, x, y, s) {
  g.save(); g.translate(x, y); g.rotate(-0.18);
  g.fillStyle = lin(g, -22 * s, 0, 22 * s, 0, [[0, '#5a7a2c'], [0.5, '#9bbf55'], [1, '#4f6b25']]);
  g.beginPath(); g.moveTo(-30 * s, 0); g.lineTo(-16 * s, -640 * s); g.quadraticCurveTo(0, -690 * s, 16 * s, -640 * s); g.lineTo(30 * s, 0); g.fill();
  g.strokeStyle = 'rgba(40,60,20,.5)'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -660 * s); g.stroke();
  for (let i = 0; i < 26; i++) { // הדסים וערבות
    const myrtle = i < 16, yy = -60 * s - (myrtle ? i : i - 16) * (myrtle ? 18 : 26) * s, side = i % 2 ? 1 : -1;
    g.fillStyle = myrtle ? '#2f5b2a' : '#7aa352';
    g.beginPath(); g.ellipse(side * (myrtle ? 40 : 54) * s, yy - 40 * s, (myrtle ? 13 : 7) * s, (myrtle ? 22 : 64) * s, side * (myrtle ? 0.6 : 0.25), 0, 7); g.fill();
  }
  g.fillStyle = '#c99a3e'; rrect(g, -30 * s, -40 * s, 60 * s, 44 * s, 10 * s); g.fill(); // כוי
  g.restore();
  g.fillStyle = rad(g, x + 190 * s, y - 60 * s, 10, 110 * s, [[0, '#fff3a3'], [0.6, '#e6c43a'], [1, '#b08a1c']]);
  g.beginPath(); g.ellipse(x + 200 * s, y - 70 * s, 110 * s, 78 * s, -0.25, 0, 7); g.fill();
  g.fillStyle = '#6e5320'; g.beginPath(); g.arc(x + 300 * s, y - 104 * s, 8 * s, 0, 7); g.fill(); // פיטם
}

export function shofarApples(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // צל רך על הקרקע
  g.fillStyle = rad(g, 0, 150, 10, 420, [[0, 'rgba(0,0,0,.32)'], [1, 'rgba(0,0,0,0)']]);
  g.beginPath(); g.ellipse(0, 150, 420, 46, 0, 0, 7); g.fill();

  // ---- שופר: צינור מתחדד לאורך עקומה, עם טבעות ופתח ----
  const P = [[-330, 30], [-250, -250], [150, -300], [300, -120]]; // עקומת בזייה
  const bz = (t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]); };
  const N = 90, pts = [], left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, [px, py] = bz(t), [qx, qy] = bz(Math.min(1, t + 0.01)), [ox, oy] = bz(Math.max(0, t - 0.01));
    const dx = qx - ox, dy = qy - oy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const w = 9 + Math.pow(t, 1.7) * 62 + Math.sin(t * 40) * 1.2; // מתרחב לכיוון הפתח
    pts.push([px, py, nx, ny, w]); left.push([px + nx * w, py + ny * w]); right.push([px - nx * w, py - ny * w]);
  }
  g.save();
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 14;
  g.beginPath(); left.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); for (let i = right.length - 1; i >= 0; i--) g.lineTo(...right[i]); g.closePath();
  g.fillStyle = lin(g, -330, 0, 320, 0, [[0, '#3b2414'], [0.12, '#7a5230'], [0.45, '#d8b07a'], [0.75, '#f1dcb2'], [1, '#e6c58e']]);
  g.fill(); g.restore();
  // הצללה תלת־ממדית: צד אחד כהה, פס אור באמצע
  g.save();
  g.beginPath(); left.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); for (let i = right.length - 1; i >= 0; i--) g.lineTo(...right[i]); g.closePath(); g.clip();
  g.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay, nx, ny, w] = pts[i - 1], [bx, by] = pts[i];
    g.strokeStyle = 'rgba(60,35,15,.13)'; g.lineWidth = w * 0.7; g.beginPath(); g.moveTo(ax - nx * w * 0.7, ay - ny * w * 0.7); g.lineTo(bx - nx * w * 0.7, by - ny * w * 0.7); g.stroke();
    g.strokeStyle = 'rgba(60,35,15,.10)'; g.lineWidth = w * 0.4; g.beginPath(); g.moveTo(ax - nx * w * 0.85, ay - ny * w * 0.85); g.lineTo(bx - nx * w * 0.85, by - ny * w * 0.85); g.stroke();
    g.strokeStyle = 'rgba(255,250,235,.5)'; g.lineWidth = Math.max(2, w * 0.14); g.beginPath(); g.moveTo(ax + nx * w * 0.42, ay + ny * w * 0.42); g.lineTo(bx + nx * w * 0.42, by + ny * w * 0.42); g.stroke();
  }
  // טבעות הקרן
  for (let i = 6; i < N - 4; i += 5) {
    const [px, py, nx, ny, w] = pts[i];
    g.strokeStyle = `rgba(70,42,18,${0.18 + (i / N) * 0.12})`; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(px + nx * w, py + ny * w); g.quadraticCurveTo(px + (pts[i + 1][0] - px) * 3, py + (pts[i + 1][1] - py) * 3, px - nx * w, py - ny * w); g.stroke();
  }
  g.restore();
  // פתח השופר
  { const [px, py, nx, ny, w] = pts[N], ang = Math.atan2(ny, nx);
    g.save(); g.translate(px, py); g.rotate(ang);
    g.fillStyle = lin(g, -w, 0, w, 0, [[0, '#caa673'], [0.5, '#f6e6c4'], [1, '#b88d55']]); g.beginPath(); g.ellipse(0, 0, w + 3, 22, 0, 0, 7); g.fill();
    g.fillStyle = rad(g, 0, 0, 2, w, [[0, '#1d1006'], [0.7, '#3d2410'], [1, '#6b4523']]); g.beginPath(); g.ellipse(0, 2, w - 9, 14, 0, 0, 7); g.fill();
    g.restore(); }
  // פיה
  { const [px, py, nx, ny, w] = pts[0]; g.fillStyle = '#2a170b'; g.beginPath(); g.ellipse(px, py, w + 2, 5, Math.atan2(ny, nx), 0, 7); g.fill(); }

  // ---- תפוח ----
  const apple = (ax, ay, r, hue, rot) => {
    g.save(); g.translate(ax, ay); g.rotate(rot);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 20; g.shadowOffsetY = 10;
    g.beginPath(); g.moveTo(0, -r * 0.78);
    g.bezierCurveTo(r * 0.55, -r * 1.12, r * 1.12, -r * 0.62, r * 1.02, r * 0.08);
    g.bezierCurveTo(r * 0.95, r * 0.75, r * 0.45, r * 1.02, 0, r * 0.9);
    g.bezierCurveTo(-r * 0.45, r * 1.02, -r * 0.95, r * 0.75, -r * 1.02, r * 0.08);
    g.bezierCurveTo(-r * 1.12, -r * 0.62, -r * 0.55, -r * 1.12, 0, -r * 0.78); g.closePath();
    g.fillStyle = rad(g, -r * 0.35, -r * 0.3, r * 0.05, r * 1.25, [[0, hue[0]], [0.45, hue[1]], [0.85, hue[2]], [1, '#3e0508']]);
    g.fill(); g.shadowColor = 'transparent';
    g.save(); g.clip();
    g.fillStyle = rad(g, r * 0.55, r * 0.35, 0, r * 0.7, [[0, 'rgba(240,190,60,.45)'], [1, 'rgba(240,190,60,0)']]); g.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4); // גוון צהבהב
    for (let k = 0; k < 26; k++) { const a = k * 0.9, rr = r * (0.2 + (k % 7) / 8); g.fillStyle = 'rgba(255,230,180,.18)'; g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.9, 1.6, 0, 7); g.fill(); } // נקודות קליפה
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.38, r * 0.16, r * 0.26, -0.6, 0, 7); g.fill(); // ברק
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * 0.62, -r * 0.05, r * 0.06, r * 0.12, -0.3, 0, 7); g.fill();
    g.fillStyle = rad(g, 0, -r * 0.74, 0, r * 0.22, [[0, 'rgba(60,10,10,.75)'], [1, 'rgba(60,10,10,0)']]); g.beginPath(); g.ellipse(0, -r * 0.74, r * 0.24, r * 0.1, 0, 0, 7); g.fill(); // גומה
    g.strokeStyle = '#4a2c14'; g.lineWidth = r * 0.07; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -r * 0.74); g.quadraticCurveTo(r * 0.04, -r * 1.0, r * 0.14, -r * 1.12); g.stroke(); // עוקץ
    g.save(); g.translate(r * 0.16, -r * 1.02); g.rotate(-0.55); // עלה
    g.fillStyle = lin(g, 0, -r * 0.12, 0, r * 0.12, [[0, '#7fb24a'], [1, '#3d6b22']]);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(r * 0.28, -r * 0.2, r * 0.58, 0); g.quadraticCurveTo(r * 0.28, r * 0.2, 0, 0); g.fill();
    g.strokeStyle = 'rgba(30,60,15,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(r * 0.55, 0); g.stroke();
    g.restore(); g.restore();
  };
  // ---- צנצנת דבש עם כף דבש ----
  const jar = (jx, jy) => {
    g.save(); g.translate(jx, jy);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 20; g.shadowOffsetY = 10;
    g.beginPath(); g.moveTo(-70, -60); g.bezierCurveTo(-96, -40, -96, 100, -70, 120); g.lineTo(70, 120); g.bezierCurveTo(96, 100, 96, -40, 70, -60); g.closePath();
    g.fillStyle = 'rgba(255,240,210,.25)'; g.fill(); g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(255,245,225,.55)'; g.lineWidth = 3; g.stroke();
    g.save(); g.clip();
    g.fillStyle = lin(g, -90, 0, 90, 0, [[0, '#8a4a06'], [0.35, '#e79a1c'], [0.6, '#f7c14a'], [1, '#9a540a']]); g.fillRect(-100, -24, 200, 150); // דבש
    g.fillStyle = 'rgba(255,220,130,.6)'; g.beginPath(); g.ellipse(0, -24, 92, 10, 0, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-60, -34); g.bezierCurveTo(-78, 0, -78, 70, -62, 100); g.stroke(); // ברק זכוכית
    g.fillStyle = lin(g, 0, -86, 0, -58, [[0, '#d9b66a'], [1, '#9c7322']]); rrect(g, -76, -88, 152, 30, 8); g.fill(); // מכסה
    g.fillStyle = '#b7322c'; g.beginPath(); g.moveTo(-86, -80); g.lineTo(86, -80); g.lineTo(70, -50); g.lineTo(-70, -50); g.closePath(); g.fill(); // בד משובץ
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; for (let k = -70; k <= 70; k += 20) { g.beginPath(); g.moveTo(k, -80); g.lineTo(k * 0.85, -50); g.stroke(); }
    g.strokeStyle = '#c9a24f'; g.lineWidth = 5; g.beginPath(); g.moveTo(-74, -58); g.lineTo(74, -58); g.stroke(); // חבל
    // כף דבש מעץ
    g.save(); g.translate(40, -40); g.rotate(0.5);
    g.fillStyle = lin(g, -6, 0, 6, 0, [[0, '#7a4e22'], [0.5, '#c88f52'], [1, '#6a421c']]); rrect(g, -6, -170, 12, 150, 6); g.fill();
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#c88f52' : '#9a6630'; g.beginPath(); g.ellipse(0, -10 - k * 9, 18 - k * 1.5, 5, 0, 0, 7); g.fill(); }
    g.fillStyle = '#e8a22a'; g.beginPath(); g.moveTo(-6, -2); g.quadraticCurveTo(0, 26, 6, -2); g.fill(); // טיפה
    g.restore();
    g.restore();
  };
  // ---- רימון ----
  const pomegranate = (px, py, r) => {
    g.save(); g.translate(px, py);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18; g.shadowOffsetY = 8;
    g.fillStyle = rad(g, -r * 0.35, -r * 0.35, 4, r * 1.2, [[0, '#ff8a70'], [0.45, '#c0262e'], [1, '#4a0610']]);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = lin(g, 0, -r * 1.25, 0, -r * 0.8, [[0, '#8f1a22'], [1, '#c0262e']]); // כתר
    g.beginPath(); g.moveTo(-r * 0.3, -r * 0.85); for (let k = 0; k < 5; k++) { const xx = -r * 0.3 + k * r * 0.15; g.lineTo(xx + r * 0.075, -r * 1.22); g.lineTo(xx + r * 0.15, -r * 0.9); } g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.35, r * 0.13, r * 0.24, -0.6, 0, 7); g.fill();
    g.restore();
  };
  pomegranate(-250, 108, 62);
  jar(280, 40);
  apple(-110, 88, 84, ['#ff9a7a', '#d9262c', '#8a0c14'], -0.12);
  apple(70, 104, 76, ['#ff8f6e', '#c41f27', '#7c0a12'], 0.18);
  g.restore();
}

export function purimMasks(g, x, y, s, rand) {
  for (let i = 0; i < 120; i++) { g.fillStyle = hsl(rand() * 360, 80, 60, 0.85); g.save(); g.translate(x + (rand() - 0.5) * 900 * s, y - rand() * 560 * s); g.rotate(rand() * 3); g.fillRect(-6, -3, 12, 6); g.restore(); }
  const mask = (mx, my, col, flip) => {
    g.save(); g.translate(mx, my); if (flip) g.scale(-1, 1); g.rotate(-0.12);
    g.fillStyle = col; g.beginPath(); g.moveTo(-170 * s, -20 * s); g.bezierCurveTo(-150 * s, -110 * s, 150 * s, -110 * s, 170 * s, -20 * s); g.bezierCurveTo(150 * s, 70 * s, 40 * s, 60 * s, 0, 30 * s); g.bezierCurveTo(-40 * s, 60 * s, -150 * s, 70 * s, -170 * s, -20 * s); g.fill();
    g.fillStyle = '#1b1020'; g.beginPath(); g.ellipse(-70 * s, -20 * s, 44 * s, 24 * s, 0.2, 0, 7); g.ellipse(70 * s, -20 * s, 44 * s, 24 * s, -0.2, 0, 7); g.fill();
    g.strokeStyle = '#f6dc8a'; g.lineWidth = 6 * s; g.beginPath(); g.moveTo(-170 * s, -20 * s); g.bezierCurveTo(-150 * s, -110 * s, 150 * s, -110 * s, 170 * s, -20 * s); g.stroke();
    g.strokeStyle = '#c99a3e'; g.lineWidth = 8 * s; g.beginPath(); g.moveTo(160 * s, 10 * s); g.lineTo(240 * s, 220 * s); g.stroke();
    g.restore();
  };
  mask(x - 170 * s, y - 220 * s, '#7b2fa0', false); mask(x + 190 * s, y - 160 * s, '#c8312b', true);
  for (let i = 0; i < 3; i++) { // אוזני המן
    const hx = x - 200 * s + i * 200 * s, hy = y + 10 * s;
    g.fillStyle = '#d9a35a'; g.beginPath(); g.moveTo(hx, hy - 70 * s); g.lineTo(hx + 72 * s, hy + 50 * s); g.lineTo(hx - 72 * s, hy + 50 * s); g.closePath(); g.fill();
    g.fillStyle = '#3a1d2a'; g.beginPath(); g.arc(hx, hy + 8 * s, 22 * s, 0, 7); g.fill();
  }
}

export function seder(g, x, y, s) {
  for (let i = 0; i < 3; i++) { // מצות
    g.fillStyle = lin(g, 0, y - 20 * s, 0, y + 20 * s, [[0, '#f1dfae'], [1, '#c99e5c']]);
    rrect(g, x - 420 * s + i * 10 * s, y - 40 * s - i * 26 * s, 300 * s, 260 * s, 18 * s); g.fill();
    g.fillStyle = 'rgba(110,70,30,.35)'; for (let k = 0; k < 40; k++) g.fillRect(x - 400 * s + i * 10 * s + (k % 8) * 34 * s, y - 20 * s - i * 26 * s + Math.floor(k / 8) * 46 * s, 4 * s, 4 * s);
  }
  g.fillStyle = lin(g, x - 220 * s, 0, x + 220 * s, 0, [[0, '#9c7322'], [0.5, '#f6dc8a'], [1, '#9c7322']]);
  g.beginPath(); g.ellipse(x + 180 * s, y + 40 * s, 240 * s, 120 * s, 0, 0, 7); g.fill();
  g.fillStyle = '#fbf6e8'; g.beginPath(); g.ellipse(x + 180 * s, y + 34 * s, 210 * s, 100 * s, 0, 0, 7); g.fill();
  const items = ['זרוע', 'ביצה', 'מרור', 'חרוסת', 'כרפס', 'חזרת'];
  g.font = `700 ${22 * s}px "Frank Ruhl Libre", serif`; g.textAlign = 'center';
  items.forEach((t, i) => {
    const a = i * Math.PI / 3 - Math.PI / 2, ix = x + 180 * s + Math.cos(a) * 140 * s, iy = y + 34 * s + Math.sin(a) * 62 * s;
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.ellipse(ix, iy, 48 * s, 26 * s, 0, 0, 7); g.fill();
    g.fillStyle = '#5a3a1a'; g.fillText(t, ix, iy + 8 * s);
  });
  kiddush(g, x + 470 * s, y + 80 * s, 0.9 * s);
}

export function wheat(g, x, y, s, rand) {
  for (let i = 0; i < 15; i++) {
    const a = -Math.PI / 2 + (i - 7) * 0.09, len = 520 * s + rand() * 60 * s;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    g.strokeStyle = '#b98f3d'; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (ex - x) * 0.4, y + (ey - y) * 0.6, ex, ey); g.stroke();
    for (let k = 0; k < 9; k++) {
      const t = 0.72 + k * 0.03, gx = x + (ex - x) * t, gy = y + (ey - y) * t;
      g.fillStyle = k % 2 ? '#e6bf5e' : '#d5a843';
      g.beginPath(); g.ellipse(gx - 9 * s, gy, 7 * s, 15 * s, a + Math.PI / 2 - 0.5, 0, 7); g.ellipse(gx + 9 * s, gy, 7 * s, 15 * s, a + Math.PI / 2 + 0.5, 0, 7); g.fill();
    }
  }
  g.fillStyle = '#8a5a2a'; rrect(g, x - 50 * s, y - 120 * s, 100 * s, 34 * s, 10 * s); g.fill(); // קשירה
  for (let i = 0; i < 9; i++) { // פרחים
    const fx = x - 380 * s + rand() * 760 * s, fy = y - 20 * s + rand() * 60 * s, col = ['#e35d6a', '#f4f4f4', '#f2c14e', '#b06ad8'][i % 4];
    for (let p = 0; p < 6; p++) { g.fillStyle = col; g.beginPath(); g.ellipse(fx + Math.cos(p) * 18 * s, fy + Math.sin(p) * 18 * s, 14 * s, 9 * s, p, 0, 7); g.fill(); }
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(fx, fy, 9 * s, 0, 7); g.fill();
  }
}

export function torahScroll(g, x, y, s) {
  const roll = (rx) => {
    g.fillStyle = lin(g, rx - 40 * s, 0, rx + 40 * s, 0, [[0, '#cdb88a'], [0.5, '#fbf3dc'], [1, '#b9a274']]);
    g.fillRect(rx - 40 * s, y - 360 * s, 80 * s, 480 * s);
    g.fillStyle = '#5a321b'; g.fillRect(rx - 10 * s, y - 440 * s, 20 * s, 80 * s); g.fillRect(rx - 10 * s, y + 120 * s, 20 * s, 70 * s);
    g.fillStyle = '#c99a3e'; g.beginPath(); g.ellipse(rx, y - 444 * s, 30 * s, 14 * s, 0, 0, 7); g.ellipse(rx, y + 190 * s, 26 * s, 10 * s, 0, 0, 7); g.fill();
  };
  g.fillStyle = lin(g, 0, y - 340 * s, 0, y + 110 * s, [[0, '#f7ecd0'], [1, '#e9d9b0']]); g.fillRect(x - 220 * s, y - 340 * s, 440 * s, 450 * s);
  g.fillStyle = 'rgba(40,30,20,.75)';
  for (let col = 0; col < 3; col++) for (let ln = 0; ln < 15; ln++) { const lx = x + 130 * s - col * 130 * s; g.fillRect(lx - 50 * s + (ln % 3) * 6 * s, y - 310 * s + ln * 27 * s, 100 * s - (ln % 4) * 8 * s, 6 * s); }
  roll(x - 260 * s); roll(x + 260 * s);
}

// ---------- ממשק ----------
export const PALETTES = {
  classic: { wall: ['#13284d', '#0b1830'], velvet: '#24477f', velvetDark: '#0f2347', gold: ['#f2d78a', '#9c7322'], field: ['#16305c', '#0c1c38'], paper: '#f3e7c8' },
  chassidic: { wall: ['#3e1218', '#240a0e'], velvet: '#8e1c2a', velvetDark: '#4c0d16', gold: ['#f2d78a', '#9c7322'], field: ['#5a1820', '#2a0a0e'], paper: '#f3e7c8' },
  ashkenaz: { wall: ['#173a2c', '#0b2018'], velvet: '#2a6a4c', velvetDark: '#123826', gold: ['#e9cf8e', '#8f6f2a'], field: ['#1d4434', '#0b1d15'], paper: '#efe3c2' },
  royal: { wall: ['#2c1652', '#160a2c'], velvet: '#5a2c96', velvetDark: '#2c1452', gold: ['#f2d78a', '#9c7322'], field: ['#3d1f6e', '#1a0b33'], paper: '#f3e7c8' },
  sky: { wall: ['#2a64a8', '#163e72'], velvet: '#2f72bd', velvetDark: '#16437a', gold: ['#f4f6fa', '#8f9bb0'], field: ['#2f72bd', '#123a6c'], paper: '#f5f8fc' },
  sephardi: { wall: ['#0f474d', '#072a2e'], velvet: '#1a6e74', velvetDark: '#0b3b40', gold: ['#f0bf92', '#9a5a2a'], field: ['#135a60', '#072a2e'], paper: '#f3e7c8' },
  stone: { wall: ['#6b5238', '#3b2a1c'], velvet: '#7a5634', velvetDark: '#4a321e', gold: ['#f2d78a', '#9c7322'], field: ['#5a412b', '#2a1d12'], paper: '#f7efdf' },
  night: { wall: ['#1c2029', '#0b0c10'], velvet: '#2c3240', velvetDark: '#14171e', gold: ['#eef1f6', '#8a92a2'], field: ['#1c2029', '#07080b'], paper: '#eef0f4' },
  modern: { wall: ['#e9edf2', '#cfd8e3'], velvet: '#2f6f8f', velvetDark: '#1b4a61', gold: ['#cfe3ee', '#6e98ad'], field: ['#e9edf2', '#d6dde7'], paper: '#ffffff' },
};

export const SCENES = [
  ['auto', 'אוטומטי לפי ערכת העיצוב'],
  ['jerusalem', 'ירושלים העתיקה בשקיעה'],
  ['kotel', 'אבני הכותל'],
  ['heichal', 'היכל – עמודים ופרוכת'],
  ['papercut', 'חיתוך נייר בסגנון כתובה'],
  ['none', 'בלי רקע מצויר'],
];

export function sceneFor(display) {
  const s = display.scene || 'auto';
  if (s !== 'auto') return s;
  return { classic: 'jerusalem', chassidic: 'heichal', ashkenaz: 'papercut', modern: 'none' }[display.theme || 'classic'] || 'jerusalem';
}

const cache = new Map();
/** מחזיר כתובת תמונה (data URL) של הרקע, או null */
export function sceneImage(scene, theme) {
  if (!scene || scene === 'none') return null;
  const key = scene + ':' + theme;
  if (cache.has(key)) return cache.get(key);
  const [c, g] = canvas();
  const rand = rng(scene.length * 7919 + 17);
  const pal = PALETTES[theme] || PALETTES.classic;
  try {
    ({ kotel, jerusalem, heichal, papercut }[scene] || jerusalem)(g, rand, pal);
  } catch (e) { console.warn('scene failed', e); return null; }
  const url = c.toDataURL('image/jpeg', 0.86);
  cache.clear(); cache.set(key, url);
  return url;
}

/** איור ברכה לפי התקופה. kind: shabbat | chanuka | sukkot | yamim-noraim | purim | pesach | shavuot | torah */
export function greetingArt(kind, opts = {}) {
  const key = kind + ':' + (opts.lit || 0);
  if (cache.has(key)) return cache.get(key);
  const [c, g] = canvas(1100, 760);
  const rand = rng(kind.length * 131 + 3);
  const x = 550, y = 680;
  switch (kind) {
    case 'shabbat': candlestick(g, 230, y, 1.15); candlestick(g, 870, y, 1.15); challah(g, x, y - 40, 0.95); kiddush(g, x, y - 170, 0.75); break;
    case 'chanuka': chanukiah(g, x, y, 1.05, opts.lit || 1); break;
    case 'sukkot': lulavEtrog(g, x - 120, y, 1); break;
    case 'yamim-noraim': shofarApples(g, x, y - 150, 1.08); break;
    case 'purim': purimMasks(g, x, y - 80, 1.1, rand); break;
    case 'pesach': seder(g, x - 60, y - 220, 1); break;
    case 'shavuot': case 'omer': wheat(g, x, y, 1, rand); break;
    default: torahScroll(g, x, y - 140, 1);
  }
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
