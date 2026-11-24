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

const BATCH_REGEX = /^[A-Z0-9-]{4,24}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = (body.batchNo ?? body.query ?? "").toString().trim();
    const batchNo = rawCode.toUpperCase();

    if (!batchNo) {
      return new Response(
        JSON.stringify({ status: "yellow", message: "Batch number is required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!BATCH_REGEX.test(batchNo)) {
      return new Response(
        JSON.stringify({
          status: "yellow",
          message: "Invalid batch number format (4-24 alphanumeric characters)",
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("PROJECT_SERVICE_ROLE_KEY");
    const verifySecretKey = Deno.env.get("VERIFY_SECRET_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ status: "yellow", message: "Server configuration missing" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Check CDSCO recall list first (ignore if table isn't created yet)
    const { data: recall, error: recallError } = await supabase
      .from("cdsco_recalls")
      .select("*")
      .eq("batch_no", batchNo)
      .maybeSingle();

    if (recallError && recallError.code !== "42P01") {
      console.error("cdsco_recalls error:", recallError);
      return new Response(
        JSON.stringify({
          status: "yellow",
          message: `Recall query error: ${recallError.message}`,
        }),
        { status: 500, headers: jsonHeaders }
      );
    }

    if (recall) {
      return new Response(
        JSON.stringify({
          status: "red",
          message: "Batch recalled by CDSCO",
          details: recall.reason || "Listed in CDSCO recall records",
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 2. Query batches table directly (no FK join dependency)
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("*")
      .eq("batch_no", batchNo)
      .maybeSingle();

    if (batchError) {
      console.error("batches error:", batchError);
      return new Response(
        JSON.stringify({
          status: "yellow",
          message: `Batch query error: ${batchError.message}`,
        }),
        { status: 500, headers: jsonHeaders }
      );
    }

    if (!batch) {
      return new Response(
        JSON.stringify({
          status: "yellow",
          message: "Batch not found in manufacturer records",
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    if (batch.is_genuine === false) {
      return new Response(
        JSON.stringify({
          status: "red",
          message: "Batch flagged as non-genuine in manufacturer records",
          details: batch.notes || "Do not consume this medicine; report to CDSCO.",
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 3. Look up medicine details separately if medicine_id is present
    let medRecord: Record<string, any> | null = null;
    if (batch.medicine_id !== undefined && batch.medicine_id !== null) {
      const { data: med, error: medError } = await supabase
        .from("medicines")
        .select("*")
        .eq("id", batch.medicine_id)
        .maybeSingle();

      if (medError) {
        console.error("medicines lookup error:", medError);
      } else {
        medRecord = med;
      }
    }

    // 4. Generate signed verification token
    const serverTime = new Date().toISOString();
    let verificationToken = "UNVERIFIED-KEY";

    if (verifySecretKey) {
      const payloadToSign = `${batchNo}:${serverTime}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(verifySecretKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadToSign));
      verificationToken = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 12)
        .toUpperCase();
    }

    const medicineName =
      medRecord?.brand_name ?? medRecord?.name ?? batch.medicine_name ?? "Verified Medicine";

    return new Response(
      JSON.stringify({
        status: "green",
        medicineId: batch.medicine_id ?? medRecord?.id,
        batch_no: batch.batch_no ?? batchNo,
        medicine: medicineName,
        manufacturer:
          medRecord?.manufacturer_name ??
          medRecord?.manufacturer ??
          batch.manufacturer_name ??
          "",
        salt_composition:
          medRecord?.short_composition1 ??
          medRecord?.salt_composition ??
          "",
        price: medRecord?.price_inr ?? medRecord?.price ?? null,
        mfg: batch.mfg_date,
        exp: batch.exp_date,
        secureMeta: {
          timestamp: serverTime,
          verificationToken,
        },
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err) {
    console.error("verify-medicines unhandled error:", err);
    return new Response(
      JSON.stringify({ status: "yellow", message: "Unable to complete verification right now" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
