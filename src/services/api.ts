const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

const fnHeaders = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const restHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export async function verifyMedicine(batchNo: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-medicines`, {
      method: 'POST',
      headers: fnHeaders,
      body: JSON.stringify({ batchNo }),
    });
    return await res.json();
  } catch {
    return {
      status: 'yellow',
      message: 'Unable to reach verification server.',
    };
  }
}

export async function searchMedicines(query: string) {
  const clean = query.trim();
  if (!clean || !SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/search-medicines`, {
      method: 'POST',
      headers: fnHeaders,
      body: JSON.stringify({ query: clean }),
    });

    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data?.results ?? data?.medicines ?? [];
    }
  } catch {
    // Fall through to REST fallback below
  }

  const safePattern = encodeURIComponent(`*${clean.replace(/[*(),]/g, '')}*`);
  const restRes = await fetch(
    `${SUPABASE_URL}/rest/v1/medicines?name=ilike.${safePattern}&select=name,price_inr,is_discontinued,manufacturer_name,type,pack_size_label,short_composition1,short_composition2,batch_no,mfg_date,exp_date,nppa_ceiling_price&limit=20`,
    { headers: restHeaders }
  );

  if (!restRes.ok) return [];
  const rows = await restRes.json();
  return Array.isArray(rows) ? rows : [];
}

export function normalizeSalt(raw: string): string {
  const primarySegment = raw.split(/[+/]/)[0] ?? raw;
  return primarySegment
    .toUpperCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:MG|MCG|G|GM|ML|IU|%)\b/g, ' ')
    .replace(
      /\b(?:TABLET|TABLETS|TAB|CAPSULE|CAPSULES|CAP|SYRUP|INJECTION|INJ|DROPS|OINTMENT|CREAM|GEL|SR|ER|XR|DS|PLUS|FORTE|IP|USP|BP)\b/g,
      ' '
    )
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPairKey(drugA: string, drugB: string): string {
  const [first, second] = [normalizeSalt(drugA), normalizeSalt(drugB)].sort();
  return `${first}|${second}`;
}

export async function checkDrugInteraction(medA: string, medB: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const pairKey = buildPairKey(medA, medB);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/drug_interactions?pair_key=eq.${encodeURIComponent(
      pairKey
    )}&select=*`,
    { headers: restHeaders }
  );

  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function fetchMedicinesForInteraction(query = '') {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const clean = query.trim();
  if (clean.length >= 2) {
    return await searchMedicines(clean);
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/medicines?select=name,short_composition1,short_composition2,batch_no&limit=50`,
    { headers: restHeaders }
  );

  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}