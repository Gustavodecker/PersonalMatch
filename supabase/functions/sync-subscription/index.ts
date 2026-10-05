import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const REVENUECAT_SECRET_API_KEY = Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Entitlement = {
  expires_date: string | null;
  purchase_date: string | null;
  product_identifier: string;
};

function isActive(ent: Entitlement | undefined): ent is Entitlement {
  return !!ent && (ent.expires_date === null || new Date(ent.expires_date) > new Date());
}

// Plan and status come only from RevenueCat's server record; the request body is ignored.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    if (!REVENUECAT_SECRET_API_KEY) {
      console.error("sync-subscription: REVENUECAT_SECRET_API_KEY not configured");
      return json({ error: "Subscription sync unavailable" }, 503);
    }

    const userId = user.id;

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` } },
    );
    if (!rcRes.ok) {
      console.error("RevenueCat lookup failed:", rcRes.status);
      return json({ error: "Could not verify subscription" }, 502);
    }
    const rcData = await rcRes.json();
    const subscriber = rcData?.subscriber;
    if (!subscriber) return json({ error: "Could not verify subscription" }, 502);

    const entitlements: Record<string, Entitlement> = subscriber.entitlements ?? {};
    let plan: "pro" | "premium";
    let activeEnt: Entitlement;
    if (isActive(entitlements["premium"])) {
      plan = "premium";
      activeEnt = entitlements["premium"];
    } else if (isActive(entitlements["pro"])) {
      plan = "pro";
      activeEnt = entitlements["pro"];
    } else {
      return json({ success: true, plan: "free", status: "expired" });
    }

    const store = subscriber.subscriptions?.[activeEnt.product_identifier]?.store;
    const provider = store === "play_store" ? "google" : "apple";

    const { error: upsertErr } = await supabase.from("subscriptions").upsert(
      {
        trainer_id: userId,
        provider,
        provider_subscription_id: activeEnt.product_identifier,
        plan,
        status: "active",
        current_period_start: activeEnt.purchase_date || new Date().toISOString(),
        current_period_end: activeEnt.expires_date,
        cancel_at_period_end: false,
      },
      { onConflict: "trainer_id,provider" },
    );

    if (upsertErr) {
      console.error("Subscription upsert error:", upsertErr);
      return json({ error: "Failed to sync subscription" }, 500);
    }

    await supabase
      .from("trainers")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        is_featured: true,
        photo_limit: plan === "pro" ? 10 : 999,
      })
      .eq("id", userId);

    return json({ success: true, plan, status: "active" });
  } catch (err) {
    console.error("sync-subscription error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
