// שכבת נתונים: Supabase כשמוגדר, אחרת שמירה מקומית בדפדפן.
import { loadSupabase } from './lib.js';
import { demoData, normalize } from './defaults.js';

const cfg = window.SHUL_CONFIG || {};
const qs = new URLSearchParams(location.search);
const demo = qs.has('demo'); // ?demo – הדגמה מקומית בלי ענן (לבדיקות), לא נוגע בנתונים האמיתיים
const boardId = qs.get('board') || cfg.boardId || 'my-shul';
const CACHE_KEY = demo ? 'shulboard:demo' : `shulboard:data:${boardId}`;

export const mode = !demo && cfg.supabaseUrl && cfg.supabaseAnonKey ? 'supabase' : 'local';
export { boardId };

let client = null;
async function sb() {
  if (client) return client;
  const createClient = await loadSupabase();
  client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true } });
  return client;
}

function readCache() {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* מלא או חסום */ }
}

/** טעינה: מהשרת, ואם אין חיבור – מהעותק השמור */
export async function load() {
  if (mode === 'local') {
    const d = readCache();
    if (d) return { data: normalize(d), source: 'local' };
    const demo = demoData();
    writeCache(demo);
    return { data: normalize(demo), source: 'demo' };
  }
  try {
    const c = await sb();
    const { data, error } = await c.from('boards').select('data, updated_at').eq('id', boardId).maybeSingle();
    if (error) throw error;
    if (!data) return { data: normalize(readCache() || demoData()), source: 'missing' };
    writeCache(data.data);
    return { data: normalize(data.data), source: 'server', updatedAt: data.updated_at };
  } catch (e) {
    const cached = readCache();
    if (cached) return { data: normalize(cached), source: 'cache', error: e };
    return { data: normalize(demoData()), source: 'demo', error: e };
  }
}

export async function save(data) {
  writeCache(data);
  if (mode === 'local') {
    window.dispatchEvent(new CustomEvent('shulboard:saved'));
    return { ok: true };
  }
  const c = await sb();
  const { data: user } = await c.auth.getUser();
  if (!user?.user) throw new Error('צריך להתחבר כדי לשמור');
  const { data: existing } = await c.from('boards').select('id').eq('id', boardId).maybeSingle();
  const q = existing
    ? c.from('boards').update({ data }).eq('id', boardId)
    : c.from('boards').insert({ id: boardId, data });
  const { error } = await q;
  if (error) throw new Error(error.message.includes('row-level security') ? 'אין לך הרשאת עריכה ללוח הזה' : error.message);
  return { ok: true };
}

/** האזנה לשינויים: Realtime של Supabase, אירוע storage במצב מקומי, ובדיקה תקופתית כגיבוי */
export function subscribe(onChange) {
  const refresh = async () => { const r = await load(); onChange(r.data, r); };
  window.addEventListener('storage', (e) => { if (e.key === CACHE_KEY) refresh(); });
  window.addEventListener('shulboard:saved', refresh);
  setInterval(refresh, 5 * 60 * 1000);
  window.addEventListener('online', refresh);
  if (mode === 'supabase') {
    sb().then((c) => {
      c.channel(`board-${boardId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` }, (p) => {
          if (p.new?.data) { writeCache(p.new.data); onChange(normalize(p.new.data), { source: 'realtime' }); }
        })
        .subscribe();
    }).catch(() => { /* נמשיך עם בדיקה תקופתית */ });
  }
}

// ---------- התחברות (ממשק גבאי) ----------

export async function currentUser() {
  if (mode === 'local') return { email: 'מצב מקומי' };
  const c = await sb();
  const { data } = await c.auth.getUser();
  return data?.user || null;
}
export async function signIn(email, password) {
  const c = await sb();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : error.message);
}
export async function signUp(email, password) {
  const c = await sb();
  const { error } = await c.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}
export async function signOut() {
  if (mode === 'local') return;
  const c = await sb();
  await c.auth.signOut();
}

export function exportJson(data) {
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}
