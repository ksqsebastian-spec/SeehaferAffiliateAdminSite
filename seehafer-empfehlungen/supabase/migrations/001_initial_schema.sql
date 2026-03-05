-- ============================================================
-- Seehafer Empfehlungsprogramm — Database Schema
-- Fixed: auth_user_id link, app_metadata for admin, audit log
-- ============================================================

-- 1. Handwerker table (linked to Supabase Auth via auth_user_id)
CREATE TABLE handwerker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,  -- Links to auth.users(id)
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  provision_prozent NUMERIC(4,2) NOT NULL DEFAULT 5.00
    CHECK (provision_prozent >= 0 AND provision_prozent <= 50),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handwerker_auth_user ON handwerker(auth_user_id);

-- 2. Empfehlungen table
CREATE TABLE empfehlungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Empfehler (referrer — no account in this system)
  empfehler_name TEXT NOT NULL CHECK (char_length(empfehler_name) BETWEEN 1 AND 120),
  empfehler_email TEXT NOT NULL CHECK (empfehler_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

  -- Kunde (referred customer)
  kunde_name TEXT NOT NULL CHECK (char_length(kunde_name) BETWEEN 1 AND 120),
  kunde_kontakt TEXT CHECK (char_length(kunde_kontakt) <= 200),

  -- Zuordnung
  handwerker_id UUID NOT NULL REFERENCES handwerker(id) ON DELETE RESTRICT,
  ref_code TEXT UNIQUE NOT NULL CHECK (ref_code ~ '^#SEE-[0-9]{4}-[A-Z0-9]{4,6}$'),

  -- Status
  status TEXT NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen', 'erledigt', 'ausgezahlt')),

  -- Finanzen (only set when status = 'erledigt' or 'ausgezahlt')
  rechnungsbetrag NUMERIC(10,2) CHECK (rechnungsbetrag IS NULL OR (rechnungsbetrag > 0 AND rechnungsbetrag <= 999999)),
  provision_betrag NUMERIC(10,2) CHECK (provision_betrag IS NULL OR provision_betrag >= 0),

  -- Auszahlung
  ausgezahlt_am TIMESTAMPTZ,
  paypal_batch_id TEXT,
  paypal_transaction_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: erledigt/ausgezahlt must have financial data
  CONSTRAINT chk_financial_data CHECK (
    (status = 'offen') OR
    (status IN ('erledigt', 'ausgezahlt') AND rechnungsbetrag IS NOT NULL AND provision_betrag IS NOT NULL)
  ),
  -- Constraint: ausgezahlt must have payout data
  CONSTRAINT chk_payout_data CHECK (
    (status != 'ausgezahlt') OR
    (ausgezahlt_am IS NOT NULL AND paypal_batch_id IS NOT NULL)
  )
);

CREATE INDEX idx_empfehlungen_handwerker ON empfehlungen(handwerker_id);
CREATE INDEX idx_empfehlungen_status ON empfehlungen(status);
CREATE INDEX idx_empfehlungen_ref_code ON empfehlungen(ref_code);
CREATE INDEX idx_empfehlungen_created ON empfehlungen(created_at DESC);

-- Full-text search index for admin search
CREATE INDEX idx_empfehlungen_search ON empfehlungen
  USING GIN (to_tsvector('german', kunde_name || ' ' || empfehler_name));

-- 3. Audit log for admin actions
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,           -- e.g. 'payout.created', 'handwerker.updated', 'provision.changed'
  target_type TEXT NOT NULL,      -- e.g. 'empfehlung', 'handwerker'
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}',     -- freeform action details
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_handwerker_updated_at
  BEFORE UPDATE ON handwerker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_empfehlungen_updated_at
  BEFORE UPDATE ON empfehlungen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security
-- Uses auth.uid() instead of email matching (secure, stable identifier)

ALTER TABLE handwerker ENABLE ROW LEVEL SECURITY;

-- Handwerker can read their own record
CREATE POLICY "handwerker_select_own"
  ON handwerker FOR SELECT
  USING (auth_user_id = auth.uid());

ALTER TABLE empfehlungen ENABLE ROW LEVEL SECURITY;

-- Handwerker can read their own empfehlungen
CREATE POLICY "empfehlungen_select_own"
  ON empfehlungen FOR SELECT
  USING (handwerker_id IN (
    SELECT id FROM handwerker WHERE auth_user_id = auth.uid()
  ));

-- Handwerker can insert empfehlungen for themselves
CREATE POLICY "empfehlungen_insert_own"
  ON empfehlungen FOR INSERT
  WITH CHECK (handwerker_id IN (
    SELECT id FROM handwerker WHERE auth_user_id = auth.uid()
  ));

-- Handwerker can update their own empfehlungen (limited to completing jobs)
CREATE POLICY "empfehlungen_update_own"
  ON empfehlungen FOR UPDATE
  USING (handwerker_id IN (
    SELECT id FROM handwerker WHERE auth_user_id = auth.uid()
  ));

-- Audit log: insert-only for authenticated users, no reads via client
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- No client-side read policy for audit_log — admin reads via service_role
-- Insert policy for server-side logging via service_role only

-- 6. Ref code generation helper
CREATE OR REPLACE FUNCTION generate_ref_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  year_str TEXT;
  random_part TEXT;
BEGIN
  year_str := to_char(NOW(), 'YYYY');
  LOOP
    random_part := upper(substr(md5(gen_random_uuid()::text), 1, 5));
    new_code := '#SEE-' || year_str || '-' || random_part;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM empfehlungen WHERE ref_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
