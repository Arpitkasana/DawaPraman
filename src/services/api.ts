import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  }

  // Fallback direct query on medicines table if Edge Function is not yet deployed
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
