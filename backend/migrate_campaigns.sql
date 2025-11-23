-- Migration script to add target_wallet_addresses column to campaigns table
-- Run this SQL directly in your PostgreSQL database

-- Check if column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'target_wallet_addresses'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN target_wallet_addresses JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added target_wallet_addresses column to campaigns table';
    ELSE
        RAISE NOTICE 'target_wallet_addresses column already exists';
    END IF;
END $$;

