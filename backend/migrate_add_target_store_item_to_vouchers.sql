-- Migration: Add target_store and target_item columns to user_vouchers table
-- Date: 2025-11-27
-- Description: Adds support for storing target store and target item in user vouchers

-- Add target_store column (nullable)
ALTER TABLE user_vouchers 
ADD COLUMN IF NOT EXISTS target_store TEXT NULL;

-- Add target_item column (nullable)
ALTER TABLE user_vouchers 
ADD COLUMN IF NOT EXISTS target_item TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_vouchers.target_store IS 'Specific store name copied from campaign (e.g., Starbucks)';
COMMENT ON COLUMN user_vouchers.target_item IS 'Specific item/product copied from campaign (e.g., Latte)';
