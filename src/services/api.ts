import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. VERIFY - Batch ya Naam se
export async function verifyMedicine(batchNo: string) {
  try {
    const { data, error } = await supabase.functions.invoke('verify-medicine', {
      body: { query: batchNo, batchNo: batchNo },
    });
    if (error) throw error;
    return data;
  } catch (e) {
    return { status: 'yellow', message: 'Verify Nahi Ho Payi' };
  }
}

// 2. SEARCH - ✅ YAHAN FIX HAI
export async function searchMedicines(query: string) {
  const q = query.trim();
  if (q.length < 3) return [];

  // Naam OR Composition dono me dhoondho
  const { data, error } = await supabase
    .from('medicines')
    .select('id, name, short_composition_1, short_composition_2, manufacturer_name, price_inr, pack_size_label, is_discontinued')
    .or(`name.ilike.%${q}%,short_composition_1.ilike.%${q}%,short_composition_2.ilike.%${q}%`)
    .limit(20);

  if (error) {
    console.error('Search error:', error);
    return [];
  }
  return data || [];
}
