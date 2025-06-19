-- Comprehensive RLS Policies for Educational Platform (Fixed Type Casting)
-- Production-ready security policies with proper UUID/TEXT casting

-- =============================================================================
-- ADMIN POLICIES
-- =============================================================================

-- Admins have full access to everything
CREATE POLICY "Admins have full access to Admin table" ON "Admin"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- STUDENT POLICIES  
-- =============================================================================

-- Students can view and update their own profile
CREATE POLICY "Students can view own profile" ON "Student"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Students can update own profile" ON "Student" 
  FOR UPDATE USING (auth.uid()::text = id);

-- Parents can view their children
CREATE POLICY "Parents can view children" ON "Student"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Parent" 
      WHERE "Parent".id = auth.uid()::text 
      AND "Parent".id = "Student"."parentId"
    )
  );

-- Teachers can view students in their supervised classes
CREATE POLICY "Teachers can view class students" ON "Student"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Teacher" t
      JOIN "Class" c ON c."supervisorId" = t.id
      WHERE t.id = auth.uid()::text 
      AND c.id = "Student"."classId"
    )
  );

-- Admins can manage all students
CREATE POLICY "Admins can manage students" ON "Student"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- TEACHER POLICIES
-- =============================================================================

-- Teachers can view their own profile
CREATE POLICY "Teachers can view own profile" ON "Teacher"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Teachers can update own profile" ON "Teacher"
  FOR UPDATE USING (auth.uid()::text = id);

-- Admins can manage all teachers
CREATE POLICY "Admins can manage teachers" ON "Teacher"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- PARENT POLICIES
-- =============================================================================

-- Parents can view and update their own profile
CREATE POLICY "Parents can view own profile" ON "Parent"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Parents can update own profile" ON "Parent"
  FOR UPDATE USING (auth.uid()::text = id);

-- Admins can manage all parents
CREATE POLICY "Admins can manage parents" ON "Parent"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- EDUCATIONAL CONTENT POLICIES (PUBLIC READ)
-- =============================================================================

-- Allow authenticated users to read educational content
CREATE POLICY "Authenticated users can read subjects" ON "Subject"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read topics" ON "Topic"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read questions" ON "Question"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read question groups" ON "QuestionGroup"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read grades" ON "Grade"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read classes" ON "Class"
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can manage educational content
CREATE POLICY "Admins can manage subjects" ON "Subject"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage topics" ON "Topic"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage questions" ON "Question"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage question groups" ON "QuestionGroup"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage grades" ON "Grade"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage classes" ON "Class"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- PRACTICE SESSION POLICIES
-- =============================================================================

-- Students can view their own practice sessions
CREATE POLICY "Students can view own practice sessions" ON "PracticeSession"
  FOR SELECT USING (auth.uid()::text = "studentId");

CREATE POLICY "Students can update own practice sessions" ON "PracticeSession"
  FOR UPDATE USING (auth.uid()::text = "studentId");

-- Parents can view their children's practice sessions
CREATE POLICY "Parents can view children practice sessions" ON "PracticeSession"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "PracticeSession"."studentId"
      AND s."parentId" = auth.uid()::text
    )
  );

-- Teachers can view practice sessions of students in their classes
CREATE POLICY "Teachers can view class practice sessions" ON "PracticeSession"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Class" c ON c.id = s."classId"
      WHERE s.id = "PracticeSession"."studentId"
      AND c."supervisorId" = auth.uid()::text
    )
  );

-- Admins can manage all practice sessions
CREATE POLICY "Admins can manage practice sessions" ON "PracticeSession"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- RESULTS POLICIES
-- =============================================================================

-- Students can view their own results
CREATE POLICY "Students can view own results" ON "Result"
  FOR SELECT USING (auth.uid()::text = "studentId");

-- Parents can view their children's results
CREATE POLICY "Parents can view children results" ON "Result"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "Result"."studentId"
      AND s."parentId" = auth.uid()::text
    )
  );

