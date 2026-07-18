-- Run this once in Supabase's SQL Editor, after migrations 002 and 003.
-- Reworks the match lifecycle:
--   - start_time is now AUTOMATIC: 30 minutes after creation, not admin-picked
--   - registration locks 3 minutes before start (server-enforced, not just UI)
--   - room code is visible to a joined player the instant admin sets it
--     (no time-gating needed anymore — simpler and matches the real design)
--   - results are now a two-step process: submit, then a separate approval
--     step that actually releases the money

-- 1. Auto-compute start_time 30 minutes after creation
alter table public.matches alter column start_time set default (now() + interval '30 minutes');

-- 2. Track whether a result row's prize has actually been paid out yet
alter table public.match_results add column if not exists credited boolean not null default false;

-- 3. Track when results were first submitted (draft stage, before approval)
alter table public.matches add column if not exists results_submitted_at timestamptz;

-- 4. Simplify room-code visibility: joined player + code is set = visible.
--    No time-gating needed now since the whole point is "as soon as the
--    admin enters it, registered players see it immediately."
--    (Dropped and recreated because Postgres won't let CREATE OR REPLACE
--    VIEW change or remove existing columns, only add new ones at the end.)
drop view if exists public.matches_public;

create view public.matches_public as
select
  m.id, m.mode, m.name, m.win_prize, m.per_kill, m.entry_fee, m.max_players,
  m.start_time, m.squad, m.map, m.perspective, m.completed, m.created_at,
  m.results_submitted_at,
  case when exists (
    select 1 from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid()
  ) then m.room_id else null end as room_id,
  case when exists (
    select 1 from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid()
  ) then m.room_pass else null end as room_pass
from public.matches m;

grant select on public.matches_public to anon, authenticated;

-- 5. Enforce the 3-minute registration cutoff on the SERVER, not just the UI
--    (a player editing their own browser can't bypass this).
create or replace function public.join_match(p_match_id uuid)
returns void as $$
declare
  v_user uuid := auth.uid();
  v_match record;
  v_balance numeric;
  v_daily record;
  v_player_count int;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;

  if v_match.start_time is not null and now() >= v_match.start_time - interval '3 minutes' then
    raise exception 'Registration closed — match is starting soon';
  end if;

  select count(*) into v_player_count from public.match_players where match_id = p_match_id;
  if v_player_count >= v_match.max_players then raise exception 'Match is full'; end if;

  if exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_user) then
    raise exception 'Already registered';
  end if;

  select coalesce(sum(amount),0) into v_balance from public.wallet_transactions where user_id = v_user;
  if v_balance < v_match.entry_fee then raise exception 'Not enough balance'; end if;

  select * into v_daily from public.profiles where id = v_user for update;
  if v_daily.spend_date <> current_date then
    update public.profiles set daily_spent = 0, spend_date = current_date where id = v_user;
    v_daily.daily_spent := 0;
  end if;
  if v_daily.daily_spent + v_match.entry_fee > v_daily.daily_limit then
    raise exception 'Daily limit reached';
  end if;

  insert into public.match_players (match_id, user_id) values (p_match_id, v_user);
  insert into public.wallet_transactions (user_id, type, amount, note)
    values (v_user, 'entry_fee', -v_match.entry_fee, 'Entry fee · ' || v_match.name);
  update public.profiles set daily_spent = daily_spent + v_match.entry_fee where id = v_user;
end;
$$ language plpgsql security definer;

-- 6. STEP ONE of results: admin enters kills/winner. Computes and stores the
--    prize per player, but does NOT touch anyone's wallet yet.
create or replace function public.submit_match_results(p_match_id uuid, p_results jsonb)
returns void as $$
declare
  v_match record;
  r jsonb;
  v_prize numeric;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin only';
  end if;
  select * into v_match from public.matches where id = p_match_id;
  if not found then raise exception 'Match not found'; end if;

  for r in select * from jsonb_array_elements(p_results) loop
    v_prize := (coalesce((r->>'kills')::int, 0) * v_match.per_kill)
             + (case when (r->>'winner')::boolean then v_match.win_prize else 0 end);
    insert into public.match_results (match_id, user_id, kills, winner, prize, credited)
      values (p_match_id, (r->>'user_id')::uuid, coalesce((r->>'kills')::int,0), coalesce((r->>'winner')::boolean,false), v_prize, false)
      on conflict (match_id, user_id) do update
        set kills = excluded.kills, winner = excluded.winner, prize = excluded.prize;
  end loop;

  update public.matches set results_submitted_at = now() where id = p_match_id;
end;
$$ language plpgsql security definer;

-- 7. STEP TWO: a separate, deliberate confirmation that actually pays out.
--    Safe to call more than once — only uncredited rows get paid.
create or replace function public.approve_match_results(p_match_id uuid)
returns void as $$
declare rec record;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin only';
  end if;

  for rec in
    select * from public.match_results
    where match_id = p_match_id and credited = false and prize > 0
  loop
    insert into public.wallet_transactions (user_id, type, amount, note)
      values (rec.user_id, 'winnings', rec.prize,
        'Match winnings · ' || (select name from public.matches where id = p_match_id));
    update public.match_results set credited = true where match_id = p_match_id and user_id = rec.user_id;
  end loop;

  update public.matches set completed = true where id = p_match_id;
end;
$$ language plpgsql security definer;
