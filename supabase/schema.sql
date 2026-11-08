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
create policy "owner deletes" on public.boards for delete using (auth.uid() = owner or auth.uid() = any(editors));

-- עדכון חי ללוח ברגע שהגבאי שומר
do $$ begin
  alter publication supabase_realtime add table public.boards;
exception when duplicate_object then null; end $$;

-- הוספת גבאי נוסף (להריץ ידנית, אחרי שהוא נרשם דרך ממשק הגבאי):
-- update public.boards
--   set editors = array_append(editors, (select id from auth.users where email = 'gabai2@example.com'))
--   where id = 'my-shul';

-- ---------- אחסון תמונות לשקופיות (תיקייה לכל לוח: media/<board-id>/...) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media editors upload" on storage.objects;
create policy "media editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and exists (select 1 from public.boards b where b.id = (storage.foldername(name))[1] and (b.owner = auth.uid() or auth.uid() = any(b.editors))));
drop policy if exists "media editors delete" on storage.objects;
create policy "media editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and exists (select 1 from public.boards b where b.id = (storage.foldername(name))[1] and (b.owner = auth.uid() or auth.uid() = any(b.editors))));
