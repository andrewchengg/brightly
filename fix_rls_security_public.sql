-- =============================================================================
-- SECURE RLS POLICIES FIX (PUBLIC SCHEMA VERSION)
-- =============================================================================
-- This file fixes the security vulnerabilities without requiring auth schema permissions.
-- Instead of creating functions in auth schema, we use direct database lookups.
-- =============================================================================

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
-- CREATE SECURE ADMIN POLICIES (DIRECT LOOKUP VERSION)
-- =============================================================================

-- Secure admin access to students
CREATE POLICY "admin_student_access" ON "Student"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to teachers
CREATE POLICY "admin_teacher_access" ON "Teacher"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to parents
CREATE POLICY "admin_parent_access" ON "Parent"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin management policies for content
CREATE POLICY "admin_content_manage" ON "Subject"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "admin_content_manage" ON "Topic"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "admin_content_manage" ON "Question"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "admin_content_manage" ON "QuestionGroup"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "admin_content_manage" ON "Grade"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to practice sessions
CREATE POLICY "admin_practice_access" ON "PracticeSession"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to results
CREATE POLICY "admin_result_access" ON "Result"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to attendance
CREATE POLICY "admin_attendance_access" ON "Attendance"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin quest management
CREATE POLICY "admin_quest_access" ON "Quest"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "admin_student_quest_access" ON "StudentQuest"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- =============================================================================
-- VERIFY SECURITY FIX
-- =============================================================================

-- Function to verify that no policies reference user_metadata
CREATE OR REPLACE FUNCTION public.verify_rls_security()
RETURNS TABLE(
  table_name TEXT,
  policy_name TEXT,
  has_user_metadata BOOLEAN,
  policy_definition TEXT
)
LANGUAGE SQL
SECURITY DEFINER
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

-- =============================================================================
-- TEST QUERIES
-- =============================================================================

-- Run this to verify the fix (should return no rows)
-- SELECT * FROM public.verify_rls_security();

-- Test if current user is admin (for debugging)
-- SELECT 
--   auth.uid() as current_user_id,
--   EXISTS (
--     SELECT 1 FROM public."Admin" 
--     WHERE id = auth.uid()::text
--   ) as is_admin;

-- =============================================================================
-- INSTRUCTIONS
-- =============================================================================

/*
APPLY THIS FIX:

1. Copy the entire content of this file
2. Paste it into your Supabase SQL Editor
3. Run the script
4. Verify with: SELECT * FROM public.verify_rls_security();
5. Test admin functionality

This version doesn't require auth schema permissions and uses direct 
database lookups instead of functions.
*/ 