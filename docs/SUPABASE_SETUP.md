# Supabase Setup — Lead Pipeline (do this before anything works)

All of this happens in the Supabase dashboard for project
`lfvuehgzomqjptcondbq` → https://supabase.com/dashboard/project/lfvuehgzomqjptcondbq

Work top to bottom. Steps 1–4 are required for the basics (website → app).
Steps 5–7 power push notifications and stale-lead alerts and can be done later.

---

## 1. Create the tables (SQL Editor → New query → paste → Run)

```sql
-- Incoming website leads
create table lead_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  email text,
  service_address text,
  service_type text,
  volume_estimate text,
  preferred_date date,
  preferred_time text,
  notes text,
  photo_urls text[],
  status text not null default 'new',
  customer_id uuid,
  assigned_to text,
  price_range_sent boolean default false,
  contacted_at timestamptz
);

create index lead_requests_status_idx on lead_requests(status);
create index lead_requests_phone_idx on lead_requests(phone);
create index lead_requests_created_at_idx on lead_requests(created_at desc);

alter table lead_requests enable row level security;

-- Website can insert (anon key)
create policy "anon can insert leads"
  on lead_requests for insert
  to anon
  with check (true);

-- Only authenticated users (Porter + partner) can read and update
create policy "authenticated can read leads"
  on lead_requests for select
  to authenticated
  using (true);

create policy "authenticated can update leads"
  on lead_requests for update
  to authenticated
  using (true);

-- Devices registered for Web Push (used by the notify-lead Edge Function)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null,
  endpoint text not null unique,
  subscription jsonb not null
);

alter table push_subscriptions enable row level security;

create policy "users manage own push subs"
  on push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 2. Create the photo storage bucket

Storage → New bucket:
- Name: `lead-photos`
- **Public bucket: ON** (photos display in the app without signed URLs)

Then add an upload policy so the website (anon) can upload. SQL Editor:

```sql
create policy "anon can upload lead photos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'lead-photos');
```

## 3. Enable Realtime on lead_requests

Database → Replication → `supabase_realtime` publication → toggle ON for `lead_requests`.
(Or SQL: `alter publication supabase_realtime add table lead_requests;`)

## 4. That's it for the core flow

Submit the form on elitejunkut.com — the lead should appear in the app's
Leads tab within seconds (or within 60s via the polling fallback).
You must be **signed in** in the app (Settings → Cloud Sync) to see leads —
the table is read-protected.

---

## 5. Push notifications (app closed → phone still buzzes)

VAPID keys were already generated and the **public key is baked into the app**.
You only need to store the private key as an Edge Function secret.

- Public key (already in `src/lib/push.js`):
  `BOCWqJLbMUzh3nhPJxjd7czVHFXZUwOo0tTZSN3Yf0__YqGKmHnIqubmvvhnrg2DFc_sht6now6HzY-jf3usLJA`
- Private key (treat like a password, don't put it anywhere else):
  `8ieGRRPZO98zEK7DF9AXSsY9f4Xn5ubS4MnLtaDJL-c`

Deploy the Edge Function (one-time, from this repo, needs the Supabase CLI —
`brew install supabase/tap/supabase`):

```bash
supabase login
supabase link --project-ref lfvuehgzomqjptcondbq
supabase secrets set VAPID_PUBLIC_KEY="BOCWqJLbMUzh3nhPJxjd7czVHFXZUwOo0tTZSN3Yf0__YqGKmHnIqubmvvhnrg2DFc_sht6now6HzY-jf3usLJA"
supabase secrets set VAPID_PRIVATE_KEY="8ieGRRPZO98zEK7DF9AXSsY9f4Xn5ubS4MnLtaDJL-c"
supabase secrets set VAPID_SUBJECT="mailto:nyberg.porter@gmail.com"
supabase functions deploy notify-lead --no-verify-jwt
```

## 6. Wire the database webhook (new lead → push)

Database → Webhooks → Create a new hook:
- Name: `notify-lead`
- Table: `lead_requests`
- Events: **Insert** (also check **Update** if you want stale-lead re-alerts pushed)
- Type: Supabase Edge Function → `notify-lead`

## 7. Stale lead sweep (cron, every 4 hours)

SQL Editor (pg_cron is pre-installed on Supabase):

```sql
select cron.schedule(
  'stale-leads',
  '0 */4 * * *',
  $$
  update lead_requests
  set status = 'stale'
  where status = 'new'
  and created_at < now() - interval '4 hours'
  $$
);
```

If you get "schema cron does not exist": Database → Extensions → enable `pg_cron`, then re-run.

The app's Realtime subscription picks up the status flip and re-notifies you.
