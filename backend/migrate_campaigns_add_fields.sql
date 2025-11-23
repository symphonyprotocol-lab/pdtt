-- Migration script to add coupon_used and stopped_at columns to campaigns table
-- Run this SQL directly in your PostgreSQL database

-- Add coupon_used column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'coupon_used'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN coupon_used INTEGER DEFAULT 0;
        RAISE NOTICE 'Added coupon_used column to campaigns table';
    ELSE
        RAISE NOTICE 'coupon_used column already exists';
    END IF;
END $$;

-- Add stopped_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'stopped_at'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN stopped_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE 'Added stopped_at column to campaigns table';
    ELSE
        RAISE NOTICE 'stopped_at column already exists';
    END IF;
END $$;

