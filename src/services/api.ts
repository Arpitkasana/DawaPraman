import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function verifyMedicine(batchNo: string) {
  const { data, error } = await supabase.functions.invoke('verify-medicine', {
    body: { batchNo },
  });

  if (error) {
    return {
      status: 'yellow',
      message: error.message || 'Unable to verify batch right now.',
    };
  }

  return data;
}

export async function searchMedicines(query: string) {
  const cleaned = query.trim();
  if (cleaned.length < 2) return [];

  const { data, error } = await supabase.functions.invoke('search-medicines', {
    body: { query: cleaned },
  });

  if (!error && data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.medicines)) return data.medicines;
  }

  const pattern = `%${cleaned.replace(/[%_,]/g, '')}%`;
  const { data: rows, error: dbError } = await supabase
    .from('medicines')
    .select('*')
    .or(`name.ilike.${pattern},batch_no.ilike.${pattern}`)
    .limit(25);

  if (dbError) {
    throw new Error(dbError.message);
  }

  return rows ?? [];
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
