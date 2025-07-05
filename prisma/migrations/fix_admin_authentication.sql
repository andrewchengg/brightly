-- Fix Admin Authentication Issues
-- This addresses the RLS policies that are blocking admin lookups in middleware

-- =============================================================================
-- DROP EXISTING PROBLEMATIC ADMIN POLICIES
-- =============================================================================

-- Drop existing admin policies that may be causing issues
DROP POLICY IF EXISTS "Admins can view own profile" ON "Admin";
DROP POLICY IF EXISTS "Admins can insert admin records" ON "Admin";
DROP POLICY IF EXISTS "Admins can update own profile" ON "Admin";
DROP POLICY IF EXISTS "Service role can manage admins" ON "Admin";

-- =============================================================================
-- CREATE SECURE ADMIN POLICIES
-- =============================================================================

-- Policy 1: Allow authenticated users to check if they are admins
-- This is crucial for the middleware to work properly
CREATE POLICY "Allow admin role verification" ON "Admin"
  FOR SELECT 
  USING (auth.uid()::text = id);

-- Policy 2: Service role can manage all admin records (for admin creation scripts)
CREATE POLICY "Service role can manage admins" ON "Admin"
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy 3: Admins can view their own profile  
CREATE POLICY "Admins can view own profile" ON "Admin"
  FOR SELECT 
  USING (auth.uid()::text = id);

-- Policy 4: Admins can update their own profile
CREATE POLICY "Admins can update own profile" ON "Admin"
  FOR UPDATE 
  USING (auth.uid()::text = id);

-- Policy 5: Allow admin creation for authenticated users (needed for signup flows)
CREATE POLICY "Allow admin creation" ON "Admin"
  FOR INSERT 
  WITH CHECK (auth.uid()::text = id);

-- =============================================================================
-- ENSURE RLS IS ENABLED ON ADMIN TABLE
-- =============================================================================

-- Make sure RLS is enabled on the Admin table
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE HELPER FUNCTION FOR ADMIN VERIFICATION
-- =============================================================================

-- Create a security definer function that can be called by middleware
-- This provides a secure way to check admin status
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    admin_exists BOOLEAN := FALSE;
BEGIN
    -- Check if user exists in Admin table
    SELECT EXISTS(
        SELECT 1 FROM "Admin" 
        WHERE id = user_id::text
    ) INTO admin_exists;
    
    RETURN admin_exists;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO anon;

-- =============================================================================
-- VERIFY POLICIES ARE WORKING
-- =============================================================================

-- Add a comment to document the fix
COMMENT ON TABLE "Admin" IS 'Admin table with RLS policies that allow role verification for middleware';

-- Log the policy update
DO $$ 
BEGIN
    RAISE NOTICE 'Admin RLS policies updated successfully';
END $$; 