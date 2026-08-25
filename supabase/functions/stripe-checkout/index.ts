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

// Hardcoded price IDs — the deployed STRIPE_PRICE_* secrets contain stale
// values that don't match the actual Stripe products, so we ignore them.
const PLAN_PRICE_MAP: Record<string, string> = {
  pro:     "price_1TlIhLGT3oj5YeOVfAEhPfpu",
  premium: "price_1TlIhLGT3oj5YeOVEVxrxALk",
};

// A caller may only ever check out at one of the published plan prices.
const ALLOWED_PRICE_IDS = new Set(Object.values(PLAN_PRICE_MAP));

// Return URLs must belong to this app; anything else is replaced by the default,
// so a crafted request cannot turn a genuine Stripe link into an open redirect.
const APP_WEB_URL = (Deno.env.get("APP_WEB_URL") ?? "https://99personal.com.br").replace(/\/$/, "");
const APP_MOBILE_SCHEME = "personal99://";

function safeReturnUrl(candidate: unknown, fallbackPath: string): string {
  const fallback = `${APP_WEB_URL}${fallbackPath}`;
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > 2048) {
    return fallback;
  }
  if (candidate.startsWith(APP_MOBILE_SCHEME)) return candidate;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return fallback;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
  const host = url.hostname.toLowerCase();
  const appHost = new URL(APP_WEB_URL).hostname.toLowerCase();
  const allowed =
    host === appHost ||
    host.endsWith(`.${appHost}`) ||
    host === "localhost" ||
    host === "127.0.0.1";
  return allowed ? url.toString() : fallback;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { action, planId, priceId: rawPriceId, voucherCode, successUrl, cancelUrl } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return json({ error: "Profile not found" }, 404);

    const safeSuccessUrl = safeReturnUrl(successUrl, "/trainer/assinatura-sucesso");
    const safeCancelUrl = safeReturnUrl(cancelUrl, "/trainer/assinatura");

    // ── CREATE CHECKOUT SESSION ──────────────────────────────────────────────
    if (action === "checkout") {
      const requested = (planId ? PLAN_PRICE_MAP[planId] : undefined) ??
        (typeof rawPriceId === "string" ? rawPriceId : undefined);
      const resolvedPriceId = requested && ALLOWED_PRICE_IDS.has(requested) ? requested : undefined;

      if (!resolvedPriceId) {
        return json({ error: "Plano inválido." }, 400);
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

      // Resolve voucher discount if provided. The claim is atomic and enforces both
      // the total usage cap and the one-per-person limit in the database.
      let discounts: { coupon: string }[] | undefined;
      if (voucherCode) {
        const code = String(voucherCode).trim().toUpperCase();

        const { data: claimed, error: claimErr } = await supabase
          .rpc("claim_voucher", { p_code: code, p_user: user.id });

        if (claimErr) {
          console.error("claim_voucher failed:", claimErr);
        }

        const voucher = Array.isArray(claimed) ? claimed[0] : claimed;

        if (voucher) {
          const couponId = `VOUCHER_${code}`;
          let coupon: Stripe.Coupon;
          try {
            coupon = await stripe.coupons.retrieve(couponId);
          } catch {
            const couponParams: Stripe.CouponCreateParams = {
              id: couponId,
              name: `Voucher ${code}`,
              duration: "once",
            };
            if (voucher.voucher_type === "percentage") {
              couponParams.percent_off = Math.min(Number(voucher.discount_value), 100);
            } else {
              couponParams.amount_off = Math.round(Number(voucher.discount_value) * 100);
              couponParams.currency = "brl";
            }
            coupon = await stripe.coupons.create(couponParams);
          }
          discounts = [{ coupon: coupon.id }];
        }
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        success_url: safeSuccessUrl,
        cancel_url: safeCancelUrl,
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

    // ── START FREE TRIAL (no Stripe involved) ────────────────────────────────
    if (action === "start_trial") {
      if (profile.role !== "trainer") {
        return json({ error: "Apenas personais podem iniciar o período de teste." }, 403);
      }

      const { data: trainer } = await supabase
        .from("trainers")
        .select("pro_trial_started_at, subscription_plan")
        .eq("id", user.id)
        .maybeSingle();

      if (!trainer) {
        return json({ error: "Perfil de personal não encontrado." }, 404);
      }

      // Single-use: a trial that has already been started can never be started again.
      if (trainer.pro_trial_started_at) {
        return json({ error: "Seu período de teste já foi utilizado." }, 400);
      }

      const trialDays = 7;
      const startedAt = new Date().toISOString();
      const trialEnd = new Date(Date.now() + trialDays * 86400000).toISOString();

      const { error: claimErr } = await supabase
        .from("trainers")
        .update({
          subscription_plan: "pro",
          subscription_status: "trialing",
          is_featured: true,
          photo_limit: 10,
          pro_trial_started_at: startedAt,
          trial_ends_at: trialEnd,
        })
        .eq("id", user.id)
        .is("pro_trial_started_at", null);

      if (claimErr) {
        console.error("start_trial claim failed:", claimErr);
        return json({ error: "Não foi possível iniciar o período de teste." }, 500);
      }

      const { data: after } = await supabase
        .from("trainers")
        .select("pro_trial_started_at")
        .eq("id", user.id)
        .maybeSingle();

      if (after?.pro_trial_started_at !== startedAt) {
        return json({ error: "Seu período de teste já foi utilizado." }, 400);
      }

      await supabase
        .from("subscriptions")
        .upsert({
          trainer_id: user.id,
          plan: "pro",
          status: "trialing",
          current_period_start: startedAt,
          current_period_end: trialEnd,
          cancel_at_period_end: true,
        }, { onConflict: "trainer_id" });

      return json({ success: true, trial_ends_at: trialEnd });
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
        return_url: safeCancelUrl,
      });
      return json({ url: portalSession.url });
    }

    // ── CANCEL SUBSCRIPTION ──────────────────────────────────────────────────
    if (action === "cancel_subscription") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("trainer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub?.stripe_subscription_id) {
        return json({ error: "Nenhuma assinatura ativa encontrada." }, 400);
      }

      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        return json({ success: true });
      } catch (err) {
        console.error("cancel_subscription error:", err);
        return json({ error: "Não foi possível cancelar a assinatura." }, 500);
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return json({ error: "Não foi possível processar a solicitação." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