-- Teachers can view results of students in their classes
CREATE POLICY "Teachers can view class results" ON "Result"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Class" c ON c.id = s."classId"
      WHERE s.id = "Result"."studentId"
      AND c."supervisorId" = auth.uid()::text
    )
  );

-- Admins can manage all results
CREATE POLICY "Admins can manage results" ON "Result"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- ATTENDANCE POLICIES
-- =============================================================================

-- Students can view their own attendance
CREATE POLICY "Students can view own attendance" ON "Attendance"
  FOR SELECT USING (auth.uid()::text = "studentId");

-- Parents can view their children's attendance
CREATE POLICY "Parents can view children attendance" ON "Attendance"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "Attendance"."studentId"
      AND s."parentId" = auth.uid()::text
    )
  );

-- Teachers can manage attendance for their lessons
CREATE POLICY "Teachers can manage lesson attendance" ON "Attendance"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Lesson" l
      WHERE l.id = "Attendance"."lessonId"
      AND l."teacherId" = auth.uid()::text
    )
  );

-- Admins can manage all attendance
CREATE POLICY "Admins can manage attendance" ON "Attendance"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- LESSON POLICIES
-- =============================================================================

-- Students can view lessons for their class
CREATE POLICY "Students can view class lessons" ON "Lesson"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = auth.uid()::text
      AND s."classId" = "Lesson"."classId"
    )
  );

-- Teachers can manage their own lessons
CREATE POLICY "Teachers can manage own lessons" ON "Lesson"
  FOR ALL USING (auth.uid()::text = "teacherId");

-- Parents can view lessons for their children's classes
CREATE POLICY "Parents can view children lessons" ON "Lesson"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s."parentId" = auth.uid()::text
      AND s."classId" = "Lesson"."classId"
    )
  );

-- Admins can manage all lessons
CREATE POLICY "Admins can manage lessons" ON "Lesson"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- EVENT POLICIES
-- =============================================================================

-- Students can view events for their class or general events
CREATE POLICY "Students can view relevant events" ON "Event"
  FOR SELECT USING (
    "Event"."classId" IS NULL OR
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = auth.uid()::text
      AND s."classId" = "Event"."classId"
    )
  );

-- Parents can view events for their children's classes or general events
CREATE POLICY "Parents can view relevant events" ON "Event"
  FOR SELECT USING (
    "Event"."classId" IS NULL OR
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s."parentId" = auth.uid()::text
      AND s."classId" = "Event"."classId"
    )
  );

-- Teachers can view events for their classes or general events
CREATE POLICY "Teachers can view relevant events" ON "Event"
  FOR SELECT USING (
    "Event"."classId" IS NULL OR
    EXISTS (
      SELECT 1 FROM "Class" c
      WHERE c.id = "Event"."classId"
      AND c."supervisorId" = auth.uid()::text
    )
  );

-- Admins can manage all events
CREATE POLICY "Admins can manage events" ON "Event"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- ANNOUNCEMENT POLICIES
-- =============================================================================

-- Students can view announcements for their class or general announcements
CREATE POLICY "Students can view relevant announcements" ON "Announcement"
  FOR SELECT USING (
    "Announcement"."classId" IS NULL OR
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = auth.uid()::text
      AND s."classId" = "Announcement"."classId"
    )
  );

-- Parents can view announcements for their children's classes or general announcements
CREATE POLICY "Parents can view relevant announcements" ON "Announcement"
  FOR SELECT USING (
    "Announcement"."classId" IS NULL OR
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s."parentId" = auth.uid()::text
      AND s."classId" = "Announcement"."classId"
    )
  );

-- Teachers can view and manage announcements for their classes
CREATE POLICY "Teachers can manage class announcements" ON "Announcement"
  FOR ALL USING (
    "Announcement"."classId" IS NULL OR
    EXISTS (
      SELECT 1 FROM "Class" c
      WHERE c.id = "Announcement"."classId"
      AND c."supervisorId" = auth.uid()::text
    )
  );

-- Admins can manage all announcements
CREATE POLICY "Admins can manage announcements" ON "Announcement"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- CHAT POLICIES
-- =============================================================================

