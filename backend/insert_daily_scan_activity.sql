-- Insert Daily Scan activity
-- This activity allows users to scan receipts daily and earn 1-5 SYM tokens based on data quality
-- Run this SQL script in your PostgreSQL database

-- Check if activity already exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM activities 
        WHERE type = 'daily' AND title = 'Daily Scan'
    ) THEN
        INSERT INTO activities (
            id,
            type,
            title,
            description,
            reward_tokens,
            target_count,
            activity_data,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(), -- Generate UUID for the activity
            'daily',
            'Daily Scan',
            'Daily scan a receipt can be reward SYM Tokens (1 - 5 tokens depend on the data)',
            4.0, -- Average reward (actual reward will be 1-5 based on data quality)
            1, -- Target: scan 1 receipt per day
            '{"reward_range": {"min": 1, "max": 5}, "reward_type": "variable", "activity_type": "scan_receipt"}'::jsonb,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Daily Scan activity inserted successfully';
    ELSE
        RAISE NOTICE 'Daily Scan activity already exists, skipping insert';
    END IF;
END $$;

