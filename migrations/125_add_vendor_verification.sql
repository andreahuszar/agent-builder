-- Migration: Add vendor verification status
-- Description: Adds is_verified field to vendors table to track whether vendors are in master data
-- Author: Claude
-- Date: 2025-09-04

-- Add is_verified column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Set existing vendors as verified (assuming they are already in master data)
-- This updates all vendors that existed before this migration
UPDATE vendors 
SET is_verified = true 
WHERE is_verified = false OR is_verified IS NULL;

-- Add index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_vendors_is_verified ON vendors(is_verified);

-- Add comment to document the column
COMMENT ON COLUMN vendors.is_verified IS 'Indicates if vendor is verified in master vendor data. False means vendor was auto-created from invoice and needs verification.';