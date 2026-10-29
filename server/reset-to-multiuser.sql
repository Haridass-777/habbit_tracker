-- ONLY for upgrading an existing single-user database.
-- 1. In the old app: Settings -> Export JSON backup.
-- 2. Run this file in the Supabase SQL editor (it deletes the old tables and data).
-- 3. Run server/schema.sql.
-- 4. Sign in with Google in the new app, then Settings -> Import JSON backup.
drop table if exists public.habit_logs  cascade;
drop table if exists public.daily_notes cascade;
drop table if exists public.habits      cascade;
drop table if exists public.settings    cascade;
