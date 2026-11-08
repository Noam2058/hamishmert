// טעינת לוחות חיים בדפי התצוגה המקדימה (חגים / ערכות צבעים) בלי להעמיס על הטלפון:
// רק הלוחות שנראים כרגע נטענים (בטלפון – אחד בלבד), במצב חסכוני, והשאר נפרקים.
const touch = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
const MAX = touch ? 1 : 3;
const live = new Map(); // box -> iframe
const ratios = new Map();

function mount(box) {
  if (live.has(box)) return;
  const f = document.createElement('iframe');
  const src = box.dataset.src + (box.dataset.src.includes('?') ? '&' : '?') + 'lite';
  f.src = src; f.title = 'תצוגה מקדימה'; f.loading = 'lazy';
  if (touch) f.style.pointerEvents = 'none'; // בטלפון הגלילה לא "נתקעת" בתוך הלוח
  box.appendChild(f);
  const fit = () => { f.style.transform = `scale(${box.clientWidth / 1920})`; };
  fit(); const ro = new ResizeObserver(fit); ro.observe(box); f._ro = ro;
  f.onload = () => box.querySelector('.load')?.remove();
  live.set(box, f);
}
function unmount(box) {
  const f = live.get(box);
  if (!f) return;
  f._ro?.disconnect(); f.src = 'about:blank'; f.remove();
  live.delete(box);
  if (!box.querySelector('.load')) box.insertAdjacentHTML('afterbegin', `<div class="load">${touch ? 'גלול לכאן כדי לראות' : 'טוען…'}</div>`);
}
function update() {
  // הלוחות הכי נראים – עד MAX
  const want = [...ratios].filter(([, r]) => r > 0.35).sort((a, b) => b[1] - a[1]).slice(0, MAX).map(([b]) => b);
  for (const b of [...live.keys()]) if (!want.includes(b)) unmount(b);
  clearTimeout(update.t);
  update.t = setTimeout(() => want.forEach(mount), touch ? 450 : 150); // מחכים שהגלילה תיעצר
}
export function mountFrames(boxes) {
  const io = new IntersectionObserver((ents) => { ents.forEach((e) => ratios.set(e.target, e.intersectionRatio)); update(); }, { threshold: [0, 0.35, 0.6, 0.9] });
  boxes.forEach((b) => {
    io.observe(b);
    if (touch) { // בטלפון: נגיעה בלוח פותחת אותו בגדול
      b.style.cursor = 'pointer';
      b.addEventListener('click', () => { location.href = b.dataset.src; });
    }
  });
}
