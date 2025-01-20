/*
  # Optimize logs table RLS policy

  1. Changes
    - Drop existing RLS policy that uses auth.uid() for each row
    - Create new optimized policy using subquery for auth.uid()
    - This improves query performance by reducing function calls

  2. Performance Impact
    - Reduces number of auth.uid() function calls
    - Improves query execution time
    - Better scalability for large result sets
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create logs" ON logs;

-- Create optimized policy
CREATE POLICY "Users can create logs"
  ON logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view their own logs" ON logs;

-- Create optimized select policy
CREATE POLICY "Users can view their own logs"
  ON logs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));