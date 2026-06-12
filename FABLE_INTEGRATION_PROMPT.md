# Elite Junk Solutions — Website-to-App Lead Pipeline
# Fable Integration Prompt

## How to use
Open `ejs-quote-app-v2` in Claude Code and run:
```
claude --model fable
```
Paste everything below this line as your first message.

---

You are a senior full-stack engineer who specializes in real-time data pipelines and PWA architecture. You write clean, production-quality code. You don't over-engineer. You build exactly what's needed, nothing more.

## What you're building

A seamless lead pipeline that connects a marketing website to a field operations PWA. When a customer submits a quote request on elitejunkut.com, it instantly appears in the app with all their info and photos pre-loaded. Porter taps one button to build the quote and one button to send a price range via SMS. The whole flow — from customer hitting submit to Porter sending a price — should take under 3 minutes.

## The two systems you're connecting

**System 1 — Marketing website: elitejunkut.com**
A custom HTML/CSS/JS website for Elite Junk Solutions. It has a quote request form that currently collects: Name, Phone, Email, Service Address, Service Type, Preferred Date, Preferred Time, Notes. No photo upload yet. The website already uses Supabase.

**System 2 — Field PWA: this repo (ejs-quote-app-v2)**
A React 19 + Vite PWA used exclusively by Porter and his business partner in the field. Customers never see this app. Already has: quote builder, customer profiles, dashboard, schedule, Supabase sync, service worker, offline support.

**The bridge: they share the same Supabase project.**
Supabase URL: `https://lfvuehgzomqjptcondbq.supabase.co`
The anon key is already in `src/lib/supabase.js`. Use it for all client-side Supabase calls.

---

## STEP 1 — Supabase setup (do this first, manually in the Supabase dashboard)

Tell Porter to do the following in his Supabase dashboard before you write any code. Lay out these exact instructions:

**Create the `lead_requests` table:**
```sql
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
```

**Create indexes:**
```sql
create index lead_requests_status_idx on lead_requests(status);
create index lead_requests_phone_idx on lead_requests(phone);
create index lead_requests_created_at_idx on lead_requests(created_at desc);
```

**Enable Row Level Security but allow anon inserts (for the website):**
```sql
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
```

**Create the storage bucket:**
In Supabase Storage, create a bucket called `lead-photos`. Set it to **Public**. No authentication needed to read (so photos display in the app without signed URLs).

**Enable Realtime on the table:**
In Supabase → Database → Replication, enable Realtime for the `lead_requests` table.

---

## STEP 2 — Website form upgrade (elitejunkut.com)

Find the website HTML file. The website is at elitejunkut.com — Porter will tell you where the source file is, or you'll find it in his project files. The main quote request form is in that HTML file.

**Add these fields to the existing form:**

1. **Volume estimate** — a visual card-picker (not a dropdown), three options displayed as large tap targets:
   - 🛋 Small Load — "A few items, like a couch and some boxes"
   - 🚛 Medium Load — "Half a truckload, like a room cleanout"
   - 🏠 Large Load — "Full truck or more, like a garage/estate cleanout"

2. **Photo upload** — optional, up to 5 photos. Label: "Add photos for a faster quote (optional)". On mobile this opens the camera directly (use `accept="image/*" capture="environment"`). Show thumbnail previews of selected photos below the upload button. Do NOT make this required — it's optional but strongly nudged.

**Client-side image compression (critical — do not skip):**
Before uploading photos to Supabase, compress each image to under 400KB using the browser Canvas API. No library needed. Here is the exact compression function to use:

