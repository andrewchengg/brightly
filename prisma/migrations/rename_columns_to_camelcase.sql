-- Rename columns in Student table from snake_case to camelCase
ALTER TABLE "Student" RENAME COLUMN "current_streak" TO "currentStreak";
ALTER TABLE "Student" RENAME COLUMN "last_activity_date" TO "lastActivityDate";
ALTER TABLE "Student" RENAME COLUMN "longest_streak" TO "longestStreak";

-- Ensure xpPoints is in camelCase
ALTER TABLE "Student" RENAME COLUMN "xp_points" TO "xpPoints"; 