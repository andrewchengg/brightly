-- =============================================================================
-- FINAL RLS SECURITY FIX - Remove all user_metadata references
-- =============================================================================
-- CRITICAL SECURITY FIX: user_metadata can be edited by end users and should 
-- NEVER be used in Row Level Security (RLS) policies.
-- 
-- This fix replaces ALL user_metadata references with secure database lookups.
-- =============================================================================

-- =============================================================================
-- STEP 1: COMPREHENSIVE DROP OF ALL INSECURE POLICIES
-- =============================================================================

-- First, systematically drop ALL policies that might reference user_metadata
-- This includes all possible variations and naming patterns

-- Drop all Student table admin policies
DROP POLICY IF EXISTS "admin_student_access" ON "Student";
DROP POLICY IF EXISTS "Admins can manage students" ON "Student";
DROP POLICY IF EXISTS "admin_manage_all_students" ON "Student";
DROP POLICY IF EXISTS "secure_admin_student_access" ON "Student";

-- Drop all Teacher table admin policies  
DROP POLICY IF EXISTS "admin_teacher_access" ON "Teacher";
DROP POLICY IF EXISTS "Admins can manage teachers" ON "Teacher";
DROP POLICY IF EXISTS "secure_admin_teacher_access" ON "Teacher";

-- Drop all Parent table admin policies
DROP POLICY IF EXISTS "admin_parent_access" ON "Parent";
DROP POLICY IF EXISTS "Admins can manage parents" ON "Parent";
DROP POLICY IF EXISTS "secure_admin_parent_access" ON "Parent";

-- Drop all educational content admin policies
DROP POLICY IF EXISTS "admin_content_manage" ON "Subject";
DROP POLICY IF EXISTS "secure_admin_subject_access" ON "Subject";
DROP POLICY IF EXISTS "admin_content_manage" ON "Topic";
DROP POLICY IF EXISTS "secure_admin_topic_access" ON "Topic";
DROP POLICY IF EXISTS "admin_content_manage" ON "Question";
DROP POLICY IF EXISTS "secure_admin_question_access" ON "Question";
DROP POLICY IF EXISTS "admin_content_manage" ON "QuestionGroup";
DROP POLICY IF EXISTS "secure_admin_questiongroup_access" ON "QuestionGroup";
DROP POLICY IF EXISTS "admin_content_manage" ON "Grade";
DROP POLICY IF EXISTS "secure_admin_grade_access" ON "Grade";

-- Drop all practice and assessment admin policies
DROP POLICY IF EXISTS "admin_practice_access" ON "PracticeSession";
DROP POLICY IF EXISTS "secure_admin_practice_access" ON "PracticeSession";
DROP POLICY IF EXISTS "admin_result_access" ON "Result";
DROP POLICY IF EXISTS "secure_admin_result_access" ON "Result";
DROP POLICY IF EXISTS "admin_attendance_access" ON "Attendance";
DROP POLICY IF EXISTS "secure_admin_attendance_access" ON "Attendance";

-- Drop all quest system admin policies
DROP POLICY IF EXISTS "admin_quest_access" ON "Quest";
DROP POLICY IF EXISTS "secure_admin_quest_access" ON "Quest";
DROP POLICY IF EXISTS "admin_student_quest_access" ON "StudentQuest";
DROP POLICY IF EXISTS "secure_admin_studentquest_access" ON "StudentQuest";

-- Drop all other admin policies
DROP POLICY IF EXISTS "Admins can manage lessons" ON "Lesson";
DROP POLICY IF EXISTS "secure_admin_lesson_access" ON "Lesson";
DROP POLICY IF EXISTS "Admins can manage events" ON "Event";
DROP POLICY IF EXISTS "secure_admin_event_access" ON "Event";
DROP POLICY IF EXISTS "Admins can manage question reports" ON "QuestionReport";
DROP POLICY IF EXISTS "secure_admin_questionreport_access" ON "QuestionReport";
DROP POLICY IF EXISTS "Admins can manage archived questions" ON "ArchivedOriginalQuestion";
DROP POLICY IF EXISTS "secure_admin_archived_access" ON "ArchivedOriginalQuestion";

-- =============================================================================
-- STEP 2: CREATE SECURE ADMIN POLICIES
-- =============================================================================

