import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawQuery = (body.query ?? body.q ?? "").toString().trim();
    const safeQuery = rawQuery.replace(/[,()[\]%_]/g, " ").replace(/\s+/g, " ").trim();

    if (safeQuery.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("PROJECT_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing", results: [] }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("medicines")
      .select(
        "name, price_inr, is_discontinued, manufacturer_name, type, pack_size_label, short_composition1, short_composition2, batch_no, mfg_date, exp_date, nppa_ceiling_price"
      )
      .or(
        `name.ilike.%${safeQuery}%,short_composition1.ilike.%${safeQuery}%,short_composition2.ilike.%${safeQuery}%`
      )
      .limit(20);

    if (error) {
      console.error("search-medicines query error:", error);
      return new Response(
        JSON.stringify({ error: error.message, results: [] }),
        { status: 500, headers: jsonHeaders }
      );
    }

    return new Response(JSON.stringify({ results: data ?? [] }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error("search-medicines unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid request or server error", results: [] }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
