# Team Workspace — Design Spec

**Date:** 2026-06-02
**App:** Elite Junk Solutions quoting PWA (React + Vite + Tailwind v3, Supabase sync)
**Status:** Approved (brainstorming) → ready for implementation plan

## Goal

Let the two business partners (Porter + partner) each sign in with **their own account** yet share **one workspace** of quotes/customers/settings/item-library, with **database-enforced** access control, an **invite-code** join flow, and **per-quote creator attribution**.

This replaces the current "one workspace row per user" sync model (which gives each login its own private data) with a shared, membership-gated workspace.

## Decisions (from brainstorming)

1. **Join mechanism:** short human-friendly **invite code** (e.g. `EJS-7K2P`).
2. **Attribution:** each quote stamped with its creator `{ id, name }`; shown as a small "by <name>" tag on the dashboard list and quote detail.
3. **Permissions:** all members have **full** read / edit / delete on all data (no roles).
4. **Migration:** creating the workspace **seeds it from the creator's current local data** (localStorage snapshot).
5. **Logins:** both **GitHub OAuth** and **email/password** supported; each member chooses.

## Data model (Supabase / Postgres)

### Tables

`public.workspaces`
- `id uuid primary key default gen_random_uuid()`
- `code text unique not null` — the invite code
- `data jsonb not null default '{}'::jsonb` — the whole app snapshot (settings, business, library, categories, quotes, customers, seq, deletedIds)
- `updated_at timestamptz not null default now()`
- `created_by uuid default auth.uid()`
- `created_at timestamptz not null default now()`

