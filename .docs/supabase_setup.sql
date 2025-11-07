-- ============================================
-- Geoplet Supabase Database Setup
-- ============================================
-- This script creates the necessary table for storing unminted geoplet generations
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard

-- ============================================
-- Table: unminted_geoplet
-- ============================================
-- Stores base64 image data for unminted geoplet generations
-- One row per FID (Farcaster ID)
-- Image data is stored as base64 string for exact mint data integrity

CREATE TABLE IF NOT EXISTS unminted_geoplet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL UNIQUE,
  image_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
-- Index on fid for faster lookups by Farcaster ID
CREATE INDEX IF NOT EXISTS idx_unminted_geoplet_fid ON unminted_geoplet(fid);

-- Index on created_at for cleanup queries (future use)
CREATE INDEX IF NOT EXISTS idx_unminted_geoplet_created_at ON unminted_geoplet(created_at);

-- ============================================
-- Comments (Documentation)
-- ============================================
COMMENT ON TABLE unminted_geoplet IS 'Stores base64 image data for unminted geoplet generations. One row per FID. Used to persist generated images before minting.';
COMMENT ON COLUMN unminted_geoplet.id IS 'Primary key (UUID)';
COMMENT ON COLUMN unminted_geoplet.fid IS 'Farcaster ID (unique per user)';
COMMENT ON COLUMN unminted_geoplet.image_data IS 'Base64 encoded WebP image string (format: data:image/webp;base64,...). Stored exactly as generated for minting integrity.';
COMMENT ON COLUMN unminted_geoplet.created_at IS 'Timestamp when generation was saved';

-- ============================================
-- Row Level Security (RLS) - Optional
-- ============================================
-- Enable RLS for additional security (optional for MVP)
-- ALTER TABLE unminted_geoplet ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for API routes)
-- CREATE POLICY "Service role has full access" ON unminted_geoplet
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify table was created successfully
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'unminted_geoplet'
-- ORDER BY ordinal_position;

-- ============================================
-- Test Queries (Optional)
-- ============================================
-- Insert test record
-- INSERT INTO unminted_geoplet (fid, image_data)
-- VALUES (12345, 'data:image/webp;base64,TEST_DATA_HERE')
-- ON CONFLICT (fid) DO UPDATE SET image_data = EXCLUDED.image_data;

-- Select test record
-- SELECT * FROM unminted_geoplet WHERE fid = 12345;

-- Delete test record
-- DELETE FROM unminted_geoplet WHERE fid = 12345;

-- ============================================
-- Cleanup Query (Future Use)
-- ============================================
-- Delete unminted generations older than 30 days
-- DELETE FROM unminted_geoplet
-- WHERE created_at < NOW() - INTERVAL '30 days';
