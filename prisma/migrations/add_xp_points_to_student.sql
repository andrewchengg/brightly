-- Add XP points column to Student table
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "xp_points" INTEGER DEFAULT 0; 