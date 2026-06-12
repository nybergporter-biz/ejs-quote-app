# Elite Junk Solutions — Fable Upgrade Prompt

## How to use
Open `ejs-quote-app-v2` in Claude Code and run:
```
claude --model fable
```
Paste everything below this line as your first message.

---

You are the world's best product designer and engineer. You have the design eye of Jony Ive, the product instincts of the team that built Robinhood and Dark Sky, and the engineering discipline of a senior React architect. You build things that feel like consumer products, not software. Your job today is to transform an already-solid field operations app into something extraordinary — the kind of tool that makes two guys running a junk removal business feel like they have a world-class ops team behind them.

## Who this is for

Porter and his business partner run Elite Junk Solutions — a two-person junk removal operation. This app is their field command center. Customers never see it. It lives on their phones. They use it with dirty hands, in parking lots, at the end of a long day. Every design decision and every feature must pass one test: **does this work for a tired guy in a truck?**

## Existing stack — do not rebuild, enhance

- React 19 + Vite 8 + Tailwind 3
- Framer Motion (animations throughout)
- Three.js + React Three Fiber (`Trailer3D.jsx` — 3D truck component)
- Radix UI (dialogs, selects, sliders, switches)
- GSAP
- jsPDF + html2canvas (PDF generation)
- Supabase (cloud sync — free tier)
- LocalStorage (offline-first, primary data store)
- lucide-react icons
- PWA with service worker (installable, offline-capable)

## What's already built

- Dashboard with KPI stat cards + 6-month revenue sparkline
- Quote builder with line items and pricing
- Quote detail view + PDF export
- Customer list + customer profiles
- Schedule view
- Settings + Setup onboarding
- `Trailer3D.jsx` — Three.js 3D truck that visualizes load
- `MountainBackground.jsx` — WebGL parallax hero
- `ParticleBurst`, `QuoteReveal`, `AnimatedNumber` components
- Dark/light mode, bottom nav with FAB, toast notifications
- Color system: deep navy + teal (`--teal`, `--teal-lt`)

## Mission

Do NOT rebuild from scratch. Do a full audit of every file in `src/` first — read every view, component, hook, and lib file. Then present a complete upgrade plan before writing a single line of code. Wait for approval, then build. After each feature, run `npm run build` to confirm it compiles before moving on.

---

## PART 1 — UI/UX DESIGN OVERHAUL

This is not optional and not secondary. The design upgrade happens alongside every feature. The current app has strong bones — push them to the limit.

### Design system upgrades

