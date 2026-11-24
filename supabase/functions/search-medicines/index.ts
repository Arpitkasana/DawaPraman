import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeOrTerm(input: string): string {
  // Strip characters that break PostgREST .or(...) filter syntax
  return input.replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const qParam = url.searchParams.get("q") || url.searchParams.get("query") || "";
    const body = await req.json().catch(() => ({}));
    const rawQuery = typeof body.query === "string" ? body.query : qParam;
    const query = sanitizeOrTerm(rawQuery.trim());

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("medicines")
      .select(
        "id, name, price_inr, is_discontinued, manufacturer_name, pack_size_label, short_composition1, short_composition2"
      )
      .or(
        `name.ilike.%${query}%,short_composition1.ilike.%${query}%,short_composition2.ilike.%${query}%`
      )
      .limit(20);

    if (error) {
      console.error("Supabase query error:", error);
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data ?? []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unhandled search-medicines error:", e);
    const message = e instanceof Error ? e.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
