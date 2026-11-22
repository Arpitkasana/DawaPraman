import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeComposition(comp1?: string | null, comp2?: string | null): string {
  return [comp1 ?? "", comp2 ?? ""]
    .join(" ")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9+/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const query = (body.query || body.batchNo || "").toString().trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Lookup medicine in catalog (`med`)
    let { data: med } = await supabase
      .from("medicines")
      .select("*")
      .ilike("name", query)
      .limit(1)
      .maybeSingle();

    if (!med) {
      const fallback = await supabase
        .from("medicines")
        .select("*")
        .ilike("name", `%${query}%`)
        .limit(1)
        .maybeSingle();
      med = fallback.data;
    }

    if (!med) {
      return new Response(
        JSON.stringify({ status: "yellow", message: "Medicine not found in catalog" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check medicine composition against banned_drugs
    const normalizedComp = normalizeComposition(med.short_composition1, med.short_composition2);

    const { data: bannedRows } = await supabase
      .from("banned_drugs")
      .select("sr_no, drug_rule, notification_info, required_salts, match_mode, legal_note");

    const matchedBan = (bannedRows ?? []).find((rule) => {
      const salts: string[] = Array.isArray(rule.required_salts) ? rule.required_salts : [];
      if (!salts.length) return false;
      if (rule.match_mode === "any") {
        return salts.some((salt) => normalizedComp.includes(salt.toLowerCase()));
      }
      return salts.every((salt) => normalizedComp.includes(salt.toLowerCase()));
    });

    // 3. Single `status` declaration before returning JSON
    const status = matchedBan
      ? "red"
      : med.is_discontinued
        ? "yellow"
        : "green";

    const serverTime = new Date().toISOString();

    return new Response(
      JSON.stringify({
        status,
        medicine: med.name,
        bannedMatch: matchedBan ?? null,
        details: {
          manufacturer: med.manufacturer_name,
          composition1: med.short_composition1,
          composition2: med.short_composition2,
          packSize: med.pack_size_label,
          priceInr: med.price_inr,
          isDiscontinued: med.is_discontinued,
        },
        secureMeta: { timestamp: serverTime, verificationToken: "VERIFIED" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ status: "yellow", message: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
