import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ FIX 1: GET (?q=) aur POST (body) dono se query lo
    const url = new URL(req.url);
    const qParam = url.searchParams.get("q") || url.searchParams.get("query") || "";
    const body = await req.json().catch(() => ({}));
    const query = (typeof body.query === "string" ? body.query : qParam).trim();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ✅ FIX 2: Sahi column naam - underscore wale
    const { data, error } = await supabase
      .from("medicines")
      .select(
        "id, name, price_inr, is_discontinued, manufacturer_name, pack_size_label, short_composition1, short_composition2"
      )
      .or(`name.ilike.%${query}%,short_composition1.ilike.%${query}%,short_composition2.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;

    return new Response(JSON.stringify(data ?? []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
