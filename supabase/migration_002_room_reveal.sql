-- Run this once in Supabase's SQL Editor.
-- Adds an admin-controlled exact reveal time for room ID/password,
-- instead of the hardcoded "15 minutes before start" rule.

alter table public.matches add column if not exists room_reveal_time timestamptz;
