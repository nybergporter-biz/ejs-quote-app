# Job & Route Planner — Design Spec

**Date:** 2026-06-03
**App:** Elite Junk Solutions quoting PWA (React + Vite + Tailwind v3, localStorage + Supabase sync)
**Status:** Approved (brainstorming) → ready for implementation plan

## Goal

Help the 2 owners plan their week so they **stay in one area of Utah County per day** and **minimize trips to the dump**, saving gas, time, and labor. Achieved with simple **city grouping + a trailer-capacity running total**, not road-routing optimization.

## Council-driven principles (what we are and aren't building)

- **NOT vehicle-routing / TSP / geocoding.** City-name grouping + a running cubic-yard total captures ~90–95% of the savings for 6–15 jobs/week, stays free, and works offline.
- **"Today's Stops" is the everyday screen** — a plain list (not a calendar grid), driving-order, big tap-to-navigate links.
- **Suggest, never shove.** The planner offers same-city days but never blocks booking the day the customer wants (urgent jobs are never delayed — "opportunistic gravity," two-tier in spirit).
- **Friendly units.** Show size as **trailer-fulls** (≈¼/½/¾/full); keep cubic yards as the hidden unit for dump math. Plain words in UI ("stops," "trips to the dump," "trailer's getting full") — no "route/optimize/cubic yards" jargon.
- **The one online piece is free:** tap-to-navigate via Google/Apple Maps URL links. No paid APIs, no geocoding.

## Decisions (from brainstorming)

1. **The quote *is* the job** — schedule an existing quote by giving it a date (no separate job entity).
2. **Size** defaults to the quote's auto-calculated CY, shown as trailer-fulls, with an **editable override** per job.
3. **Placement:** a new **Schedule** bottom-nav tab (Home · Schedule · ➕ · Customers · Settings) + a small "Today" peek on the Home dashboard.
4. **Scope:** full MVP (items 1–5 below). Phase 2 (later): "fill this half-empty day" outreach + city-profitability heatmap.

## Data model

Add three fields to a quote object (synced + offline like everything else):
- `scheduledDate: string | null` — `'YYYY-MM-DD'` local date, or null (unscheduled).
- `city: string` — parsed from the address, **editable**.
- `plannedCY: number | null` — size override; when null, use `pricing.totalCY`.

Helpers (in `src/lib/planner.js`, pure + unit-testable):
- `parseCity(address)` — split on commas; take the second-to-last segment, strip a trailing `STATE ZIP` (e.g. `UT 84045`) and trim. Falls back to `''` if unparseable.
- `jobCY(quote, settings)` — `quote.plannedCY ?? quote.pricing?.totalCY ?? 0`.
- `dumpRuns(jobs, capacity)` — walk jobs accumulating CY; each time `running + next > capacity`, increment runs and reset; a job `> capacity` adds `ceil(cy/capacity)` runs. Returns `{ runs, markers }` where `markers[i]` = index after which a DUMP RUN divider is drawn.
- `daySavings(jobs, settings)` — `(jobs.length - runs) * settings.MILES_TO_DUMP * 2 * settings.GAS_PER_MILE` (dollars of avoided dump round-trips); also returns minutes estimate (optional, simple).
- `groupByCity(jobs)` — `{ [city]: jobs[] }`, preserving order.
- `suggestDays(quote, quotes, settings, fromDate)` — upcoming dates (next ~14 days) that already have ≥1 job in the **same city** with room before a new dump run; ranked same-city + most remaining capacity; return up to 3 `{ date, city, fillAfter }`.

## Store actions (`src/store.jsx`)

- `scheduleQuote(id, { date, city, plannedCY })` — sets the three fields (merges into the quote via existing `saveQuote`-style upsert; bumps `updatedAt`).
- `unscheduleQuote(id)` — clears `scheduledDate`.
- Selectors live in views/helpers (filter `quotes` by `scheduledDate`).

## Views & components

### New: `src/views/Schedule.jsx` (bottom-nav tab)
- **Mode toggle:** "Today" (default) / "Week".
- **Today mode:**
  - Date strip at top (tap to flip days; defaults to today).
  - Jobs for the selected date, **grouped by city**, each city block in order.
  - Each stop row: customer name · address (tap → `https://www.google.com/maps/search/?api=1&query=<addr>`) · trailer-fulls · status badge.
  - Running trailer-fill bar; **"🛻 DUMP RUN"** dividers inserted per `dumpRuns()` markers.
  - Day header: # stops · total trailer-fulls · # dump runs · "saves ~$X" · "📍 1 area" / "2 areas" badge.
  - Empty state: "No jobs scheduled — schedule a quote to plan your day."
- **Week mode:**
  - Vertical list of next ~7 days. Each day card: city chips (`Saratoga Springs ×4`), fill bar, dump-run count. Tap → Today mode for that date.

### New: `src/components/ScheduleControl.jsx` (used on QuoteDetail + QuoteBuilder)
- Shows current scheduled date (or "Not scheduled").
- Tapping opens a sheet: **suggested days** (up to 3 chips from `suggestDays`) above a native date input; an editable **city** field; a **size** stepper (trailer-fulls, defaulting to auto). Save → `scheduleQuote`. "Remove from schedule" when scheduled.

### Edited: `src/views/Dashboard.jsx`
- Add a compact **"Today"** card near the top: today's stop count + first stop name/address + "View schedule →" (navigates to Schedule tab). Hidden if nothing scheduled today.

### Edited: `src/App.jsx`
- Add `schedule` route + lazy `Schedule` view; add the **Schedule** item to `BottomNav` (between Home and the ➕ FAB).

## Data flow

- Schedule a quote → `scheduleQuote` writes fields → quote syncs (per-quote merge already handles it) → Schedule tab + Home peek recompute from `quotes`.
- Today's Stops = `quotes.filter(scheduledDate === selectedDate)` → `groupByCity` → render with `dumpRuns` markers + `daySavings`.
- Suggest-a-day = pure function over `quotes`.

## Edge cases (council-flagged)

- **Bad/again size:** override is always editable; trailer-fill labeled an estimate.
- **Job bigger than trailer:** `dumpRuns` handles `>capacity` (multiple runs).
- **Sloppy address / unparseable city:** `city` is editable; group label falls back to "Other" when empty.
- **Unscheduled / no date:** excluded from day/week views; reachable via quotes list.
- **Offline:** all pure-data + localStorage; maps links open the device's map app.
- **Customer wants a specific day:** date picker always available; suggestions never block.

## Out of scope (YAGNI / phase 2)

- Geocoding, haversine, lat/long, road-distance routing, map tiles, true optimization.
- "Fill this half-empty day" outreach texting (phase 2 — needs this MVP + history first).
- City-profitability heatmap / territory analytics (phase 2).
- Time-of-day windows / per-stop appointment times (day-level only for MVP).
- Multiple landfills / dump locations.

## Testing

- **Unit (pure helpers in `planner.js`):** add a minimal Vitest setup (`npm i -D vitest`), test `parseCity` (various Utah address formats), `dumpRuns` (under/over capacity, exact-12 boundary, single >12 job), `daySavings`, `suggestDays`. These are pure and genuinely unit-testable.
- **Manual (preview):** schedule 3 quotes across 2 cities/days; verify Today's Stops grouping, dump dividers at the 12-CY boundary, savings number, week-view city chips, suggest-a-day chips, tap-to-navigate opens maps, Home "Today" peek.
- `npm run build` passes; deploy to Netlify.
