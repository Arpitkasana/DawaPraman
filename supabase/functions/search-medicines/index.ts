import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const query = url.searchParams.get('q');

  if (!query || query.length < 3) {
    return new Response(JSON.stringify({ error: 'Search query must be at least 3 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data, error } = await supabase.from('medicines').select('id, brand_name, salt, strength').ilike('brand_name', `%${query}%`).limit(10);
  if (error) return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: corsHeaders });

  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
});