`public.workspace_members`
- `workspace_id uuid references public.workspaces(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `display_name text`
- `joined_at timestamptz not null default now()`
- `primary key (workspace_id, user_id)`

### Helper function

`public.is_member(ws uuid) returns boolean` — `security definer`, `stable`:
returns whether a membership row exists for `ws` and `auth.uid()`.

### RPC functions (security definer)

`public.create_workspace(seed jsonb, display_name text) returns public.workspaces`
- Generates a unique `code` (retry on collision).
- Inserts a workspace row with `data = seed`, `created_by = auth.uid()`.
- Inserts a `workspace_members` row for `auth.uid()` with `display_name`.
- Returns the new workspace row (id + code).

`public.join_workspace(invite_code text, display_name text) returns uuid`
- Looks up the workspace by `code` (case-insensitive, trimmed). If none → raise exception.
- Inserts `workspace_members` for `auth.uid()` (idempotent — on conflict do nothing / update display_name).
- Returns the workspace id.

(These are `security definer` so a joining user can resolve a code and insert their membership without RLS letting them read every workspace.)

### Row-Level Security

- `workspaces`: enable RLS.
  - `select using (public.is_member(id))`
  - `update using (public.is_member(id)) with check (public.is_member(id))`
  - No direct INSERT policy — creation only via `create_workspace`.
- `workspace_members`: enable RLS.
  - `select using (user_id = auth.uid() or public.is_member(workspace_id))`
  - `insert with check (user_id = auth.uid())` (also covered by functions)
  - `delete using (user_id = auth.uid())` (leave own membership)
- Realtime: `alter publication supabase_realtime add table public.workspaces;`

### Migration of the old schema

The previous design's `public.workspaces` table was keyed by `user_id` (one row per user). The new design reuses the name `workspaces` with a different shape, so the rollout SQL **drops the old table first**, then creates the new tables/functions/policies. This is safe because the old table held only a *sync copy*; the **source of truth is each device's localStorage**, which is untouched and seeds the new shared workspace on Create.

## Client architecture

### `src/hooks/useCloudSync.js` (reworked: user-keyed → workspace-keyed)

- Auth bootstrap unchanged (getSession + onAuthStateChange).
- On sign-in, resolve the active workspace:
  - Query `workspace_members` for `auth.uid()` → `activeWorkspaceId` (cache in `localStorage 'ejs.workspaceId'` for fast boot).
  - If **no membership** → `status: 'no-workspace'` (UI shows Create / Join).
  - If membership → pull `workspaces` row by `id`, merge into local, subscribe to realtime filtered by `id=eq.<id>`, push local changes (debounced) to that row.
- Reuse existing merge/echo-suppression/tombstone logic from `src/lib/sync.js`; only the row key changes (workspace `id` instead of `user_id`).
- New methods exposed: `createWorkspace(displayName)`, `joinWorkspace(code, displayName)`, `leaveWorkspace()`, `members` (list), `workspaceCode`.
- `createWorkspace` seeds via the current local snapshot (`buildSnapshot(slices)`).

### Attribution

- Quote model gains `createdBy: { id, name }`, set when a quote is **first created** (in `QuoteBuilder.buildQuote` / `store.saveQuote`), preserved on edits.
- The current member's `{ id, name }` comes from the sync layer (session user + membership display_name); exposed via `useApp().cloud.me`.
- Dashboard quote rows and `QuoteDetail` render a small "by <name>" tag when present.

### UI — `src/components/SyncPanel.jsx` states

1. **Signed out** → existing sign-in (GitHub + email/password).
2. **Signed in, no workspace** → two actions: **Create shared workspace** and **Join with a code** (with a display-name input).
3. **Signed in, in a workspace** → workspace card: members list, **Invite** (reveals/copies the code), **Sign out**, and a quiet **Leave workspace**.

## Data flow

- **Create:** local snapshot → `create_workspace(seed, name)` → workspace row created → client adopts workspace id → edits push to that row → realtime to partner.
- **Join:** `join_workspace(code, name)` → membership added → client pulls workspace data → unions into local → both converge.
- **Ongoing:** identical to current row-sync, but on the shared workspace id; newest-edit-wins per quote, deletions tombstoned.

## Rollout (one-time, ~2 min)

1. User downloads a **backup** first (existing Settings → Sync → Backup → Download) as a safety net.
2. Paste the **new setup SQL** into Supabase SQL Editor (drops old table, creates new schema + functions + RLS + realtime).
3. Redeploy the app to Netlify.
4. Porter signs in → **Create shared workspace** (seeds from local) → gets the invite code.
5. Partner installs, signs in with his own account → **Join with code**.

## Edge cases

- **Both create independently:** would yield two separate workspaces. Mitigation: the "no-workspace" UI presents **Join** prominently with guidance ("If your partner already made one, join with their code"); only one person should Create.
- **Joining while already a member elsewhere:** a user has at most one active workspace in practice; if multiple memberships exist, use the most recently joined. Joining switches the active workspace.
- **Code collisions:** `code` has a unique constraint; `create_workspace` retries on collision.
- **Offline:** app keeps working from localStorage; sync resumes on reconnect (unchanged).
- **Leave workspace:** removes the member's row; their local copy stays on-device.
- **Old per-user data:** dropped with the old table; not migrated server-side (local snapshot is the seed source).

## Security

- Access is **membership-enforced by RLS**; the public anon key cannot read or write a workspace the signed-in user isn't a member of.
- `create_workspace` / `join_workspace` are `security definer` so code-lookup and membership-insert work without exposing all workspaces to clients.

## Testing

- `npm run build` passes (zero errors).
- Manual, two accounts / two browser profiles:
  1. Account A: Create workspace → existing local quotes seed it → code shown.
  2. Account B: Join with code → sees A's quotes.
  3. B creates a quote → appears on A tagged "by B".
  4. Edit on A and delete on B → both converge; deleted quote stays deleted (tombstone).
  5. Offline edit on A, reconnect → merges without clobbering B's concurrent change.

## Out of scope (YAGNI)

- Roles / granular permissions (everyone is equal).
- Admin UI for many members (works, but no management screens beyond invite/leave).
- In-app payments, reviews, or any customer-facing surface (customers use the existing website, never the app).
