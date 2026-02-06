-- Update Daily Scan activity reward_tokens from 3.0 to 4.0 SYM
-- This fixes the discrepancy where the record showed 3 SYM but users were earning 4 SYM

UPDATE activities
SET 
    reward_tokens = 4.0,
    updated_at = CURRENT_TIMESTAMP
WHERE 
    type = 'daily' 
    AND title = 'Daily Scan';

-- Verify the update
SELECT 
    id,
    type,
    title,
    reward_tokens,
    updated_at
FROM activities
WHERE 
    type = 'daily' 
    AND title = 'Daily Scan';