**Color:** The existing teal + navy is strong. Add **safety orange (#FF6B35)** as a second accent. Use it for primary CTAs, active states on the "Job Done" button, urgent alerts, and the truck load warning at 95%+. Teal = operational/informational. Orange = action/urgency. Navy = depth/structure.

**Depth:** Every surface card should feel physical. Use layered box shadows (not flat), subtle inner highlights on top edges, and micro-gradients within cards. The glassmorphism on the nav should have more blur and a sharper border. Cards should feel like they're sitting on a surface, not floating.

**Typography:** Tighten heading letter-spacing. Increase font-weight contrast between headings (800-900) and body text (400-500). Labels should be smaller and more airy. Numbers (prices, stats) should feel bold and proud — tabular figures, large, high-contrast.

**Motion:** Everything moves on spring physics via Framer Motion — no linear eases, no cubic-bezier that feels mechanical. Tap feedback within 50ms. Cards should have a subtle press-down on tap (scale 0.97, spring). List items should stagger-animate in. Status changes should feel like flipping a physical tile.

**Empty states:** Every empty state gets an illustration (SVG, inline) and an encouraging message. No blank white boxes.

**Loading:** Replace any spinners with skeleton screens that pulse in brand colors. Skeletons should match the exact shape of the content they're loading.

**Micro-interactions:** 
- Completing a job triggers a ParticleBurst
- Marking a quote as paid triggers a satisfying checkmark animation with a cash sound (Web Audio API, optional)
- The truck load filling up should animate smoothly as items are added
- Status badge changes should flip/slide, not just swap

### Screen-by-screen design goals

**Dashboard:** Should feel like a morning briefing from a smart assistant. The hero section shows: greeting, today's date + weather emoji (use a free weather lookup or just a time-based emoji), today's job count, and projected revenue. Below the fold: KPI cards, sparkline, partner status strip, recent quotes. Nothing should feel like a data dump — every element should answer "what do I need to know right now?"

**Quote Builder:** The centerpiece is the 3D truck. It should feel alive. As items are added, the truck fills in real time with smooth animation. The pricing section should feel like a calculator — large numbers, immediate feedback. The flow from "new quote" to "ready to send" should take under 60 seconds.

**Quote Detail:** Clean, proud, professional. This is what you pull up to show a customer the price. It should look premium. Large total, clear line items, status badge that's impossible to miss.

**Schedule:** A visual calendar that feels like a real planning tool. Color-coded by partner. Jobs should show estimated duration. Today's jobs should be highlighted with a warm glow.

**Customer Profiles:** More than a contact card. Should show job history timeline, total revenue from that customer, a recurring badge if they've booked 3+ times, and quick-action buttons (call, text, new quote).

---

## PART 2 — FEATURE BUILDS

Build these in order. Do not skip ahead.

### 1. Partner Coordination View [HIGHEST PRIORITY]

This is the #1 missing feature for a two-person operation. Build a persistent "partner strip" visible on the Dashboard that shows:
- Both partners' names (Porter + partner from Settings)
- Each person's current job status: **Available** / **En Route** / **On Site** / **Wrapping Up**
- Their current job name/address if active
- Time elapsed on current job
- A one-tap status update button — Porter taps his own status to update it

Each partner's status is stored in Supabase and syncs in real time. When offline, status is stored locally and syncs when reconnected. This eliminates the "are you done yet?" phone calls.

Also: every quote/job has an "Assigned to" field — Porter or [Partner]. On the dashboard, add a toggle: **My Jobs / All Jobs**. Quote cards show a small colored dot indicating which partner owns it.

### 2. One-Tap "Job Done" Mega-Button

When a job is active, there is one big, beautiful, orange button on the quote detail screen: **JOB DONE**. It is unmissable. Tapping it:
1. Sets job status to Completed
2. Stops the job timer (if running)
3. Logs the completion timestamp
4. Marks deposit as collected (if deposit was expected)
5. Copies a pre-written review request text to the clipboard (ready to paste into Messages)
6. Fires a ParticleBurst celebration animation
7. Shows a summary card: time on job, final price, next job if scheduled

This is the end-of-job ritual. One tap replaces five manual steps.

### 3. Voice-to-Text Job Notes

On every quote and job detail screen, a microphone button. Tap and hold to record. On release, the speech is transcribed using the free Web Speech API (built into all modern mobile browsers — no API key needed). The transcription appears as a note on the job. These notes are searchable. This is for capturing details at the curb: "customer said to come around the back, gate code is 1234, they have an extra couch not on the quote."

### 4. Mark Paid + Receipt Copy

On every quote detail, a clear **Mark Paid** button. Tapping it:
- Prompts: Cash / Card / Venmo / Zelle / Check
- Records payment method + timestamp
- Changes status to Paid with a satisfying animation
- Generates a receipt text (customer name, job, amount, date, payment method) and copies it to clipboard — ready to paste into a text message

The dashboard should show unpaid completed jobs as an alert — money is sitting uncollected.

### 5. Time Tracking Per Job

A **Start Timer** button on every active job. Tapping it starts a visible running clock on the job card. Tapping **Stop** (or the Job Done button) ends it. Total time is stored on the job record. Show average job duration on customer profiles ("Avg job: 1h 22m"). Show time vs. revenue on the dashboard as an effective hourly rate. This is the data Porter needs to price accurately.

### 6. Dump Fee / Disposal Cost Logging

On the quote builder and job detail, an "Expenses" section — simple line items:
- Dump fee ($)
- Fuel surcharge ($)
- Other (custom)

These are subtracted from job revenue in the dashboard to show **true margin**, not just gross revenue. The 6-month sparkline should have a toggle: Gross Revenue vs. Net Margin. A two-person operation that doesn't track dump fees is flying blind on profitability.

### 7. Before/After GPS Photo Documentation

On every job, a photo section with two categories: **Before** and **After**. Tapping either opens the device camera (using the PWA `capture` attribute — free, no API). Each photo is automatically:
- Timestamped
- GPS-tagged (using browser Geolocation API — free)
- Stored as compressed base64 in LocalStorage + synced to Supabase Storage (free tier)
- Shown as a thumbnail gallery on the job card

The Before photos protect against "you didn't take that" disputes. The After photos build a portfolio of completed work. Both are included as a small thumbnail grid in the PDF export.

### 8. Recurring Customer Detection

When building a new quote, if the customer's phone number or name matches an existing customer profile, the app:
- Shows a "Welcome back!" banner with their job history summary
- Highlights them as a **Repeat Customer** with a badge
- Shows their last job date and amount

On the Customer List, a dedicated **Recurring** filter shows all customers with 2+ bookings. A **"Time to follow up"** flag appears on customers who haven't been seen in 90+ days. One tap copies a personalized "Hey [name], hope everything's going well — need another haul?" text to clipboard.

### 9. Quote Loss Tracker

When a sent quote is manually closed/lost, show a one-tap reason picker before archiving:
- Price too high
- Went with competitor  
- Timing didn't work
- No response (ghosted)
- Other

After 20+ lost quotes, the Dashboard shows a **Win/Loss Insights** card: your most common loss reason, your average quote-to-close time, and your win rate this month. This is the feedback loop that tells Porter where to adjust.

### 10. Route Capacity View

On the Schedule screen, add a **Today's Route** view. This is NOT a navigation tool — it's a capacity tool. It shows:
- Today's scheduled jobs plotted on a map (using Leaflet.js + OpenStreetMap — 100% free, no API key)
- Total estimated drive time between stops
- Total job time (from historical averages)
- A **"Room for one more?"** indicator — green if there's 2+ hours of slack in the day, yellow if tight, red if full
- One tap opens the day's first unstarted job in Apple/Google Maps for navigation

### 11. Good/Better/Best Quote Tiers [Lower priority — build last]

In the quote builder, an optional toggle: **Simple Quote** (default) or **Tiered Quote**. In tiered mode, build three versions:
- **Basic** — haul only
- **Standard** — haul + light demo
- **Premium** — haul + demo + same-day + cleanup

Each tier auto-populates from the base quote with price multipliers. The PDF shows all three columns side by side. The customer can be told verbally "we do Basic, Standard, or Premium — here's the difference." Simple, fast, upsells naturally.

---

## PART 3 — THINGS TO CUT OR SKIP

Do NOT build:
- AI estimate from photo (free vision APIs are not good enough — this will produce garbage and erode trust in the tool)
- Photo annotations (over-engineered for two partners who trust each other)
- Automated review request sending (they'll send ~40/year — a one-tap clipboard copy is sufficient)

---

## PART 4 — TECHNICAL CONSTRAINTS

- 100% free — no new paid APIs, no subscription services
- All new features must use only what's in `package.json` already, OR open-source free libraries (Leaflet.js for maps is the only exception — it's free and open source)
- Offline-first — every feature must degrade gracefully when offline. Supabase sync is opportunistic, not required.
- iOS Safari + Android Chrome — test mentally against both before finishing any feature
- Do not break existing LocalStorage data shape. Migration is fine. Data wipe is not.
- Web Speech API for voice notes — it's built into mobile browsers, no key needed
- Geolocation API for photo GPS tags — built in, no key needed
- Leaflet.js + OpenStreetMap for the route map — free, open source, no API key

---

## Working order

1. Full audit of every file in `src/` — read everything before touching anything
2. Present the complete upgrade plan with scope estimate per feature (S/M/L)
3. Wait for approval
4. Build in this order: Partner Coordination → Job Done Mega-Button → Voice Notes → Mark Paid → Time Tracking → Dump Fees → Photos → Recurring Detection → Quote Loss Tracker → Route View → Tiers
5. After EACH feature: `npm run build` must pass before moving on
6. Design upgrades (color, motion, typography, depth) are woven into every feature — not a separate pass at the end

This app represents two guys building something real. Make it extraordinary.
