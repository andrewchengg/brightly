-- =============================================================================
-- SECURE RLS POLICIES FIX
-- =============================================================================
-- This file fixes the security vulnerabilities by replacing user_metadata 
-- checks with proper database table lookups.
-- 
-- SECURITY ISSUE: user_metadata can be edited by end users and should never 
-- be used in security contexts like RLS policies.
-- 
-- SOLUTION: Replace user_metadata role checks with database table lookups.
-- =============================================================================

-- First, create a secure function to check if a user is an admin
CREATE OR REPLACE FUNCTION auth.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Admin" 
    WHERE id = user_id::text
  );
$$;

-- =============================================================================
-- DROP ALL EXISTING INSECURE POLICIES
-- =============================================================================

-- Drop all policies that reference user_metadata
DROP POLICY IF EXISTS "admin_student_access" ON "Student";
DROP POLICY IF EXISTS "admin_teacher_access" ON "Teacher";
DROP POLICY IF EXISTS "admin_parent_access" ON "Parent";
DROP POLICY IF EXISTS "admin_content_manage" ON "Subject";
DROP POLICY IF EXISTS "admin_content_manage" ON "Topic";
DROP POLICY IF EXISTS "admin_content_manage" ON "Question";
DROP POLICY IF EXISTS "admin_content_manage" ON "QuestionGroup";
DROP POLICY IF EXISTS "admin_content_manage" ON "Grade";
DROP POLICY IF EXISTS "admin_practice_access" ON "PracticeSession";
DROP POLICY IF EXISTS "admin_result_access" ON "Result";
DROP POLICY IF EXISTS "admin_attendance_access" ON "Attendance";
DROP POLICY IF EXISTS "admin_quest_access" ON "Quest";
DROP POLICY IF EXISTS "admin_student_quest_access" ON "StudentQuest";

-- =============================================================================
-- CREATE SECURE ADMIN POLICIES
-- =============================================================================

-- Secure admin access to students
CREATE POLICY "admin_student_access" ON "Student"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- Secure admin access to teachers
CREATE POLICY "admin_teacher_access" ON "Teacher"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- Secure admin access to parents
CREATE POLICY "admin_parent_access" ON "Parent"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- Secure admin management policies for content
CREATE POLICY "admin_content_manage" ON "Subject"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

CREATE POLICY "admin_content_manage" ON "Topic"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

CREATE POLICY "admin_content_manage" ON "Question"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

CREATE POLICY "admin_content_manage" ON "QuestionGroup"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

CREATE POLICY "admin_content_manage" ON "Grade"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- Secure admin access to practice sessions
CREATE POLICY "admin_practice_access" ON "PracticeSession"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- Secure admin access to results
CREATE POLICY "admin_result_access" ON "Result"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- Secure admin access to attendance
CREATE POLICY "admin_attendance_access" ON "Attendance"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- Secure admin quest management
CREATE POLICY "admin_quest_access" ON "Quest"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

CREATE POLICY "admin_student_quest_access" ON "StudentQuest"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.is_admin()
  );

-- =============================================================================
-- VERIFY SECURITY FIX
-- =============================================================================

-- Function to verify that no policies reference user_metadata
CREATE OR REPLACE FUNCTION verify_rls_security()
RETURNS TABLE(
  table_name TEXT,
  policy_name TEXT,
  has_user_metadata BOOLEAN,
  policy_definition TEXT
)
LANGUAGE SQL
AS $$
  SELECT 
    schemaname||'.'||tablename as table_name,
    policyname as policy_name,
    (qual LIKE '%user_metadata%') as has_user_metadata,
    pg_get_expr(qual, (schemaname||'.'||tablename)::regclass) as policy_definition
  FROM pg_policies 
  WHERE schemaname = 'public'
  AND qual LIKE '%user_metadata%';
$$;

-- Run verification (should return no rows after applying this fix)
-- SELECT * FROM verify_rls_security();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Ensure the auth.is_admin function can be called by RLS policies
GRANT EXECUTE ON FUNCTION auth.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin TO service_role;

-- =============================================================================
-- INSTRUCTIONS FOR APPLYING THIS FIX
-- =============================================================================

/*
To apply this security fix:

1. Run this SQL file in your Supabase SQL Editor
2. Verify the fix by running: SELECT * FROM verify_rls_security();
   (Should return no rows if successful)
3. Test admin functionality to ensure it still works
4. Monitor for any authentication issues

The fix replaces all insecure user_metadata references with secure 
database table lookups using the auth.is_admin() function.

This ensures that admin access is controlled by actual database records
in the Admin table, not by editable user metadata.
*/ 