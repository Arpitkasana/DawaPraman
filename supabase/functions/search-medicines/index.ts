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

    if (rawQuery.length < 2) {
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
    const safeTerm = rawQuery.replace(/[%_,]/g, "");
    const safePattern = `%${safeTerm}%`;

    // Support the richer medicine-catalog schema used by existing deployments.
    const catalogResult = await supabase
      .from("medicines")
      .select("*")
      .or(
        `name.ilike.${safePattern},batch_no.ilike.${safePattern},salt_composition.ilike.${safePattern},short_composition_1.ilike.${safePattern}`
      )
      .limit(25);

    if (!catalogResult.error) {
      return new Response(JSON.stringify({ results: catalogResult.data ?? [] }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // The checked-in schema uses medicines(brand_name, salt, strength) and stores
    // batch numbers separately. Fall back to that schema instead of querying
    // columns that do not exist there.
    const [medicineResult, batchResult] = await Promise.all([
      supabase
        .from("medicines")
        .select("id, brand_name, salt, strength")
        .or(`brand_name.ilike.${safePattern},salt.ilike.${safePattern},strength.ilike.${safePattern}`)
        .limit(25),
      supabase
        .from("batches")
        .select("id, medicine_id, batch_no, mfg_date, exp_date")
        .ilike("batch_no", safePattern)
        .limit(25),
    ]);

    if (medicineResult.error || batchResult.error) {
      const error = medicineResult.error ?? batchResult.error;
      console.error("search-medicines query error:", error);
      return new Response(
        JSON.stringify({ error: error.message, results: [] }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const medicinesById = new Map(
      (medicineResult.data ?? []).map((medicine: any) => [medicine.id, medicine])
    );
    const batchMedicineIds = [...new Set(
      (batchResult.data ?? [])
        .map((batch: any) => batch.medicine_id)
        .filter((id: string | null) => id != null && !medicinesById.has(id))
    )];

    if (batchMedicineIds.length > 0) {
      const { data, error } = await supabase
        .from("medicines")
        .select("id, brand_name, salt, strength")
        .in("id", batchMedicineIds);
      if (error) {
        console.error("search-medicines batch lookup error:", error);
        return new Response(
          JSON.stringify({ error: error.message, results: [] }),
          { status: 500, headers: jsonHeaders }
        );
      }
      for (const medicine of data ?? []) medicinesById.set(medicine.id, medicine);
    }

    const legacyResults = (medicineResult.data ?? []).map((medicine: any) => {
      const batch = (batchResult.data ?? []).find(
        (candidate: any) => candidate.medicine_id === medicine.id
      );
      return {
        ...medicine,
        name: medicine.brand_name,
        salt_composition: medicine.salt,
        short_composition_1: medicine.salt,
        batch_no: batch?.batch_no ?? null,
        mfg_date: batch?.mfg_date ?? null,
        exp_date: batch?.exp_date ?? null,
      };
    });

    const matchedBatchResults = (batchResult.data ?? [])
      .filter((batch: any) => batch.medicine_id != null)
      .map((batch: any) => {
        const medicine: any = medicinesById.get(batch.medicine_id);
        if (!medicine) return null;
        return {
          ...medicine,
          name: medicine.brand_name,
          salt_composition: medicine.salt,
          short_composition_1: medicine.salt,
          batch_no: batch.batch_no,
          mfg_date: batch.mfg_date,
          exp_date: batch.exp_date,
        };
      })
      .filter(Boolean);

    const uniqueResults = new Map<string, any>();
    for (const result of [...legacyResults, ...matchedBatchResults]) {
      uniqueResults.set(`${result.id}:${result.batch_no ?? ""}`, result);
    }

    return new Response(JSON.stringify({ results: [...uniqueResults.values()].slice(0, 25) }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error("search-medicines unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid request", results: [] }),
      { status: 400, headers: jsonHeaders }
    );
  }
});
