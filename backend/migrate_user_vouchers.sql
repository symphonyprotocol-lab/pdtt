-- Migration script to create user_vouchers table
-- Run this SQL directly in your PostgreSQL database

CREATE TABLE IF NOT EXISTS user_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(128) NOT NULL,
    notification_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    voucher_detail JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'wait_to_user', -- wait_to_user, accepted, declined, used, expired
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITHOUT TIME ZONE,
    declined_at TIMESTAMP WITHOUT TIME ZONE,
    used_at TIMESTAMP WITHOUT TIME ZONE,
    expired_at TIMESTAMP WITHOUT TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_vouchers_wallet_address ON user_vouchers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_notification_id ON user_vouchers(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_campaign_id ON user_vouchers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_status ON user_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_created_at ON user_vouchers(created_at DESC);

-- Add comment to table
COMMENT ON TABLE user_vouchers IS 'Stores vouchers that users have accepted from notifications';

