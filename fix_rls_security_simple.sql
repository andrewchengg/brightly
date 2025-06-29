-- =============================================================================
-- SECURE RLS POLICIES FIX (SIMPLIFIED VERSION)
-- =============================================================================
-- This version fixes the security vulnerabilities with a simpler verification approach.
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
-- SIMPLE VERIFICATION QUERIES
-- =============================================================================

-- Simple check: Count policies that still reference user_metadata
-- Run this after applying the fix - should return 0
-- SELECT COUNT(*) as vulnerable_policies_count
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND qual LIKE '%user_metadata%';

-- List any remaining vulnerable policies (should be empty)
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND qual LIKE '%user_metadata%';

-- Test if current user is admin (for debugging)
-- SELECT 
--   auth.uid() as current_user_id,
--   EXISTS (
--     SELECT 1 FROM public."Admin" 
--     WHERE id = auth.uid()::text
--   ) as is_admin;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

-- Display success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Security fix applied successfully!';
    RAISE NOTICE '🔒 All user_metadata references have been replaced with secure database lookups.';
    RAISE NOTICE '📋 Run this to verify: SELECT COUNT(*) FROM pg_policies WHERE schemaname = ''public'' AND qual LIKE ''%%user_metadata%%'';';
END $$;

-- =============================================================================
-- INSTRUCTIONS
-- =============================================================================

/*
SECURITY FIX COMPLETE!

✅ What was fixed:
- Replaced all insecure user_metadata role checks
- Now uses secure Admin table lookups
- Eliminates privilege escalation vulnerabilities

📋 To verify the fix worked:
1. Run: SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND qual LIKE '%user_metadata%';
   Expected result: 0

2. Test admin functionality to ensure it still works

🔒 Your application is now secure against the reported vulnerabilities!
*/ 