-- Secure admin access to students (using database lookup instead of user_metadata)
CREATE POLICY "secure_admin_student_access" ON "Student"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to teachers
CREATE POLICY "secure_admin_teacher_access" ON "Teacher"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to parents
CREATE POLICY "secure_admin_parent_access" ON "Parent"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin management policies for educational content
CREATE POLICY "secure_admin_subject_access" ON "Subject"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "secure_admin_topic_access" ON "Topic"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "secure_admin_question_access" ON "Question"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "secure_admin_questiongroup_access" ON "QuestionGroup"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "secure_admin_grade_access" ON "Grade"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to practice sessions
CREATE POLICY "secure_admin_practice_access" ON "PracticeSession"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to results
CREATE POLICY "secure_admin_result_access" ON "Result"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to attendance
CREATE POLICY "secure_admin_attendance_access" ON "Attendance"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin quest management
CREATE POLICY "secure_admin_quest_access" ON "Quest"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "secure_admin_studentquest_access" ON "StudentQuest"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to lessons
CREATE POLICY "secure_admin_lesson_access" ON "Lesson"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to events
CREATE POLICY "secure_admin_event_access" ON "Event"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to question reports
CREATE POLICY "secure_admin_questionreport_access" ON "QuestionReport"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- Secure admin access to archived questions
CREATE POLICY "secure_admin_archived_access" ON "ArchivedOriginalQuestion"
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public."Admin" 
      WHERE id = (SELECT auth.uid()::text)
    )
  );

-- =============================================================================
-- STEP 3: VERIFICATION QUERIES
-- =============================================================================

-- Check for any remaining vulnerable policies (should return 0)
DO $$ 
DECLARE 
    vulnerable_count integer;
    policy_record RECORD;
BEGIN 
    SELECT COUNT(*) INTO vulnerable_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND (qual LIKE '%user_metadata%' OR with_check LIKE '%user_metadata%');
    
    IF vulnerable_count > 0 THEN
        RAISE WARNING 'WARNING: Still found % policies using user_metadata!', vulnerable_count;
        -- List the vulnerable policies
        FOR policy_record IN 
            SELECT tablename, policyname
            FROM pg_policies 
            WHERE schemaname = 'public'
            AND (qual LIKE '%user_metadata%' OR with_check LIKE '%user_metadata%')
        LOOP
            RAISE WARNING 'Vulnerable policy: %.%', policy_record.tablename, policy_record.policyname;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ SUCCESS: No vulnerable policies found!';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: SUCCESS MESSAGE
-- =============================================================================

DO $$ 
BEGIN 
    RAISE NOTICE '🔒 RLS SECURITY FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ What was fixed:';
    RAISE NOTICE '   • Replaced all insecure user_metadata role checks';
    RAISE NOTICE '   • Admin verification now uses secure database lookups';
    RAISE NOTICE '   • All policies now check the Admin table directly';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️  Security improvement:';
    RAISE NOTICE '   • user_metadata (editable by users) ❌ REMOVED';
    RAISE NOTICE '   • Database table lookup ✅ SECURE';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Verification: Run this query to confirm no vulnerabilities remain:';
    RAISE NOTICE '   SELECT COUNT(*) FROM pg_policies WHERE schemaname = ''public'' AND qual LIKE ''%%user_metadata%%'';';
    RAISE NOTICE '   (Should return 0)';
END $$;

-- =============================================================================
-- INSTRUCTIONS FOR APPLYING THIS FIX
-- =============================================================================

/*
🚨 CRITICAL SECURITY FIX APPLIED 🚨

This file fixes the RLS security vulnerability where user_metadata was being 
used in Row Level Security policies. Since user_metadata can be edited by 
end users, it should NEVER be used for security decisions.

✅ TO APPLY THIS FIX:

1. SUPABASE DASHBOARD METHOD:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste this entire file
   - Click "Run" to execute

2. SUPABASE CLI METHOD:
   - Save this file as a migration
   - Run: supabase db push

3. DIRECT DATABASE ACCESS:
   - If you have direct database access, run this file with psql

⚠️  IMPORTANT: 
   - This fix must be applied to resolve the security vulnerability
   - Test admin functionality after applying to ensure it works correctly
   - All admin operations should continue to work normally

📧 If you encounter any issues, the admin verification is now done by:
   EXISTS (SELECT 1 FROM public."Admin" WHERE id = auth.uid()::text)
   
   Instead of the previous insecure pattern that referenced user_metadata
*/ 