-- Supabase SQL Schema & Security Policies

CREATE TABLE medicines ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    brand_name TEXT, 
    salt TEXT, 
    strength TEXT 
);

CREATE TABLE batches ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    medicine_id UUID REFERENCES medicines(id), 
    batch_no TEXT, 
    is_genuine BOOLEAN, 
    mfg_date DATE, 
    exp_date DATE 
);

CREATE TABLE nppa_prices ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    medicine_id UUID REFERENCES medicines(id), 
    max_price DECIMAL 
);

CREATE TABLE cdsco_recalls ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    batch_no TEXT UNIQUE, 
    reason TEXT 
);

-- RLS: strictly lock down tables.
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strictly No Public Access" ON medicines FOR SELECT USING (false);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strictly No Public Access" ON batches FOR SELECT USING (false);
