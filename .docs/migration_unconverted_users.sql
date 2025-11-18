-- Migration: Add username tracking and unconverted users VIEW
-- Date: 2025-11-17
-- Run this in Supabase SQL Editor

-- Step 1: Add columns to unminted_geoplets table
ALTER TABLE unminted_geoplets
ADD COLUMN username TEXT,
ADD COLUMN cast_sent BOOLEAN DEFAULT FALSE;

-- Step 2: Create index for performance
CREATE INDEX idx_cast_sent ON unminted_geoplets(cast_sent);

-- Step 3: Create VIEW for unconverted users
CREATE VIEW unconverted_users AS
SELECT
  u.fid,
  u.username,
  u.image_data,
  u.created_at as generated_at,
  u.cast_sent
FROM unminted_geoplets u
LEFT JOIN payment_tracking p ON u.fid = p.fid
WHERE p.fid IS NULL        -- User has NOT paid/minted
ORDER BY u.created_at DESC;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'unminted_geoplets'
ORDER BY ordinal_position;

-- Test the VIEW
SELECT COUNT(*) as unconverted_count FROM unconverted_users;
