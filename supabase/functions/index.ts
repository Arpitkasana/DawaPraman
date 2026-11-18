import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { batchNo } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: recall } = await supabase.from('cdsco_recalls').select('*').eq('batch_no', batchNo).single();
  if (recall) {
    return new Response(JSON.stringify({ status: 'red', message: 'Batch recalled by CDSCO', details: recall.reason }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  const { data: batch } = await supabase.from('batches').select('*, medicines(*)').eq('batch_no', batchNo).single();
  if (!batch || !batch.is_genuine) {
    return new Response(JSON.stringify({ status: 'yellow', message: 'Batch not found in manufacturer records' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  const serverTime = new Date().toISOString();
  const payloadToSign = `${batchNo}:${serverTime}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(Deno.env.get('VERIFY_SECRET_KEY')!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadToSign));
  const token = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);

  return new Response(JSON.stringify({ 
    status: 'green', 
    medicine: batch.medicines.brand_name,
    mfg: batch.mfg_date,
    exp: batch.exp_date,
    secureMeta: { timestamp: serverTime, verificationToken: token.toUpperCase() }
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
});
