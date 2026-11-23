const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const fnHeaders = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export async function verifyMedicine(batchNo: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-medicine`, {
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
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search-medicines`, {
    method: 'POST',
    headers: fnHeaders,
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return Array.isArray(data) ? data : data?.results ?? data?.medicines ?? [];
}

export function normalizeSalt(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:MG|MCG|G|GM|ML|IU|%)\b/g, ' ')
    .replace(
      /\b(?:TABLET|TABLETS|TAB|CAPSULE|CAPSULES|CAP|SYRUP|INJECTION|INJ|DROPS|OINTMENT|CREAM|GEL|SR|ER|XR|DS|PLUS|FORTE|IP|USP|BP)\b/g,
      ' '
    )
    .replace(/[^A-Z0-9+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPairKey(drugA: string, drugB: string): string {
  const [first, second] = [normalizeSalt(drugA), normalizeSalt(drugB)].sort();
  return `${first}|${second}`;
}

export async function checkDrugInteraction(medA: string, medB: string) {
  const pairKey = buildPairKey(medA, medB);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/drug_interactions?pair_key=eq.${encodeURIComponent(
      pairKey
    )}&select=*`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function fetchMedicinesForInteraction(query = '') {
  const clean = query.trim();
  if (clean.length >= 2) {
    return await searchMedicines(clean);
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/medicines?select=id,name,short_composition1,short_composition2&limit=50`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}
