-- לוח דיגיטלי לבית הכנסת – סכמת Supabase
-- להריץ פעם אחת: Supabase → SQL Editor → New query → הדבקה → Run

create table if not exists public.boards (
  id          text primary key,                 -- מזהה בית הכנסת (boardId ב-config.js)
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  editors     uuid[] not null default '{}',     -- גבאים נוספים עם הרשאת עריכה
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists boards_touch on public.boards;
create trigger boards_touch before update on public.boards
for each row execute function public.touch_updated_at();

alter table public.boards enable row level security;

-- הלוח עצמו והדף לנייד קוראים בלי התחברות
drop policy if exists "boards are readable" on public.boards;
create policy "boards are readable" on public.boards for select using (true);

-- רק משתמש מחובר יוצר לוח, והוא נרשם כבעלים
drop policy if exists "owner creates board" on public.boards;
create policy "owner creates board" on public.boards for insert
  with check (auth.uid() = owner);

-- עריכה: הבעלים או גבאי מהרשימה
drop policy if exists "owner or editors update" on public.boards;
create policy "owner or editors update" on public.boards for update
  using (auth.uid() = owner or auth.uid() = any(editors))
  with check (auth.uid() = owner or auth.uid() = any(editors));

drop policy if exists "owner deletes" on public.boards;
create policy "owner deletes" on public.boards for delete using (auth.uid() = owner);

-- עדכון חי ללוח ברגע שהגבאי שומר
do $$ begin
  alter publication supabase_realtime add table public.boards;
exception when duplicate_object then null; end $$;

-- הוספת גבאי נוסף (להריץ ידנית, אחרי שהוא נרשם דרך ממשק הגבאי):
-- update public.boards
--   set editors = array_append(editors, (select id from auth.users where email = 'gabai2@example.com'))
--   where id = 'my-shul';
