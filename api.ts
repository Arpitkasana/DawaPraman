import { validators } from '../lib/validation';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function verifyMedicine(batchNo: string, qrPayload?: string) {
  if (!validators.batchNo(batchNo)) {
    return { status: 'yellow', message: 'Invalid Batch Format' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-medicine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ batchNo, qrPayload })
    });

    if (!res.ok) throw new Error('Backend offline');
    return await res.json(); 
  } catch (error) {
    return { status: 'yellow', message: 'Verification Service Unavailable' };
  }
}

export async function searchMedicines(query: string) {
  if (query.length < 3) return [];
  
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search-medicines?q=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Bearer ${ANON_KEY}` }
  });
  
  if (!res.ok) throw new Error('Search failed');
  return await res.json();
}
