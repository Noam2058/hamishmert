// הגדרות התקנה – זה הקובץ היחיד שצריך לערוך לפני העלאה לאוויר.
// בלי פרטי Supabase הלוח עובד במצב מקומי (שמירה בדפדפן) עם נתוני הדגמה.
window.SHUL_CONFIG = {
  // מתוך Supabase: Project Settings → API
  supabaseUrl: '',      // לדוגמה: 'https://abcdefgh.supabase.co'
  supabaseAnonKey: '',  // המפתח הציבורי (anon public)

  // מזהה בית הכנסת (slug). אפשר להחזיק כמה בתי כנסת באותו פרויקט.
  boardId: 'hamishmeret',
};
