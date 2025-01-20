/*
  # Add index to content_versions foreign key

  1. Changes
    - Add index on user_id column in content_versions table to improve query performance
    - This will optimize queries that filter or join on the user_id foreign key

  2. Performance Impact
    - Faster lookups when querying content versions by user
    - Improved JOIN performance when combining with users table
    - Better query plan optimization
*/

-- Add index to user_id foreign key
CREATE INDEX IF NOT EXISTS idx_content_versions_user_id
  ON content_versions (user_id);