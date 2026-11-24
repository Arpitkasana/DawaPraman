import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function escapeOrValue(val: string): string {
  return val.replace(/[,()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
}

// 1. VERIFY - Batch ya Naam se
export async function verifyMedicine(batchNo: string) {
  try {
    const cleanBatch = batchNo.trim().toUpperCase();
    const { data, error } = await supabase.functions.invoke('verify-medicine', {
      body: { query: cleanBatch, batchNo: cleanBatch },
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Verify error:', e);
    return { status: 'yellow', message: 'Verify Nahi Ho Payi' };
  }
}

// 2. SEARCH - Naam OR Composition dono me dhoondho
export async function searchMedicines(query: string) {
  const q = escapeOrValue(query.trim());
  if (q.length < 3) return [];

  const { data, error } = await supabase
    .from('medicines')
    .select(
      'id, name, short_composition1, short_composition2, manufacturer_name, price_inr, is_discontinued'
    )
    .or(
      `name.ilike.%${q}%,short_composition1.ilike.%${q}%,short_composition2.ilike.%${q}%`
    )
    .limit(20);

  if (error) {
    console.error('Search error:', error);
    return [];
  }
  return data || [];
}

// 3. SALT NORMALIZATION & PAIR KEY FOR DRUG INTERACTIONS
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
  const pairKey = buildPairKey(medA, medB);

  const { data, error } = await supabase
    .from('drug_interactions')
    .select('*')
    .eq('pair_key', pairKey)
    .maybeSingle();

  if (error) {
    console.error('Interaction check error:', error);
    return null;
  }

  return data || null;
}

export async function fetchMedicinesForInteraction(query = '') {
  const clean = query.trim();
  if (clean.length >= 2) {
    return await searchMedicines(clean);
  }

  const { data, error } = await supabase
    .from('medicines')
    .select('id, name, short_composition1, short_composition2')
    .limit(50);

  if (error) {
    console.error('Fetch interaction medicines error:', error);
    return [];
  }

  return data || [];
}
