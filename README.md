# MedVerify India - DawAI Suraksha (V2 Secure Architecture)

## Deployment
1. Run `supabase/schema.sql` in your Supabase SQL Editor.
2. Deploy Edge Functions:
   - `supabase functions deploy verify-medicine`
   - `supabase functions deploy search-medicines`
   - `supabase functions deploy whatsapp-webhook`
3. Set secrets in Supabase: `VERIFY_SECRET_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` and deploy frontend to Vercel/Netlify.