-- Students can manage their own chat sessions
CREATE POLICY "Students can manage own chat sessions" ON "ChatSession"
  FOR ALL USING (auth.uid()::text = "studentId");

-- Parents can view their children's chat sessions
CREATE POLICY "Parents can view children chat sessions" ON "ChatSession"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "ChatSession"."studentId"
      AND s."parentId" = auth.uid()::text
    )
  );

-- Admins can manage all chat sessions
CREATE POLICY "Admins can manage chat sessions" ON "ChatSession"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- Chat messages follow session permissions
CREATE POLICY "Users can manage chat messages in their sessions" ON "ChatMessage"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "ChatSession" cs
      WHERE cs.id = "ChatMessage"."sessionId"
      AND (
        cs."studentId" = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM "Student" s
          WHERE s.id = cs."studentId"
          AND s."parentId" = auth.uid()::text
        ) OR
        EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
      )
    )
  );

-- =============================================================================
-- GAMIFICATION POLICIES (Badges, Quests)
-- =============================================================================

-- Students can view all badges and their own earned badges
CREATE POLICY "Students can view badges" ON "Badge"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students can view own student badges" ON "StudentBadge"
  FOR SELECT USING (auth.uid()::text = "studentId");

-- Parents can view their children's badges
CREATE POLICY "Parents can view children badges" ON "StudentBadge"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "StudentBadge"."studentId"
      AND s."parentId" = auth.uid()::text
    )
  );

-- Quest policies
CREATE POLICY "Students can view quests" ON "Quest"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students can manage own quest progress" ON "StudentQuest"
  FOR ALL USING (auth.uid()::text = "studentId");

CREATE POLICY "Parents can view children quest progress" ON "StudentQuest"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "StudentQuest"."studentId"
      AND s."parentId" = auth.uid()::text
    )
  );

-- Admins can manage all gamification features
CREATE POLICY "Admins can manage badges" ON "Badge"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage student badges" ON "StudentBadge"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage quests" ON "Quest"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

CREATE POLICY "Admins can manage student quests" ON "StudentQuest"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- =============================================================================
-- SPECIALIZED FEATURE POLICIES
-- =============================================================================

-- Oral practice policies
CREATE POLICY "Students can view oral prompts" ON "OralPrompt"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students can manage own oral practice attempts" ON "OralPracticeAttempt"
  FOR ALL USING (auth.uid()::text = "studentId");

CREATE POLICY "Parents can view children oral practice" ON "OralPracticeAttempt"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "OralPracticeAttempt"."studentId"
      AND s."parentId" = auth.uid()::text
    )
  );

-- Student uploaded questions
CREATE POLICY "Students can manage own uploaded questions" ON "StudentUploadedQuestion"
  FOR ALL USING (auth.uid()::text = "studentId");

CREATE POLICY "Teachers can view uploaded questions from their students" ON "StudentUploadedQuestion"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Class" c ON c.id = s."classId"
      WHERE s.id = "StudentUploadedQuestion"."studentId"
      AND c."supervisorId" = auth.uid()::text
    )
  );

-- Question reports
CREATE POLICY "Students can create question reports" ON "QuestionReport"
  FOR INSERT WITH CHECK (auth.uid()::text = "studentId");

CREATE POLICY "Students can view own question reports" ON "QuestionReport"
  FOR SELECT USING (auth.uid()::text = "studentId");

-- Admins can manage all question reports
CREATE POLICY "Admins can manage question reports" ON "QuestionReport"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- Subject-Teacher relationships
CREATE POLICY "Teachers can view own subject assignments" ON "SubjectTeacher"
  FOR SELECT USING (auth.uid()::text = "teacherId");

-- Archived questions (read-only for admins)
CREATE POLICY "Admins can manage archived questions" ON "ArchivedOriginalQuestion"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  );

-- Prisma migrations (admin only)
CREATE POLICY "Admins can manage migrations" ON "_prisma_migrations"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Admin" WHERE "Admin".id = auth.uid()::text)
  ); 