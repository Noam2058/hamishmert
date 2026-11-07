// נתוני ברירת מחדל והדגמה. כל מה שמסומן "לדוגמה" מוחלף בנתוני בית הכנסת שלך מממשק הגבאי.
export const SCREEN_TYPES = [
  ['greeting', 'ברכה ואיור (שבת, חגים, ר"ח)'],
  ['combined', 'מסך משולב'],
  ['prayers', 'זמני תפילות'],
  ['zmanim', 'זמני היום'],
  ['shabbat', 'שבת / חג'],
  ['announcements', 'הודעות'],
  ['memorials', 'אזכרות'],
  ['parnas', 'פרנס'],
  ['netz', 'שעון נץ (בבוקר)'],
  ['omer', 'ספירת העומר (בעונה)'],
  ['halacha', 'הלכה יומית'],
  ['learning', 'לימוד יומי'],
  ['birthdays', 'ימי הולדת'],
  ['hilula', 'הילולא דצדיקיא'],
  ['images', 'תמונות שהעליתי'],
];
export const SCREEN_LABEL = Object.fromEntries(SCREEN_TYPES);

export const THEMES = [
  ['classic', 'קלאסי – כחול וזהב'],
  ['chassidic', 'חסידי – בורדו וזהב'],
  ['ashkenaz', 'אשכנזי – ירוק עמוק ופליז'],
  ['modern', 'מודרני – בהיר ונקי'],
];

let n = 0;
const id = () => `d${++n}`;

