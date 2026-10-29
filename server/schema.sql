-- Multi-user schema. Run once in Supabase Dashboard -> SQL Editor -> New query.
-- Upgrading from the single-user version? Run server/reset-to-multiuser.sql FIRST
-- (after exporting a JSON backup from the old app), then run this file.

create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  description text,
  category    text,
  icon        text,
  start_date  date not null default current_date,
  archived_on date,                       -- habit is tracked on dates before archived_on
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

-- No two ACTIVE habits of the same user may share a name (case-insensitive).
create unique index if not exists habits_active_name_unique
  on public.habits (user_id, lower(btrim(name))) where archived_on is null;

create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  habit_id   uuid not null references public.habits(id) on delete cascade,
  log_date   date not null,
  completed  boolean not null default false,
  note       text,
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

create table if not exists public.daily_notes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  note_date  date not null,
  note       text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, note_date)
);

create table if not exists public.settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  theme            text    not null default 'system' check (theme in ('light','dark','system')),
  streak_threshold integer not null default 80 check (streak_threshold between 1 and 100),
  default_range    integer not null default 14 check (default_range in (7,14,30,60,90)),
  confirm_archive  boolean not null default true
);

-- Only the backend (service role key) reads or writes these tables.
-- The server checks the signed-in user's token and filters every query by user_id.
alter table public.habits      enable row level security;
alter table public.habit_logs  enable row level security;
alter table public.daily_notes enable row level security;
alter table public.settings    enable row level security;
