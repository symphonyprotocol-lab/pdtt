-- Migration script to create models table
-- Run this SQL directly in your PostgreSQL database

-- Create models table if it doesn't exist
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(128) NOT NULL,
    name VARCHAR(256) NOT NULL,
    abbreviation VARCHAR(32) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(128) NOT NULL,
    rank INTEGER NOT NULL DEFAULT 0,
    used_times INTEGER NOT NULL DEFAULT 0,
    reward_tokens DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    accuracy DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    parameters INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add abbreviation column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'models' 
        AND column_name = 'abbreviation'
    ) THEN
        ALTER TABLE models 
        ADD COLUMN abbreviation VARCHAR(32) NOT NULL DEFAULT '';
        RAISE NOTICE 'Added abbreviation column to models table';
    ELSE
        RAISE NOTICE 'abbreviation column already exists';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_models_wallet_address ON models(wallet_address);
CREATE INDEX IF NOT EXISTS ix_models_category ON models(category);
CREATE INDEX IF NOT EXISTS ix_models_rank ON models(rank);

