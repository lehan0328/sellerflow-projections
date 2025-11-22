-- Migration: Fix plan limits override bug
-- Issue: profiles.max_team_members had DEFAULT 1, causing all new signups to inherit 1 instead of using plan base limits
-- Impact: Professional trial users show 0/1 team members instead of 0/5, paid users also affected

-- Step 1: Remove NOT NULL constraint to allow NULL values (which trigger plan base limits)
ALTER TABLE profiles ALTER COLUMN max_team_members DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN max_bank_connections DROP NOT NULL;

-- Step 2: Remove problematic column defaults that override plan limits
ALTER TABLE profiles ALTER COLUMN max_team_members DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN max_bank_connections DROP DEFAULT;

-- Step 3: Reset professional trial users to use plan limit of 5
UPDATE profiles 
SET max_team_members = NULL 
WHERE plan_tier = 'professional' 
  AND trial_end > now()
  AND max_team_members = 1;

-- Step 4: Reset enterprise trial users to use plan limit of 7
UPDATE profiles 
SET max_team_members = NULL
WHERE plan_tier = 'enterprise'
  AND trial_end > now()
  AND max_team_members < 7;

-- Step 5: Reset growing plan users to use plan limit of 2 (future-proofing)
UPDATE profiles 
SET max_team_members = NULL
WHERE plan_tier = 'growing'
  AND max_team_members <= 2;

-- Step 6: Set correct limits for admin-overridden enterprise users (tier1/tier2/tier3)
UPDATE profiles 
SET max_team_members = 7
WHERE plan_override IN ('tier1', 'tier2', 'tier3')
  AND max_team_members < 7
  AND plan_override_reason IS NOT NULL;

-- Step 7: Add column comments for documentation
COMMENT ON COLUMN profiles.max_team_members IS 'Admin override for max team members. NULL = use plan base limit from usePlanLimits. Set explicitly only for addon purchases or custom admin overrides.';
COMMENT ON COLUMN profiles.max_bank_connections IS 'Admin override for max bank connections. NULL = use plan base limit from usePlanLimits. Set explicitly only for addon purchases or custom admin overrides.';