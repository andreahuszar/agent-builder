-- Add preferred payment method to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50);

-- Add constraint to validate payment method values
ALTER TABLE vendors
ADD CONSTRAINT check_payment_method CHECK (
  preferred_payment_method IS NULL OR
  preferred_payment_method IN (
    'bank_transfer',
    'check',
    'credit_card',
    'paypal',
    'wire_transfer',
    'cash',
    'ach',
    'eft',
    'bacs',
    'other'
  )
);

-- Add missing fields to vendor_bank_accounts for complete bank details
ALTER TABLE vendor_bank_accounts 
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS sort_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS routing_number VARCHAR(20);

-- Add index for payment method queries
CREATE INDEX IF NOT EXISTS idx_vendors_preferred_payment_method 
ON vendors(preferred_payment_method);

-- Update existing vendors with default payment method based on their bank accounts
UPDATE vendors v
SET preferred_payment_method = 'bank_transfer'
WHERE v.default_bank_account_id IS NOT NULL
  AND v.preferred_payment_method IS NULL;

COMMENT ON COLUMN vendors.preferred_payment_method IS 'Preferred payment method for this vendor';
COMMENT ON COLUMN vendor_bank_accounts.account_name IS 'Account holder/beneficiary name';
COMMENT ON COLUMN vendor_bank_accounts.account_number IS 'Full bank account number (encrypted in production)';
COMMENT ON COLUMN vendor_bank_accounts.sort_code IS 'UK sort code';
COMMENT ON COLUMN vendor_bank_accounts.routing_number IS 'US routing/ABA number';