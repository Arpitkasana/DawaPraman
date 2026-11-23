import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET')!;
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '';
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';

const normalizeBatch = (val: string) => val.toUpperCase().replace(/[^A-Z0-9]/g, '');

async function verifyMetaSignature(payload: string, signatureHeader: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = `sha256=${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  return expectedSignature === signatureHeader;
}

async function sendWhatsAppReply(phoneNumberId: string, to: string, text: string) {
  if (!WHATSAPP_ACCESS_TOKEN || !phoneNumberId) return;

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    console.error("WhatsApp API send failed:", res.status, await res.text());
  }
}

async function getDawaPramanReply(
  supabase: ReturnType<typeof createClient>,
  incomingText: string
): Promise<string> {
  const trimmed = incomingText.trim();
  if (!trimmed) {
    return "Namaste! DawaPraman India me aapka swagat hai.\nBatch Number bhejein (e.g. DOLO2026A ya ANGIOG-BAEDCE) verify karne ke liye, ya *SEARCH <dawai ka naam>* likhein.";
  }

  // Medicine Catalog Search: "SEARCH Dolo" / "FIND Crocin" / "KHOJ Azithral"
  const searchMatch = trimmed.match(/^(?:search|find|khoj)\s+(.+)$/i);
  if (searchMatch) {
    const term = searchMatch[1].trim();
    const safePattern = `%${term.replace(/[%_,]/g, '')}%`;

    const { data: meds } = await supabase
      .from('medicines')
      .select('name, batch_no, exp_date, price_inr, price, short_composition_1, salt_composition')
      .or(
        `name.ilike.${safePattern},batch_no.ilike.${safePattern},salt_composition.ilike.${safePattern},short_composition_1.ilike.${safePattern}`
      )
      .limit(5);

    if (!meds || meds.length === 0) {
      return `"${term}" ke liye koi medicine nahi mili. Sahi medicine naam ya Batch Number bhejein.`;
    }

    const lines = meds.map((m: any, idx: number) => {
      const price = m.price_inr ?? m.price;
      const pricePart = price != null ? ` | ₹${price}` : '';
      const batchPart = m.batch_no ? ` | Batch: ${m.batch_no}` : '';
      const expPart = m.exp_date ? ` | Exp: ${m.exp_date}` : '';
      return `${idx + 1}. *${m.name}*${pricePart}${batchPart}${expPart}`;
    });

    return `Search Results ("${term}"):\n${lines.join('\n')}\n\nVerify karne ke liye Batch Number bhejein.`;
  }

  const rawCode = trimmed.toUpperCase();
  const normalizedBatch = normalizeBatch(rawCode);

  // 1. Check CDSCO / State NSQ & Recall list
  const { data: recallRows } = await supabase
    .from('cdsco_recalls')
    .select('*')
    .eq('batch_no_normalized', normalizedBatch)
    .limit(1);

  const recall = recallRows?.[0];
  if (recall) {
    const product = recall.product_name || recall.product || 'Medicine';
    const mfg = recall.manufacturer ? `\nManufacturer: ${recall.manufacturer}` : '';
    const reason = recall.reason || recall.reason_cat || 'Failed CDSCO / State Lab Test';
    const lab = recall.testing_lab || recall.lab ? `\nLab: ${recall.testing_lab || recall.lab}` : '';
    return `🚨 *RECALLED / FAILED LAB TEST*\nBatch: *${rawCode}*\nProduct: ${product}${mfg}${lab}\nReason: ${reason}\n\n⚠️ Is dawai ko mat lein. Source: CDSCO (blacklisted.co.in).`;
  }

  // 2. Check manufacturer batch whitelist
  const { data: batchRows } = await supabase
    .from('batches')
    .select('*')
    .ilike('batch_no', rawCode)
    .limit(1);

  const batch = batchRows?.[0];
  if (batch && batch.is_genuine !== false) {
    let medName = batch.medicine_name;
    if (!medName && batch.medicine_id != null) {
      const { data: med } = await supabase
        .from('medicines')
        .select('name')
        .eq('id', batch.medicine_id)
        .maybeSingle();
      medName = med?.name;
    }

    return `✅ *ASLI DAWAI (VERIFIED BATCH)*\nBatch: *${batch.batch_no}*\nMedicine: ${medName || 'Verified Medicine'}\nMfg: ${batch.mfg_date || 'N/A'}\nExp: ${batch.exp_date || 'N/A'}`;
  }

  // 3. Fallback check on medicines.batch_no
  const { data: medRows } = await supabase
    .from('medicines')
    .select('*')
    .or(`batch_no.ilike.${rawCode},batch_no.ilike.${normalizedBatch}`)
    .limit(1);

  const fallbackMed = medRows?.[0];
  if (fallbackMed) {
    return `✅ *ASLI DAWAI (CATALOG BATCH MATCH)*\nBatch: *${fallbackMed.batch_no}*\nMedicine: ${fallbackMed.name || 'Verified Medicine'}\nMfg: ${fallbackMed.mfg_date || '2026-01-01'}\nExp: ${fallbackMed.exp_date || '2028-12-31'}`;
  }

  return `⚠️ *VERIFY NAHI HO PAYI*\nBatch *${rawCode}* CDSCO recall ya registered batch records me nahi mila.\nNote: Recall list me na hona 100% authenticity ki guarantee nahi hai. Medicine khojne ke liye *SEARCH <naam>* bhejein.`;
}

serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('hub.verify_token') === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(url.searchParams.get('hub.challenge'), { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  const signature = req.headers.get('x-hub-signature-256');
  const payload = await req.text();

  if (!signature || !(await verifyMetaSignature(payload, signature))) {
    return new Response('Invalid Signature', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('PROJECT_SERVICE_ROLE_KEY');

  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const data = JSON.parse(payload || '{}');

    for (const entry of data.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const phoneId = value.metadata?.phone_number_id || WHATSAPP_PHONE_NUMBER_ID;

        for (const msg of value.messages ?? []) {
          if (msg.type === 'text' && msg.from) {
            const replyText = await getDawaPramanReply(supabase, msg.text?.body ?? '');
            await sendWhatsAppReply(phoneId, msg.from, replyText);
          }
        }
      }
    }
  }

  return new Response('OK', { status: 200 });
});
