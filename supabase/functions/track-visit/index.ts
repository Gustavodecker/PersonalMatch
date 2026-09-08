import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const pagePath = body.page_path || "/";
    const referrer = body.referrer || null;
    const userAgent = body.user_agent || req.headers.get("user-agent") || null;
    const visitorId = body.visitor_id || null;
    const sessionId = body.session_id || null;

    // Get IP from request headers (Supabase edge functions expose this)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Parse device info from user agent
    const deviceType = parseDeviceType(userAgent);
    const browser = parseBrowser(userAgent);
    const os = parseOS(userAgent);

    // Geo lookup via free ip-api.com (no key needed, 45 req/min)
    let geo: Record<string, unknown> = {};
    if (ip && ip !== "unknown" && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(
          `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon,timezone,isp`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.status === "success") {
            geo = {
              country: geoData.country,
              country_code: geoData.countryCode,
              region: geoData.regionName,
              city: geoData.city,
              latitude: geoData.lat,
              longitude: geoData.lon,
              timezone: geoData.timezone,
              isp: geoData.isp,
            };
          }
        }
      } catch {
        // Geo lookup failed — continue without it
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("site_visits").insert({
      visitor_id: visitorId,
      ip_address: ip,
      page_path: pagePath,
      referrer,
      user_agent: userAgent,
      device_type: deviceType,
      browser,
      os,
      session_id: sessionId,
      ...geo,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function parseDeviceType(ua: string | null): string {
  if (!ua) return "unknown";
  const lower = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(lower)) return "tablet";
  if (
    /mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(lower)
  )
    return "mobile";
  return "desktop";
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "unknown";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "other";
}

function parseOS(ua: string | null): string {
  if (!ua) return "unknown";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux") && !ua.includes("Android")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "other";
}
