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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const userId = user.id;
    const body = await req.json();
    const {
      plan,
      provider,
      status,
      transactionId,
      expiresAt,
      purchasedAt,
    } = body;

    if (!plan || !provider || !status) {
      return json({ error: "Missing required fields" }, 400);
    }

    const validPlans = ["free", "pro", "premium"];
    const validProviders = ["apple", "google", "stripe"];
    const validStatuses = [
      "active",
      "canceled",
      "past_due",
      "trialing",
      "expired",
    ];

    if (!validPlans.includes(plan)) {
      return json({ error: "Invalid plan" }, 400);
    }
    if (!validProviders.includes(provider)) {
      return json({ error: "Invalid provider" }, 400);
    }
    if (!validStatuses.includes(status)) {
      return json({ error: "Invalid status" }, 400);
    }

    const { error: upsertErr } = await supabase.from("subscriptions").upsert(
      {
        trainer_id: userId,
        provider,
        provider_subscription_id: transactionId || null,
        plan,
        status,
        current_period_start: purchasedAt || new Date().toISOString(),
        current_period_end: expiresAt || null,
        cancel_at_period_end: false,
      },
      { onConflict: "trainer_id,provider" },
    );

    if (upsertErr) {
      console.error("Subscription upsert error:", upsertErr);
      return json({ error: "Failed to sync subscription" }, 500);
    }

    const isPaid = plan === "pro" || plan === "premium";
    const photoLimit = plan === "free" ? 3 : plan === "pro" ? 10 : 999;

    await supabase
      .from("trainers")
      .update({
        subscription_plan: plan,
        is_featured: isPaid,
        photo_limit: photoLimit,
      })
      .eq("id", userId);

    return json({ success: true, plan, status });
  } catch (err: any) {
    console.error("sync-subscription error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
