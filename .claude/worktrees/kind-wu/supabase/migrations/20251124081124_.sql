-- Set default for auto_readiness to true
ALTER TABLE user_settings 
ALTER COLUMN auto_readiness SET DEFAULT true;

-- Update existing users who don't have auto_readiness enabled
UPDATE user_settings 
SET auto_readiness = true 
WHERE auto_readiness = false OR auto_readiness IS NULL;;
