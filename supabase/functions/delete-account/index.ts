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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const userId = user.id;

    // 1. Fetch profile to get stripe_customer_id and role
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, role")
      .eq("id", userId)
      .maybeSingle();

    // 2. Cancel active Stripe subscriptions if any
    if (profile?.stripe_customer_id) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "active",
        });
        for (const sub of subs.data) {
          await stripe.subscriptions.cancel(sub.id);
        }
      } catch (err) {
        console.error("Stripe cancel error:", err);
      }
    }

    // 3. Delete photos from Storage (trainer-photos/{userId}/)
    try {
      const { data: files } = await supabase.storage
        .from("trainer-photos")
        .list(userId);

      if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from("trainer-photos").remove(paths);
      }
    } catch (err) {
      console.error("Storage cleanup error:", err);
    }

    // 4. Delete database rows.
    // Most tables CASCADE from profiles, but some FKs use SET NULL or NO ACTION.
    // We clean up explicitly to be safe, then delete the profile (which cascades
    // to trainers, students, trainer_photos, trainer_availability, etc.)
    // and finally delete the auth user.

    // vouchers.created_by is SET NULL on profiles delete — no action needed.
    // trainers.approved_by is NO ACTION — null it first if this user is an approver.
    await supabase
      .from("trainers")
      .update({ approved_by: null })
      .eq("approved_by", userId);

    // Delete profile (cascades to trainers, students, subscriptions, leads,
    // favorites, reviews, appointments, voucher_redemptions, trainer_schedule_blocks)
    await supabase.from("profiles").delete().eq("id", userId);

    // 5. Delete the auth user
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("Auth user delete error:", deleteErr);
      return json({ error: "Falha ao excluir usuário de autenticação." }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("delete-account error:", err);
    return json({ error: "Não foi possível concluir a exclusão da conta. Tente novamente." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
