-- Migration: Add target_store and target_item columns to campaigns table
-- Date: 2025-11-27
-- Description: Adds support for specifying target store and target item when creating campaigns

-- Add target_store column (nullable)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS target_store TEXT NULL;

-- Add target_item column (nullable)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS target_item TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.target_store IS 'Specific store name if user specifies (e.g., Starbucks, Target)';
COMMENT ON COLUMN campaigns.target_item IS 'Specific item/product if user specifies (e.g., Latte, iPhone)';
