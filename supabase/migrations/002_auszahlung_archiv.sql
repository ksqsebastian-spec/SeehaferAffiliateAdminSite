-- ============================================================
-- Migration: Auszahlung & Archiv workflow
-- - Relax financial/payout constraints
-- - Add telefon to handwerker
-- - Add bankdaten fields to empfehlungen
-- ============================================================

-- 1. Add telefon to handwerker
ALTER TABLE handwerker ADD COLUMN IF NOT EXISTS telefon TEXT;

-- 2. Add bank detail fields to empfehlungen
ALTER TABLE empfehlungen ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE empfehlungen ADD COLUMN IF NOT EXISTS bic TEXT;
ALTER TABLE empfehlungen ADD COLUMN IF NOT EXISTS kontoinhaber TEXT;
ALTER TABLE empfehlungen ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- 3. Relax constraints: allow erledigt without financial data
--    (betrag can be entered on Auszahlung page)
ALTER TABLE empfehlungen DROP CONSTRAINT IF EXISTS chk_financial_data;
ALTER TABLE empfehlungen ADD CONSTRAINT chk_financial_data CHECK (
  (status IN ('offen', 'erledigt')) OR
  (status = 'ausgezahlt' AND rechnungsbetrag IS NOT NULL AND provision_betrag IS NOT NULL)
);

-- 4. Relax payout constraint: paypal_batch_id no longer required
ALTER TABLE empfehlungen DROP CONSTRAINT IF EXISTS chk_payout_data;
ALTER TABLE empfehlungen ADD CONSTRAINT chk_payout_data CHECK (
  (status != 'ausgezahlt') OR
  (ausgezahlt_am IS NOT NULL)
);