```javascript
async function compressImage(file, maxSizeKB = 400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.85;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeKB * 1024 || quality < 0.3) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };
        tryCompress();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

**Form submission flow:**
1. User hits submit
2. Disable the submit button immediately (prevents duplicates)
3. Compress any photos in parallel
4. Upload each compressed photo to Supabase Storage at path `lead-photos/{uuid}/{filename}` where uuid is generated client-side with `crypto.randomUUID()`
5. Insert one row into `lead_requests` with all form data + photo paths array
6. Show a branded success state: "✅ Request received! We'll reach out within the hour — sooner if you added photos. Same-day? Call (385) 441-5090"
7. If submission fails, re-enable the button and show a friendly error with the phone number

**Add price anchoring above the form** (this is not optional — it prevents phantom leads):
Add this text near the top of the quote request form section:
> "Most jobs range from $89–$600 depending on volume. We'll give you an exact price before we start."
This sets expectations so customers who submit know roughly what they're walking into.

**Duplicate prevention:**
Add a 5-second debounce on the submit button. After successful submit, set a `localStorage` flag with the submission timestamp. If the same device tries to submit again within 30 minutes, show "We already have your request! We'll call you soon." with the phone number.

---

## STEP 3 — PWA: Leads inbox

### 3a. Add leads to the app store

In `src/store.jsx`, add leads state alongside quotes and customers:
- `leads` — array of lead_requests rows, sorted by created_at desc
- `unreadLeadCount` — count of status === 'new' leads
- `fetchLeads()` — load from Supabase, fall back to localStorage cache
- `updateLeadStatus(id, status)` — update in Supabase + local state
- `convertLeadToQuote(lead)` — creates a new quote pre-populated from the lead, links customer

### 3b. Leads inbox view

Create `src/views/LeadsInbox.jsx`. This is a dedicated screen showing all incoming website leads.

**Design:** Match the existing app aesthetic exactly — same glassmorphism cards, same teal + navy color system, safety orange for new/unread indicators. New leads should have a pulsing orange dot. The header shows the count of unread leads.

**Each lead card shows:**
- Customer name + phone (large, tappable to call)
- Service type + volume estimate
- Preferred date/time
- Photo thumbnails (if any) — horizontal scroll strip, tap to expand full screen
- Time since submission (relative: "2 min ago", "1 hr ago")
- Status badge: New (orange) / Contacted / Converted / Stale
- Notes preview (truncated to 2 lines)

**Actions on each lead card:**
1. **"Build Quote" button** (primary, teal) — creates a new quote pre-populated with all the lead's info, navigates to the quote builder. The customer is automatically matched or created (see Step 3d).
2. **"Send Price Range" button** (secondary, orange) — opens a bottom sheet with a pre-written SMS template (see Step 3c). One tap to copy to clipboard.
3. **"Mark Contacted"** — updates status, logs timestamp, removes orange dot.
4. Swipe left to dismiss/archive a lead.

### 3c. One-tap SMS price range

When Porter taps "Send Price Range", show a bottom sheet with this pre-filled template, editable before copying:

```
Hi [name], this is Porter at Elite Junk Solutions! 
Based on your [volume_estimate] [service_type], 
we're typically looking at $[low]–$[high].
Want to get it scheduled? — (385) 441-5090
```

Price ranges auto-fill based on volume:
- Small → $89–$200
- Medium → $200–$400  
- Large → $400–$600+

Porter can edit before copying. One tap copies to clipboard. The app then marks the lead as `price_range_sent = true` and shows a confirmation toast.

### 3d. Customer matching

When "Build Quote" is tapped:
1. Search existing customers by phone number (exact match, strip formatting)
2. If found: link the lead to that customer, pre-fill their profile into the quote builder
3. If not found: create a new customer profile from the lead data, then open the quote builder
4. Never auto-merge if there's ambiguity (multiple matches) — show a simple picker instead
5. Set `lead_requests.customer_id` to the matched/created customer's id

### 3e. Navigation

Add a "Leads" tab to the bottom navigation. Use the `Inbox` icon from lucide-react. Place it between Home and Schedule. Show a small orange badge with the unread count when there are new leads. When there are no unread leads, show no badge.

---

## STEP 4 — Real-time notifications

### 4a. Supabase Realtime subscription

In the app, subscribe to the `lead_requests` table for INSERT events. When a new row arrives:
1. Add it to the leads state
2. Increment unreadLeadCount
3. Trigger a push notification (if permission granted)
4. Play a subtle notification sound using Web Audio API (optional, respect user preference)

### 4b. Polling fallback (non-negotiable)

**Do not rely on Realtime alone.** Supabase Realtime on the free tier can pause after a week of inactivity. Add polling every 60 seconds that fetches `lead_requests` where `status = 'new'` and `created_at > now() - interval '24 hours'`. If new rows appear that aren't in local state, add them and notify. This runs in the background regardless of Realtime connection status.

### 4c. Web Push notifications (when app is closed)

Generate VAPID keys once (use the `web-push` npm package or an online generator). Store the public key in the app, the private key in Supabase Edge Function secrets.

In the service worker (`public/sw.js` or wherever the existing service worker is):
- Register for push on first app load (ask permission after the user has used the app once, not on first visit)
- Handle `push` events to show a notification: "New lead from [name] — [service type]"
- Notification click opens the app to the Leads inbox

Create a Supabase Edge Function (`supabase/functions/notify-lead/index.ts`) that:
- Triggers on INSERT to lead_requests via a database webhook
- Sends a Web Push notification to all registered devices using the stored VAPID keys
- This is free — Supabase Edge Functions have a generous free tier

### 4d. Stale lead detection

Create a Supabase scheduled function (cron) that runs every 4 hours:
```sql
update lead_requests 
set status = 'stale'
where status = 'new' 
and created_at < now() - interval '4 hours';
```
When status flips to stale, the Realtime subscription picks it up and the app re-notifies Porter: "⚠️ Lead from [name] hasn't been contacted — [time] ago."

---

## STEP 5 — Dashboard integration

On the main Dashboard in `src/views/Dashboard.jsx`:

Add a **"New Leads"** alert card at the very top of the body (below the hero, above the stats) that only shows when there are unread leads. It should be impossible to miss — orange glow, pulsing indicator. Shows: "X new lead(s) from your website" with a "View All" button that navigates to the Leads inbox.

Add a **"Leads"** KPI stat card to the existing stats row: "Leads / mo" showing the count of leads received this calendar month.

---

## Technical constraints

- 100% free — no paid APIs, no new subscriptions
- VAPID keys for push: generate free with `npx web-push generate-vapid-keys`
- Supabase Edge Functions: free tier (500K invocations/month — plenty)
- Storage: free tier (1GB — photo compression keeps this safe)
- Polling: lightweight, single query, does not hammer the DB
- All photo URLs built client-side from path + Supabase storage public URL — never store full URLs
- Do not break existing LocalStorage data shape
- Test offline behavior: leads fetched when online are cached locally

## Build order

1. Write out the Supabase setup instructions for Porter (schema, RLS, bucket, Realtime)
2. Update the website form (volume picker, photo upload, compression, price anchoring, success state)
3. Add leads to app store + LeadsInbox view (read-only first, no actions)
4. Add Leads tab to navigation + dashboard alert card
5. Add "Build Quote" action with customer matching
6. Add "Send Price Range" SMS template bottom sheet
7. Add Supabase Realtime subscription
8. Add polling fallback
9. Add Web Push service worker + Edge Function
10. Add stale lead cron
11. Test full flow end to end: submit on website → lead appears in app → build quote → customer created

After each step, confirm `npm run build` passes before moving on.

This is a two-person business. Every lead that falls through the cracks is a job they didn't get. Build it tight.
