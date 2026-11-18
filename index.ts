import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET')!;

async function verifyMetaSignature(payload: string, signatureHeader: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = `sha256=${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  return expectedSignature === signatureHeader;
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

  return new Response('OK', { status: 200 });
});
