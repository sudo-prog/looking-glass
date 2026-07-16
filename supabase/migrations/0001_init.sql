-- Looking Glass — LG-9 cloud sync schema
-- Apply in Supabase dashboard: SQL Editor (or via supabase CLI with DB password).
-- Safe to re-run: idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS).

create table if not exists public.canvases (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Canvas',
  viewport jsonb not null default '{"x":0,"y":0,"scale":1}'::jsonb,
  created_at bigint not null default (extract(epoch from now())*1000)::bigint,
  updated_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create index if not exists canvases_user_id_idx on public.canvases(user_id);

create table if not exists public.items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_id uuid not null references public.canvases(id) on delete cascade,
  type text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision,
  height double precision,
  rotation double precision default 0,
  z_index integer default 0,
  content jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  created_at bigint not null default (extract(epoch from now())*1000)::bigint,
  updated_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists items_canvas_id_idx on public.items(canvas_id);

alter table public.canvases enable row level security;
alter table public.items enable row level security;

drop policy if exists "canvases_owner" on public.canvases;
create policy "canvases_owner" on public.canvases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "items_owner" on public.items;
create policy "items_owner" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
