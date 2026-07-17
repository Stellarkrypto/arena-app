-- Run this once in Supabase's SQL Editor, after migration_002.
-- Fixes a real security gap: room_id/room_pass were being sent to the
-- browser on page load and merely hidden by the UI, meaning a technically
-- savvy player could read them early via devtools. This view nulls those
-- two columns out at the DATABASE level until the reveal time is actually
-- reached, so the browser never receives the real values early at all.

create or replace view public.matches_public as
select
  m.id, m.mode, m.name, m.win_prize, m.per_kill, m.entry_fee, m.max_players,
  m.start_time, m.squad, m.map, m.perspective, m.completed, m.created_at,
  m.room_reveal_time,
  case when
    exists (select 1 from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid())
    and (
      (m.room_reveal_time is not null and now() >= m.room_reveal_time)
      or (m.room_reveal_time is null and m.start_time is not null and now() >= m.start_time - interval '15 minutes')
    )
  then m.room_id else null end as room_id,
  case when
    exists (select 1 from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid())
    and (
      (m.room_reveal_time is not null and now() >= m.room_reveal_time)
      or (m.room_reveal_time is null and m.start_time is not null and now() >= m.start_time - interval '15 minutes')
    )
  then m.room_pass else null end as room_pass
from public.matches m;

grant select on public.matches_public to anon, authenticated;
