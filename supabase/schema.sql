-- Supabase SQL Schema & Security Policies for DawaPraman

CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_name TEXT,
  salt TEXT,
  strength TEXT,
  short_composition1 TEXT,
  short_composition2 TEXT,
  manufacturer_name TEXT,
  price_inr NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  is_genuine BOOLEAN NOT NULL DEFAULT true,
  mfg_date DATE,
  exp_date DATE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_batches_batch_no ON public.batches (batch_no);

CREATE TABLE IF NOT EXISTS public.nppa_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
  max_price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cdsco_recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_no TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_key TEXT UNIQUE NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  summary_en TEXT NOT NULL,
  summary_hi TEXT NOT NULL,
  advice_en TEXT,
  advice_hi TEXT
);

-- Enable RLS across all tables
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nppa_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cdsco_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;

-- Lock down sensitive/verification tables so Edge Functions (service_role) access them
DROP POLICY IF EXISTS "Strictly No Public Access" ON public.medicines;
CREATE POLICY "Strictly No Public Access"
  ON public.medicines
  FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "Strictly No Public Access" ON public.batches;
CREATE POLICY "Strictly No Public Access"
  ON public.batches
  FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "Strictly No Public Access" ON public.nppa_prices;
CREATE POLICY "Strictly No Public Access"
  ON public.nppa_prices
  FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "Strictly No Public Access" ON public.cdsco_recalls;
CREATE POLICY "Strictly No Public Access"
  ON public.cdsco_recalls
  FOR SELECT
  USING (false);

-- Allow public read access on drug_interactions for the Drug Interaction Checker
DROP POLICY IF EXISTS "Public Read Drug Interactions" ON public.drug_interactions;
CREATE POLICY "Public Read Drug Interactions"
  ON public.drug_interactions
  FOR SELECT
  USING (true);
