// הגדרות התקנה – זה הקובץ היחיד שצריך לערוך לפני העלאה לאוויר.
// בלי פרטי Supabase הלוח עובד במצב מקומי (שמירה בדפדפן) עם נתוני הדגמה.
window.SHUL_CONFIG = {
  // מתוך Supabase: Project Settings → API
  supabaseUrl: 'https://wngiebxazdwjcgqmooqx.supabase.co',
  // המפתח הציבורי (anon) – מותר בקוד. לעולם לא את service_role!
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZ2llYnhhemR3amNncW1vb3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MTI2NDAsImV4cCI6MjEwOTM4ODY0MH0.DaKRGvwQUoMdN2AXghzhgtm0G0XPveCSahCF4zcv2-o',

  // מזהה בית הכנסת (slug). אפשר להחזיק כמה בתי כנסת באותו פרויקט.
  boardId: 'hamishmeret',
};
