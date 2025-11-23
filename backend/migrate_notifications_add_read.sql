-- Migration script to add read and read_at columns to notifications table
-- Run this SQL directly in your PostgreSQL database

-- Add read column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN read BOOLEAN DEFAULT FALSE;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        
        RAISE NOTICE 'Added read column to notifications table';
    ELSE
        RAISE NOTICE 'read column already exists';
    END IF;
END $$;

-- Add read_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN read_at TIMESTAMP WITHOUT TIME ZONE;
        
        RAISE NOTICE 'Added read_at column to notifications table';
    ELSE
        RAISE NOTICE 'read_at column already exists';
    END IF;
END $$;

