// notify-lead — fires on INSERT (and optionally UPDATE→stale) of lead_requests
// via a Database Webhook, and Web-Pushes every registered device.
// Deploy: supabase functions deploy notify-lead --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (see docs/SUPABASE_SETUP.md)

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@elitejunkut.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Service-role client (env vars are injected automatically by Supabase)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const lead = payload.record;
    if (!lead) return new Response("no record", { status: 400 });

    // INSERT → new lead; UPDATE we only care about when it just went stale
    const isStale = payload.type === "UPDATE" && lead.status === "stale" &&
      payload.old_record?.status !== "stale";
    if (payload.type === "UPDATE" && !isStale) {
      return new Response("ignored", { status: 200 });
    }

    const job = [lead.service_type, lead.volume_estimate].filter(Boolean).join(" · ");
    const message = isStale
      ? {
        title: `⚠️ Lead from ${lead.name ?? "website"} not contacted yet`,
        body: "It came in over 4 hours ago — send them a price range.",
        tag: `ejs-lead-stale-${lead.id}`,
        url: "/?view=leads",
      }
      : {
        title: `New lead from ${lead.name ?? "your website"}`,
        body: job || "Someone requested a pickup on elitejunkut.com",
        tag: `ejs-lead-${lead.id}`,
        url: "/?view=leads",
      };

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription");
    if (error) throw error;

    const results = await Promise.allSettled(
      (subs ?? []).map((s) =>
        webpush.sendNotification(s.subscription, JSON.stringify(message))
      ),
    );

    // Prune dead subscriptions (410 Gone / 404)
    const dead = results
      .map((r, i) => ({ r, id: subs![i].id }))
      .filter(({ r }) =>
        r.status === "rejected" &&
        [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)
      )
      .map(({ id }) => id);
    if (dead.length) {
      await supabase.from("push_subscriptions").delete().in("id", dead);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, pruned: dead.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-lead failed:", err);
    return new Response("error", { status: 500 });
  }
});
