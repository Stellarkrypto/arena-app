-- ARENA schema for Supabase (Postgres)
-- Run this in the Supabase SQL Editor once, on a fresh project.

-- ============================================================
-- 1. PROFILES  (one row per auth user, created automatically)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Player',
  ff_uid text,
  phone text,
  is_admin boolean not null default false,
  daily_limit numeric not null default 500,
  daily_spent numeric not null default 0,
  spend_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Player'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. WALLET LEDGER  (append-only — balance = sum of amounts)
--    Never UPDATE or DELETE rows here. Every balance change is
--    a new row. This is what makes the money math auditable.
-- ============================================================
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('entry_fee','winnings','deposit','withdrawal_pending','withdrawal_rejected','adjustment')),
  amount numeric not null, -- positive = credit, negative = debit
  note text,
  created_at timestamptz not null default now()
);

create index on public.wallet_transactions (user_id);

-- Convenience view: current balance per user
create view public.wallet_balances as
  select user_id, coalesce(sum(amount), 0) as balance
  from public.wallet_transactions
  group by user_id;

-- ============================================================
-- 3. MATCHES
-- ============================================================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('br','clash','lonewolf','cs1v1')),
  name text not null,
  win_prize numeric not null default 0,
  per_kill numeric not null default 0,
  entry_fee numeric not null default 0,
  max_players int not null default 48,
  start_time timestamptz,
  squad text,
  map text,
  perspective text,
  room_id text,
  room_pass text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.match_results (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kills int not null default 0,
  winner boolean not null default false,
  prize numeric not null default 0,
  primary key (match_id, user_id)
);

-- ============================================================
-- 4. DEPOSITS / WITHDRAWALS  (manual payment flow for now)
-- ============================================================
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  trx_id text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  payout_number text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. BANNERS & PAYMENT SETTINGS
-- ============================================================
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_text text,
  link text,
  created_at timestamptz not null default now()
);

create table public.payment_settings (
  id int primary key default 1,
  method text not null default 'bKash',
  number text,
  instructions text,
  constraint single_row check (id = 1)
);
insert into public.payment_settings (id) values (1);

-- ============================================================
-- 6. RPC FUNCTIONS (all financial writes go through these —
--    never let the client write wallet_transactions directly)
-- ============================================================

-- Join a match: atomic balance/limit/spots check + ledger entry
create function public.join_match(p_match_id uuid)
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

-- Admin: finalize results for a match (bulk jsonb: [{user_id, kills, winner}])
create function public.finalize_match_results(p_match_id uuid, p_results jsonb)
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
    insert into public.match_results (match_id, user_id, kills, winner, prize)
      values (p_match_id, (r->>'user_id')::uuid, coalesce((r->>'kills')::int,0), coalesce((r->>'winner')::boolean,false), v_prize)
      on conflict (match_id, user_id) do update set kills = excluded.kills, winner = excluded.winner, prize = excluded.prize;
    if v_prize > 0 then
      insert into public.wallet_transactions (user_id, type, amount, note)
        values ((r->>'user_id')::uuid, 'winnings', v_prize, 'Match winnings · ' || v_match.name);
    end if;
  end loop;

  update public.matches set completed = true where id = p_match_id;
end;
$$ language plpgsql security definer;

-- Admin: approve a deposit
create function public.approve_deposit(p_deposit_id uuid)
returns void as $$
declare v_dep record;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin only';
  end if;
  select * into v_dep from public.deposits where id = p_deposit_id and status = 'pending' for update;
  if not found then raise exception 'Deposit not pending'; end if;

  update public.deposits set status = 'approved' where id = p_deposit_id;
  insert into public.wallet_transactions (user_id, type, amount, note)
    values (v_dep.user_id, 'deposit', v_dep.amount, 'Deposit approved · trx ' || v_dep.trx_id);
end;
$$ language plpgsql security definer;

create function public.reject_deposit(p_deposit_id uuid)
returns void as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin only';
  end if;
  update public.deposits set status = 'rejected' where id = p_deposit_id and status = 'pending';
end;
$$ language plpgsql security definer;

-- Request a withdrawal: reserve funds immediately
create function public.request_withdrawal(p_amount numeric, p_number text)
returns void as $$
declare v_user uuid := auth.uid();
declare v_balance numeric;
begin
  select coalesce(sum(amount),0) into v_balance from public.wallet_transactions where user_id = v_user;
  if v_balance < p_amount then raise exception 'Not enough balance'; end if;

  insert into public.withdrawals (user_id, amount, payout_number) values (v_user, p_amount, p_number);
  insert into public.wallet_transactions (user_id, type, amount, note)
    values (v_user, 'withdrawal_pending', -p_amount, 'Withdrawal requested to ' || p_number);
end;
$$ language plpgsql security definer;

-- Admin: approve withdrawal (funds already reserved — this just confirms it was sent)
create function public.approve_withdrawal(p_withdrawal_id uuid)
returns void as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin only';
  end if;
  update public.withdrawals set status = 'approved' where id = p_withdrawal_id and status = 'pending';
end;
$$ language plpgsql security definer;

-- Admin: reject withdrawal (refund the reserved amount)
create function public.reject_withdrawal(p_withdrawal_id uuid)
returns void as $$
declare v_w record;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin only';
  end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id and status = 'pending' for update;
  if not found then raise exception 'Withdrawal not pending'; end if;

  update public.withdrawals set status = 'rejected' where id = p_withdrawal_id;
  insert into public.wallet_transactions (user_id, type, amount, note)
    values (v_w.user_id, 'withdrawal_rejected', v_w.amount, 'Withdrawal rejected — refunded');
end;
$$ language plpgsql security definer;

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_results enable row level security;
alter table public.deposits enable row level security;
alter table public.withdrawals enable row level security;
alter table public.banners enable row level security;
alter table public.payment_settings enable row level security;

-- profiles: read your own + everyone can read names (needed for player lists); only admins update others
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- wallet_transactions: read only your own. All writes happen via the RPC functions above (security definer),
-- so no insert/update policy is needed for normal users.
create policy "wallet_select_own" on public.wallet_transactions for select using (auth.uid() = user_id);
create policy "wallet_admin_select_all" on public.wallet_transactions for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- matches: public read; admin write
create policy "matches_select_all" on public.matches for select using (true);
create policy "matches_admin_write" on public.matches for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
create policy "matches_admin_update" on public.matches for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
create policy "matches_admin_delete" on public.matches for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

create policy "match_players_select_all" on public.match_players for select using (true);
create policy "match_players_admin_select" on public.match_results for select using (true);

-- deposits: player can insert/read their own; admin can read/update all
create policy "deposits_insert_own" on public.deposits for insert with check (auth.uid() = user_id);
create policy "deposits_select_own" on public.deposits for select using (
  auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
create policy "deposits_admin_update" on public.deposits for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- withdrawals: same pattern
create policy "withdrawals_select_own" on public.withdrawals for select using (
  auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
create policy "withdrawals_admin_update" on public.withdrawals for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- banners: public read, admin write
create policy "banners_select_all" on public.banners for select using (true);
create policy "banners_admin_write" on public.banners for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
create policy "banners_admin_delete" on public.banners for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- payment_settings: public read, admin write
create policy "payment_settings_select_all" on public.payment_settings for select using (true);
create policy "payment_settings_admin_update" on public.payment_settings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- ============================================================
-- 8. Make yourself an admin after signing up once, e.g.:
--   update public.profiles set is_admin = true where id = '<your-user-uuid>';
-- ============================================================
