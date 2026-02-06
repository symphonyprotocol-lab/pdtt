-- Insert Dietary Habits Data Collection model developer activity
-- This activity allows users to join data collection by offering their dietary data and earn SYM tokens
-- Run this SQL script in your PostgreSQL database

-- Check if activity already exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM activities 
        WHERE type = 'model_developer' AND title = 'Labeling of dietary habits data collection'
    ) THEN
        INSERT INTO activities (
            id,
            type,
            title,
            description,
            reward_tokens,
            target_count,
            activity_data,
            model_id,
            model_developer_wallet_address,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(), -- Generate UUID for the activity
            'model_developer',
            'Labeling of dietary habits data collection',
            'join this data collection offer your dietary data earn SYM tokens',
            10.0, -- Reward: 10 SYM tokens (can be adjusted)
            1, -- Target: join and provide dietary data
            '{"data_type": "dietary_habits", "data_collection_type": "labeling", "activity_type": "data_collection"}'::jsonb,
            NULL, -- Model ID (can be set later if linked to a specific model)
            NULL, -- Model developer wallet address (can be set later if needed)
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Dietary habits data collection activity inserted successfully';
    ELSE
        RAISE NOTICE 'Dietary habits data collection activity already exists, skipping insert';
    END IF;
END $$;

