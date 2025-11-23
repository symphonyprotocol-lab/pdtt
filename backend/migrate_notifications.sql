-- Migration script to create notifications table
-- Run this SQL directly in your PostgreSQL database

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    target_user_address VARCHAR(128) NOT NULL,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    voucher_detail JSONB NOT NULL,
    delivered BOOLEAN DEFAULT FALSE,
    user_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    accepted_at TIMESTAMP WITHOUT TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id ON notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_address ON notifications(target_user_address);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add comment to table
COMMENT ON TABLE notifications IS 'Stores notifications sent to users when campaigns are started';

