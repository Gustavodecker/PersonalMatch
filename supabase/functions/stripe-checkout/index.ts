import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  pro:     Deno.env.get("STRIPE_PRICE_PRO"),
  premium: Deno.env.get("STRIPE_PRICE_PREMIUM"),
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { action, planId, priceId: rawPriceId, trainerId, voucherCode, successUrl, cancelUrl } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) return json({ error: "Profile not found" }, 404);

    // ── CREATE CHECKOUT SESSION ──────────────────────────────────────────────
    if (action === "checkout") {
      const resolvedPriceId = (planId ? PLAN_PRICE_MAP[planId] : undefined) ?? rawPriceId;

      if (!resolvedPriceId) {
        return json({ error: `Plano inválido ou price ID não configurado para: ${planId ?? rawPriceId}` }, 400);
      }

      let customerId = profile.stripe_customer_id;

      // Validate the stored customer ID — it may have been deleted in Stripe
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch {
          customerId = null;
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: null })
            .eq("id", user.id);
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: profile.email,
          name: profile.full_name ?? undefined,
          metadata: { trainer_id: user.id },
        });
        customerId = customer.id;
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }

      // Resolve voucher discount if provided
      let discounts: { coupon: string }[] | undefined;
      if (voucherCode) {
        const code = String(voucherCode).trim().toUpperCase();
        const today = new Date().toISOString();

        const { data: voucher } = await supabase
          .from("vouchers")
          .select("id, type, discount_value, max_uses, use_count, expiry_date, is_active, applicable_for")
          .eq("code", code)
          .eq("is_active", true)
          .or("applicable_for.eq.trainer,applicable_for.eq.both")
          .maybeSingle();

        if (voucher) {
          const expired = voucher.expiry_date && voucher.expiry_date < today;
          const overLimit = voucher.max_uses != null && voucher.use_count >= voucher.max_uses;

          if (!expired && !overLimit) {
            // Create or retrieve a Stripe coupon keyed by the voucher code
            const couponId = `VOUCHER_${code}`;
            let coupon: Stripe.Coupon;
            try {
              coupon = await stripe.coupons.retrieve(couponId);
            } catch {
              // Coupon doesn't exist yet — create it
              const couponParams: Stripe.CouponCreateParams = {
                id: couponId,
                name: `Voucher ${code}`,
                duration: "once",
              };
              if (voucher.type === "percentage") {
                couponParams.percent_off = Math.min(Number(voucher.discount_value), 100);
              } else {
                couponParams.amount_off = Math.round(Number(voucher.discount_value) * 100);
                couponParams.currency = "brl";
              }
              coupon = await stripe.coupons.create(couponParams);
            }
            discounts = [{ coupon: coupon.id }];

            // Increment use_count
            await supabase
              .from("vouchers")
              .update({ use_count: voucher.use_count + 1, updated_at: new Date().toISOString() })
              .eq("id", voucher.id);
          }
        }
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: { trainer_id: user.id },
        },
        metadata: { trainer_id: user.id },
      };

      if (discounts) {
        sessionParams.discounts = discounts;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return json({ url: session.url });
    }

    // ── CREATE PORTAL SESSION ────────────────────────────────────────────────
    if (action === "portal") {
      let customerId = profile.stripe_customer_id;
      if (!customerId) {
        return json({ error: "Você ainda não tem uma assinatura ativa." }, 400);
      }
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: null })
          .eq("id", user.id);
        return json({ error: "Cliente não encontrado no Stripe. Tente assinar novamente." }, 400);
      }
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: cancelUrl,
      });
      return json({ url: portalSession.url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("stripe-checkout error:", err);
    return json({ error: err.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
