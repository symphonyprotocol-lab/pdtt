-- Insert Luckin Coffee merchant activity
-- This activity allows users to buy a Luckin Coffee latte, upload receipt, and earn 30 SYM tokens
-- Run this SQL script in your PostgreSQL database

-- Check if activity already exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM activities 
        WHERE type = 'merchant' AND title = 'Buy Luckin Coffee Earn Tokens'
    ) THEN
        INSERT INTO activities (
            id,
            type,
            title,
            description,
            reward_tokens,
            target_count,
            activity_data,
            merchant_wallet_address,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(), -- Generate UUID for the activity
            'merchant',
            'Buy Luckin Coffee Earn Tokens',
            'buy one luckin latte and upload receipt can get SYM token reward 30 tokens',
            30.0, -- Reward: 30 SYM tokens
            1, -- Target: buy 1 latte and upload receipt
            '{"merchant_name": "Luckin Coffee", "product": "latte", "activity_type": "purchase_and_upload"}'::jsonb,
            NULL, -- Merchant wallet address (can be set later if needed)
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Luckin Coffee activity inserted successfully';
    ELSE
        RAISE NOTICE 'Luckin Coffee activity already exists, skipping insert';
    END IF;
END $$;

