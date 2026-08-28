import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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

const WEBHOOK_SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";

const ENTITLEMENT_TO_PLAN: Record<string, "pro" | "premium"> = {
  pro: "pro",
  premium: "premium",
};

function verifySignature(body: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return signature === expected;
}

function mapProvider(store: string): "apple" | "google" {
  if (store === "PLAY_STORE") return "google";
  return "apple";
}

function mapStatus(
  eventType: string,
  expirationDate: string | null,
): "active" | "trialing" | "canceled" | "expired" | "past_due" {
  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
      return "active";
    case "CANCELLATION":
      if (expirationDate && new Date(expirationDate) > new Date()) {
        return "active";
      }
      return "canceled";
    case "EXPIRATION":
      return "expired";
    case "BILLING_ISSUE":
      return "past_due";
    default:
      return "active";
  }
}

function highestPlan(
  entitlements: string[],
): "free" | "pro" | "premium" {
  if (entitlements.includes("premium")) return "premium";
  if (entitlements.includes("pro")) return "pro";
  return "free";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const body = await req.text();

  if (WEBHOOK_SECRET) {
    const sig = req.headers.get("x-revenuecat-signature");
    if (!verifySignature(body, sig)) {
      console.error("RevenueCat webhook signature mismatch");
      return new Response("Invalid signature", {
        status: 401,
        headers: corsHeaders,
      });
    }
  }

  try {
    const payload = JSON.parse(body);
    const event = payload.event;

    if (!event) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUserId = event.app_user_id;
    const eventType = event.type;
    const store = event.store;
    const expirationDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;
    const purchaseDate = event.purchased_at_ms
      ? new Date(event.purchased_at_ms).toISOString()
      : null;
    const transactionId =
      event.transaction_id || event.original_transaction_id || null;
    const entitlementIds: string[] = event.entitlement_ids || [];
    const cancelAtPeriodEnd = eventType === "CANCELLATION" &&
      expirationDate !== null &&
      new Date(expirationDate) > new Date();

    if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = mapProvider(store);
    const plan = highestPlan(entitlementIds);
    const status = mapStatus(eventType, expirationDate);

    if (eventType === "EXPIRATION" || (eventType === "CANCELLATION" && !cancelAtPeriodEnd)) {
      await supabase.from("subscriptions").upsert(
        {
          trainer_id: appUserId,
          provider,
          provider_subscription_id: transactionId,
          plan: "free",
          status: status === "expired" ? "expired" : "canceled",
          current_period_end: expirationDate,
          cancel_at_period_end: false,
        },
        { onConflict: "trainer_id,provider" },
      );

      const { data: otherActive } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("trainer_id", appUserId)
        .in("status", ["active", "trialing"])
        .neq("provider", provider)
        .limit(1);

      if (!otherActive || otherActive.length === 0) {
        await supabase.from("trainers").update({
          subscription_plan: "free",
          is_featured: false,
          photo_limit: 3,
        }).eq("id", appUserId);
      }
    } else {
      await supabase.from("subscriptions").upsert(
        {
          trainer_id: appUserId,
          provider,
          provider_subscription_id: transactionId,
          plan,
          status,
          current_period_start: purchaseDate,
          current_period_end: expirationDate,
          cancel_at_period_end: cancelAtPeriodEnd,
        },
        { onConflict: "trainer_id,provider" },
      );

      const isPaid = plan === "pro" || plan === "premium";
      const photoLimit = plan === "free" ? 3 : plan === "pro" ? 10 : 999;

      await supabase.from("trainers").update({
        subscription_plan: plan,
        is_featured: isPaid,
        photo_limit: photoLimit,
      }).eq("id", appUserId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("RevenueCat webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