export function demoData() {
  return {
    version: 1,
    synagogue: {
      name: 'בית הכנסת "המשמרת הצעירה"',
      dedication: '',
      city: 'חיפה',
      lat: 32.794, lon: 34.989, elevation: 0, useElevation: false,
      tz: 'Asia/Jerusalem', il: true,
      nusach: 'sefard', // sefard | ashkenaz | edot | chabad
      candleMins: 30,
      havdalahDeg: 8.5, havdalahMins: 0,
      zmanimShown: ['alot', 'misheyakir', 'sunrise', 'shmaMGA', 'shmaGRA', 'tfillaGRA', 'chatzot', 'minchaGedola', 'plag', 'sunset', 'tzeit'],
      learning: { dafYomi: true, mishnaYomi: true, nachYomi: false, rambam1: false, chofetzChaim: false, psalms: false },
    },
    display: {
      theme: 'classic',
      bgImage: '',
      scene: 'auto',
      holidayDesign: true,
      performance: 'auto',
      defaultSeconds: 14,
      screens: [
        { type: 'greeting', enabled: true, seconds: 12 },
        { type: 'combined', enabled: true, seconds: 20 },
        { type: 'shabbat', enabled: true, seconds: 14 },
        { type: 'announcements', enabled: true, seconds: 10 },
        { type: 'zmanim', enabled: true, seconds: 14 },
        { type: 'memorials', enabled: true, seconds: 14 },
        { type: 'prayers', enabled: true, seconds: 14 },
        { type: 'parnas', enabled: true, seconds: 10 },
        { type: 'netz', enabled: true, seconds: 14 },
        { type: 'omer', enabled: true, seconds: 12 },
        { type: 'learning', enabled: true, seconds: 10 },
        { type: 'halacha', enabled: true, seconds: 14 },
        { type: 'birthdays', enabled: true, seconds: 10 },
        { type: 'hilula', enabled: true, seconds: 10 },
        { type: 'images', enabled: true, seconds: 12 },
      ],
      ticker: true,
      netzWindowMin: 60,
      offHours: { enabled: false, from: '23:30', to: '05:00' },
    },
    prayers: [
      // ותיקין: נגזרת מהנץ (ההפרש לבדיקה מול הגבאי)
      { id: id(), name: 'שחרית ותיקין', schedule: 'weekday', time: { type: 'zman', zman: 'sunrise', offset: -25, round: 0, dir: 'down' } },
      { id: id(), name: 'שחרית ותיקין', schedule: 'friday', time: { type: 'zman', zman: 'sunrise', offset: -25, round: 0, dir: 'down' } },
      { id: id(), name: 'מנחה וקבלת שבת', schedule: 'friday', time: { type: 'zman', zman: 'candles', offset: 15, round: 0 }, note: 'רבע שעה אחרי כניסת השבת' },
      { id: id(), name: 'שחרית ותיקין', schedule: 'shabbat', time: { type: 'zman', zman: 'sunrise', offset: -25, round: 0, dir: 'down' } },
      { id: id(), name: 'שחרית', schedule: 'shabbat', time: { type: 'fixed', value: '08:00' } },
      { id: id(), name: 'מנחה', schedule: 'shabbat', time: { type: 'zman', zman: 'candles', offset: 0, round: 0 }, note: 'בשעת כניסת השבת' },
      { id: id(), name: 'ערבית מוצאי שבת', schedule: 'shabbat', time: { type: 'zman', zman: 'havdalah', offset: 0, round: 0 }, note: 'בצאת השבת' },
    ],
    lessons: [],
    announcements: [],
    memorials: [],
    parnasim: [],
    birthdays: [],
    slides: [],
    hilulot: [
      { id: id(), name: 'רבי שמעון בר יוחאי', hebDay: 18, hebMonth: 'Iyyar' },
      { id: id(), name: 'הרמב"ם', hebDay: 20, hebMonth: 'Tevet' },
      { id: id(), name: 'הבבא סאלי', hebDay: 4, hebMonth: 'Sh\'vat' },
      { id: id(), name: 'רבי מאיר בעל הנס', hebDay: 14, hebMonth: 'Iyyar' },
      { id: id(), name: 'החפץ חיים', hebDay: 24, hebMonth: 'Elul' },
      { id: id(), name: 'רחל אמנו', hebDay: 11, hebMonth: 'Cheshvan' },
      { id: id(), name: 'האר"י הקדוש', hebDay: 5, hebMonth: 'Av' },
      { id: id(), name: 'הרב עובדיה יוסף', hebDay: 3, hebMonth: 'Cheshvan' },
    ],
    halachaSource: 'sa',
    halachot: [
      { id: id(), title: 'ברכת השחר', text: 'מי שהתעורר בלילה וחזר לישון, לא יברך ברכות השחר עד שיתעורר בבוקר. מי שניעור כל הלילה – יש לו לשמוע את הברכות ממי שישן.', source: 'לדוגמה – יש להחליף בהלכות של רב הקהילה' },
      { id: id(), title: 'שיחה בבית הכנסת', text: 'יש להיזהר מאוד שלא לדבר בבית הכנסת בשעת התפילה וקריאת התורה. כבוד בית הכנסת הוא כבוד שמיים.', source: 'לדוגמה – יש להחליף בהלכות של רב הקהילה' },
      { id: id(), title: 'הכנה לשבת', text: 'מצוה על כל אדם להכין בעצמו דבר מה לכבוד שבת, אף אם יש לו משרתים רבים.', source: 'לדוגמה – יש להחליף בהלכות של רב הקהילה' },
    ],
  };
}

/** משלים שדות חסרים בנתונים קיימים (אחרי עדכון גרסה) */
export function normalize(data) {
  const d = demoData();
  const out = { ...d, ...(data || {}) };
  out.synagogue = { ...d.synagogue, ...(data?.synagogue || {}) };
  out.synagogue.learning = { ...d.synagogue.learning, ...(data?.synagogue?.learning || {}) };
  out.display = { ...d.display, ...(data?.display || {}) };
  out.display.offHours = { ...d.display.offHours, ...(data?.display?.offHours || {}) };
  const have = new Set((out.display.screens || []).map((s) => s.type));
  d.display.screens.forEach((s, i) => { if (!have.has(s.type)) out.display.screens.splice(s.type === 'greeting' ? 0 : Math.min(i, out.display.screens.length), 0, { ...s }); });
  for (const k of ['prayers', 'lessons', 'announcements', 'memorials', 'parnasim', 'birthdays', 'hilulot', 'halachot', 'slides']) {
    if (!Array.isArray(out[k])) out[k] = [];
  }
  return out;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
