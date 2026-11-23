import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const search = (body.search ?? url.searchParams.get("search") ?? "").toString().trim();
    const page = Math.max(1, Number(body.page ?? url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(body.pageSize ?? url.searchParams.get("pageSize") ?? 50)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("PROJECT_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), { status: 500, headers: jsonHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Existing deployments may store batch_no directly on medicines.
    const catalog = await supabase
      .from("medicines")
      .select("id,name,brand_name,batch_no,mfg_date,exp_date,salt_composition,short_composition_1", { count: "exact" })
      .not("batch_no", "is", null)
      .neq("batch_no", "")
      .range(from, to)
      .order("batch_no", { ascending: true });

    if (!catalog.error) {
      let rows = catalog.data ?? [];
      if (search) {
        const term = search.toLowerCase();
        rows = rows.filter((row: any) =>
          [row.batch_no, row.name, row.brand_name, row.salt_composition, row.short_composition_1]
            .some((value) => value?.toString().toLowerCase().includes(term))
        );
      }
      const result = rows.map((row: any) => ({
        batch_no: row.batch_no,
        medicine_name: row.name || row.brand_name || "Verified Medicine",
        mfg_date: row.mfg_date ?? null,
        exp_date: row.exp_date ?? null,
      }));
      return new Response(JSON.stringify({
        batches: result,
        page,
        pageSize,
        total: search ? result.length : (catalog.count ?? result.length),
      }), { status: 200, headers: jsonHeaders });
    }

    // Checked-in schema: batches references medicines.
    let batchQuery = supabase
      .from("batches")
      .select("id,medicine_id,batch_no,mfg_date,exp_date,is_genuine", { count: "exact" })
      .not("batch_no", "is", null)
      .neq("batch_no", "")
      .order("batch_no", { ascending: true })
      .range(from, to);

    if (search) {
      batchQuery = batchQuery.ilike("batch_no", `%${search.replace(/[%,]/g, "")}%`);
    }

    const batchResult = await batchQuery;
    if (batchResult.error) {
      return new Response(JSON.stringify({ error: batchResult.error.message, batches: [] }), { status: 500, headers: jsonHeaders });
    }

    const batches = batchResult.data ?? [];
    const ids = [...new Set(batches.map((b: any) => b.medicine_id).filter(Boolean))];
    let medicines: any[] = [];
    if (ids.length) {
      const medicineResult = await supabase
        .from("medicines")
        .select("id,name,brand_name,salt,strength")
        .in("id", ids);
      if (medicineResult.error) {
        return new Response(JSON.stringify({ error: medicineResult.error.message, batches: [] }), { status: 500, headers: jsonHeaders });
      }
      medicines = medicineResult.data ?? [];
    }

    const medicineById = new Map(medicines.map((medicine: any) => [medicine.id, medicine]));
    const result = batches
      .filter((batch: any) => batch.is_genuine !== false)
      .map((batch: any) => {
        const medicine: any = medicineById.get(batch.medicine_id);
        return {
          batch_no: batch.batch_no,
          medicine_name: medicine?.name || medicine?.brand_name || "Verified Medicine",
          mfg_date: batch.mfg_date ?? null,
          exp_date: batch.exp_date ?? null,
        };
      });

    return new Response(JSON.stringify({
      batches: result,
      page,
      pageSize,
      total: batchResult.count ?? result.length,
    }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Invalid request", batches: [] }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
});
