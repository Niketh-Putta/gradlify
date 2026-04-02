-- Run this script in your Supabase SQL Editor to separate Maths and English mock limits

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_maths_mock_uses INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_maths_mock_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_english_mock_uses INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_english_mock_reset_at TIMESTAMPTZ;

-- Migrate existing generic mock usage to both to be safe
UPDATE profiles
SET 
  daily_maths_mock_uses = daily_mock_uses,
  daily_maths_mock_reset_at = daily_mock_reset_at,
  daily_english_mock_uses = daily_mock_uses,
  daily_english_mock_reset_at = daily_mock_reset_at
WHERE daily_mock_uses > 0;
