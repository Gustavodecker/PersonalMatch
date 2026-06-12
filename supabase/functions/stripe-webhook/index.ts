import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, "pro" | "premium"> = {
  [Deno.env.get("STRIPE_PRICE_PRO") ?? ""]:     "pro",
  [Deno.env.get("STRIPE_PRICE_PREMIUM") ?? ""]: "premium",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", webhookSecret ?? "");
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const trainerId = session.metadata?.trainer_id;
        if (!trainerId) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await upsertSubscription(trainerId, sub);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const trainerId = sub.metadata?.trainer_id;
        if (!trainerId) break;
        await upsertSubscription(trainerId, sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const trainerId = sub.metadata?.trainer_id;
        if (!trainerId) break;

        await supabase.from("subscriptions").upsert({
          trainer_id: trainerId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          plan: "free",
          status: "canceled",
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: false,
        }, { onConflict: "stripe_subscription_id" });

        await supabase.from("trainers").update({
          subscription_plan: "free",
          is_featured: false,
          photo_limit: 3,
        }).eq("id", trainerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", invoice.subscription as string);
        break;
      }
    }
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function upsertSubscription(trainerId: string, sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price?.id ?? "";
  const plan: "free" | "pro" | "premium" = PRICE_TO_PLAN[priceId] ?? "free";

  await supabase.from("subscriptions").upsert({
    trainer_id: trainerId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer as string,
    plan,
    status: sub.status,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
  }, { onConflict: "stripe_subscription_id" });

  const isPremium = plan === "premium";
  const photoLimit = plan === "free" ? 3 : plan === "pro" ? 8 : 20;

  await supabase.from("trainers").update({
    subscription_plan: plan,
    is_featured: isPremium,
    photo_limit: photoLimit,
  }).eq("id", trainerId);
}
