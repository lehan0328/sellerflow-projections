-- Step 0: Drop existing index if it exists
DROP INDEX IF EXISTS unique_vendor_name_per_user;

-- Step 1: Reassign transactions from duplicate vendors to the oldest vendor
WITH vendor_groups AS (
  SELECT 
    user_id,
    LOWER(name) as normalized_name,
    MIN(created_at) as oldest_created_at
  FROM vendors
  GROUP BY user_id, LOWER(name)
  HAVING COUNT(*) > 1
),
oldest_vendors AS (
  SELECT v.id as keep_id, v.user_id, LOWER(v.name) as normalized_name
  FROM vendors v
  INNER JOIN vendor_groups vg 
    ON v.user_id = vg.user_id 
    AND LOWER(v.name) = vg.normalized_name 
    AND v.created_at = vg.oldest_created_at
),
duplicate_vendors AS (
  SELECT v.id as duplicate_id, v.user_id, LOWER(v.name) as normalized_name
  FROM vendors v
  INNER JOIN vendor_groups vg 
    ON v.user_id = vg.user_id 
    AND LOWER(v.name) = vg.normalized_name
  WHERE v.id NOT IN (SELECT keep_id FROM oldest_vendors)
)
UPDATE transactions t
SET vendor_id = ov.keep_id
FROM duplicate_vendors dv
INNER JOIN oldest_vendors ov 
  ON dv.user_id = ov.user_id 
  AND dv.normalized_name = ov.normalized_name
WHERE t.vendor_id = dv.duplicate_id;

-- Step 2: Delete duplicate vendors
WITH vendor_groups AS (
  SELECT 
    user_id,
    LOWER(name) as normalized_name,
    MIN(created_at) as oldest_created_at
  FROM vendors
  GROUP BY user_id, LOWER(name)
  HAVING COUNT(*) > 1
),
oldest_vendors AS (
  SELECT v.id as keep_id
  FROM vendors v
  INNER JOIN vendor_groups vg 
    ON v.user_id = vg.user_id 
    AND LOWER(v.name) = vg.normalized_name 
    AND v.created_at = vg.oldest_created_at
)
DELETE FROM vendors
WHERE id IN (
  SELECT v.id
  FROM vendors v
  INNER JOIN vendor_groups vg 
    ON v.user_id = vg.user_id 
    AND LOWER(v.name) = vg.normalized_name
  WHERE v.id NOT IN (SELECT keep_id FROM oldest_vendors)
);

-- Step 3: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX unique_vendor_name_per_user 
ON vendors(user_id, LOWER(name));