# Arena — Free Fire tournament + wallet app

A real, deployable web app: React + Vite frontend, Supabase (Postgres) backend.
This replaces the earlier chat prototypes — it has real login, a real database,
and real (though manually-verified) payments.

## What's included
- Player app: browse matches by mode, join, live countdown, room ID reveal,
  wallet with deposit/withdraw requests, transaction history, edit profile.
- Admin app (at `/admin`): create/manage matches, finalize results (auto-credits
  winnings), approve/reject deposits and withdrawals, edit payment instructions,
  manage home-page banners.
- Real auth (email/password via Supabase Auth) — every player has their own
  account and their own private wallet.
- A proper ledger-based wallet: balance is never stored as a single mutable
  number, it's the sum of an append-only transaction log. This is what makes
  it safe against race conditions and easy to audit.

## What's NOT included yet (on purpose — you said this comes later)
- A real payment gateway (bKash/Nagad merchant API). Right now deposits and
  withdrawals are a manual request/approve flow: player submits a transaction
  ID, admin verifies it themselves and approves in the admin panel. This is a
  completely normal way to launch before you have a merchant account.
- A custom domain — deploy to a free `*.vercel.app` URL first, point your own
  domain at it later (just a DNS change, doesn't require touching the code).

## 1. Set up Supabase

1. Go to supabase.com, create a free project.
2. In the Supabase dashboard, open the **SQL Editor** and paste the entire
   contents of `supabase/schema.sql`, then run it. This creates every table,
   the wallet ledger, all the RPC functions, and Row Level Security policies.
3. Go to **Project Settings → API** and copy your **Project URL** and
   **anon public key**.
4. Copy `.env.example` to `.env` in this project and fill in those two values.

## 2. Run it locally

```bash
npm install
npm run dev
```

Open the URL it prints. Sign up for an account — this creates your first
player profile automatically (via a database trigger).

## 3. Make yourself an admin

Sign up once through the app, then in the Supabase SQL Editor run:

```sql
update public.profiles set is_admin = true where id =
  (select id from auth.users where email = 'you@example.com');
```

Now visiting `/admin` in the app will show the admin panel instead of the
"admin access only" message.

## 4. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import that repo. Vercel auto-detects Vite.
3. Add the same two environment variables from your `.env` file in Vercel's
   project settings (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. You'll get a `your-project.vercel.app` URL — that's your live site.
5. When you're ready for a real domain, add it under Vercel's Domains tab and
   update your DNS as instructed. No code changes needed.

## Notes on the payment flow, since it's manual for now

- Deposit: player sends money to your bKash/Nagad number (set in
  Admin → Payment), then submits the transaction ID in the app. You verify it
  landed in your account and hit Approve — their balance updates instantly.
- Withdrawal: the amount is reserved from their balance the moment they
  request it (so they can't request more than they have, and can't double
  spend while waiting). You send the money manually, then mark it sent. If you
  reject it, the reserved amount is refunded automatically.
- Everything here is designed so that when you do get a real bKash/Nagad
  merchant API later, you swap the manual approve/reject buttons for an
  automatic webhook call to the same `approve_deposit` /
  `approve_withdrawal` database functions — the rest of the app doesn't change.

## Project structure

```
src/
  supabaseClient.js     – Supabase connection
  AuthContext.jsx        – session, profile, wallet balance
  theme.jsx              – shared colors/spacing/small components
  App.jsx                 – router
  components/
    Layout.jsx            – header + bottom nav
    MatchCard.jsx
  pages/
    Auth.jsx               – login/signup
    Home.jsx                – mode grid + banners
    MyMatches.jsx
    Result.jsx
    Profile.jsx             – wallet, deposit/withdraw, history
    MatchDetail.jsx          – countdown, room details, prize pool
    Admin.jsx                 – full admin panel (matches/results/deposits/withdrawals/payment/banners)
supabase/
  schema.sql              – run this once in the Supabase SQL Editor
```
