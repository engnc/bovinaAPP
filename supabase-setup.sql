-- ============================================
-- İŞ DEFTERİ — Supabase kurulum betiği
-- Supabase projende SQL Editor'e yapıştırıp çalıştır.
-- ============================================

-- 1) TABLOLAR ------------------------------------------------

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date not null default current_date,
  person text not null,
  description text,
  amount numeric not null
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date not null default current_date,
  source text,
  product_name text not null,
  price numeric,
  notes text,
  photo_url text
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  content text not null,
  photo_url text
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  content text not null,
  done boolean not null default false,
  done_at timestamptz,
  photo_url text
);

-- 2) RLS (Row Level Security) --------------------------------
-- Uygulamada giriş sistemi yok; anon key ile herkes okuyup yazabilir.
-- Bu, tedarikçi takip uygulamandaki ile aynı açık-erişim modelidir.
-- Repo'yu PUBLIC yapmayacaksan (veya anon key'i paylaşmayacaksan) bu yeterlidir.

alter table expenses enable row level security;
alter table quotes   enable row level security;
alter table notes    enable row level security;
alter table todos    enable row level security;

create policy "expenses_all" on expenses for all using (true) with check (true);
create policy "quotes_all"   on quotes   for all using (true) with check (true);
create policy "notes_all"    on notes    for all using (true) with check (true);
create policy "todos_all"    on todos    for all using (true) with check (true);

-- 3) REALTIME ---------------------------------------------------
-- Supabase Dashboard > Database > Replication kısmından da açabilirsin,
-- ya da doğrudan burada:

alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table quotes;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table todos;

-- 4) STORAGE (fotoğraflar) ---------------------------------------
-- "photos" adında PUBLIC bir bucket oluştur:
-- Dashboard > Storage > New bucket > name: photos > Public bucket: AÇIK
-- Sonra aşağıdaki politikaları çalıştır (anon ile yükleme/okuma için):

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_public_read" on storage.objects
  for select using (bucket_id = 'photos');

create policy "photos_public_insert" on storage.objects
  for insert with check (bucket_id = 'photos');

create policy "photos_public_delete" on storage.objects
  for delete using (bucket_id = 'photos');
