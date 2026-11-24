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

const normalizeBatch = (val: string) => val.toUpperCase().replace(/[^A-Z0-9]/g, "");

async function signToken(secret: string, rawCode: string, serverTime: string) {
  if (!secret) return "UNVERIFIED-KEY";
  const payloadToSign = `${rawCode}:${serverTime}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadToSign));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 12)
    .toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = (body.batchNo ?? body.query ?? "").toString().trim().toUpperCase();
    const normalizedBatch = normalizeBatch(rawCode);

    if (!normalizedBatch) {
      return new Response(
        JSON.stringify({ status: "yellow", message: "Batch number is required" }),
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

    // 1. Check CDSCO / State NSQ & Recall list
    const { data: recallRows, error: recallError } = await supabase
      .from("cdsco_recalls")
      .select("*")
      .eq("batch_no_normalized", normalizedBatch)
      .limit(1);

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

    const recall = recallRows?.[0];
    if (recall) {
      const detailParts = [
        recall.product_name || recall.product,
        recall.manufacturer ? `Mfg: ${recall.manufacturer}` : null,
        recall.reason || recall.reason_cat || "Flagged in CDSCO lab/recall alert",
        recall.testing_lab || recall.lab ? `Lab: ${recall.testing_lab || recall.lab}` : null,
        "Source: CDSCO, compiled by blacklisted.co.in",
      ].filter(Boolean);

      return new Response(
        JSON.stringify({
          status: "red",
          message: "Failed CDSCO Lab Test / Recalled Batch",
          details: detailParts.join(" • "),
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 2. Check manufacturer batch whitelist
    const { data: batchRows, error: batchError } = await supabase
      .from("batches")
      .select("*")
      .ilike("batch_no", rawCode)
      .limit(1);

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

    const batch = batchRows?.[0];
    if (batch && batch.is_genuine !== false) {
      const serverTime = new Date().toISOString();
      const verificationToken = await signToken(verifySecretKey, rawCode, serverTime);

      return new Response(
        JSON.stringify({
          status: "green",
          medicineId: batch.medicine_id,
          medicine: batch.medicine_name ?? "Verified Medicine",
          mfg: batch.mfg_date,
          exp: batch.exp_date,
          secureMeta: {
            timestamp: serverTime,
            verificationToken,
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 3. Fallback check on medicines.batch_no
    const { data: medBatchRows, error: medBatchError } = await supabase
      .from("medicines")
      .select("*")
      .or(`batch_no.ilike.${rawCode},batch_no.ilike.${normalizedBatch}`)
      .limit(1);

    if (medBatchError) {
      console.error("medicines batch lookup error:", medBatchError);
    }

    const fallbackMed = medBatchRows?.[0];
    if (fallbackMed) {
      const serverTime = new Date().toISOString();
      const verificationToken = await signToken(verifySecretKey, rawCode, serverTime);

      return new Response(
        JSON.stringify({
          status: "green",
          medicine: fallbackMed.name ?? "Verified Medicine",
          mfg: fallbackMed.mfg_date ?? "2026-01-01",
          exp: fallbackMed.exp_date ?? "2028-12-31",
          secureMeta: {
            timestamp: serverTime,
            verificationToken,
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        status: "yellow",
        message:
          "Not found in CDSCO failed/recalled batch records or registered manufacturer batches. Absence from a recall list does not guarantee authenticity.",
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err) {
    console.error("verify-medicine unhandled error:", err);
    return new Response(
      JSON.stringify({ status: "yellow", message: "Invalid request payload" }),
      { status: 400, headers: jsonHeaders }
    );
  }
});
