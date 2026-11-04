// ספריות חיצוניות – גרסאות נעולות. ה-Service Worker שומר אותן לעבודה בלי אינטרנט.
export * from 'https://cdn.jsdelivr.net/npm/@hebcal/core@5.10.1/+esm';
export { getLeyningOnDate } from 'https://cdn.jsdelivr.net/npm/@hebcal/leyning@8.2.9/+esm';
// רישום מקורות הלימוד היומי (דף יומי, משנה יומית וכו') בתוך DailyLearning
import 'https://cdn.jsdelivr.net/npm/@hebcal/learning@5.1.2/+esm';

export async function loadSupabase() {
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  return mod.createClient;
}
