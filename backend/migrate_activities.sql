-- Migration script to create activities and user_activity_progress tables
-- Run this SQL directly in your PostgreSQL database

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(32) NOT NULL, -- 'daily', 'merchant', 'model_developer'
    title VARCHAR(256) NOT NULL,
    description TEXT NOT NULL,
    reward_tokens DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    target_count INTEGER NOT NULL DEFAULT 1, -- e.g., upload 3 receipts
    activity_data JSONB, -- Additional data specific to activity type
    -- For merchant activities
    merchant_wallet_address VARCHAR(128),
    campaign_id UUID,
    -- For model developer activities
    model_id UUID,
    model_developer_wallet_address VARCHAR(128),
    -- Status and timing
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMP WITHOUT TIME ZONE,
    end_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create user_activity_progress table to track user progress
CREATE TABLE IF NOT EXISTS user_activity_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(128) NOT NULL,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    current_count INTEGER NOT NULL DEFAULT 0,
    target_count INTEGER NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    reward_claimed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, activity_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS ix_activities_is_active ON activities(is_active);
CREATE INDEX IF NOT EXISTS ix_activities_merchant_wallet ON activities(merchant_wallet_address);
CREATE INDEX IF NOT EXISTS ix_activities_model_id ON activities(model_id);
CREATE INDEX IF NOT EXISTS ix_user_activity_progress_wallet ON user_activity_progress(wallet_address);
CREATE INDEX IF NOT EXISTS ix_user_activity_progress_activity ON user_activity_progress(activity_id);
CREATE INDEX IF NOT EXISTS ix_user_activity_progress_completed ON user_activity_progress(is_completed);

