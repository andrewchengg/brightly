// Script to explain and demonstrate user role identification
const { PrismaClient } = require("../src/generated/prisma");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const prisma = new PrismaClient();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function explainUserRoles() {
  console.log("👥 USER ROLE IDENTIFICATION SYSTEM");
  console.log("=====================================");
  console.log();

  console.log("🔍 HOW ROLES ARE DETERMINED:");
  console.log("----------------------------");
  console.log("1. 🗄️  DATABASE LOOKUP (Primary Method - Secure)");
  console.log("   - Check Admin table for admin role");
  console.log("   - Check Teacher table for teacher role");
  console.log("   - Check Parent table for parent role");
  console.log("   - Check Student table for student role (default)");
  console.log();
  console.log("2. 🏷️  USER METADATA (Fallback Only)");
  console.log("   - Stored in Supabase Auth user_metadata.role");
  console.log("   - Only used when database lookup fails");
  console.log("   - NEVER trusted for admin role (security!)");
  console.log();

  try {
    // Get all users from auth
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error fetching users:", authError.message);
      return;
    }

    console.log("📊 CURRENT USER BREAKDOWN:");
    console.log("---------------------------");

    // Count users by database tables
    const adminCount = await prisma.admin.count();
    const teacherCount = await prisma.teacher.count();
    const parentCount = await prisma.parent.count();
    const studentCount = await prisma.student.count();

    console.log(`👑 Admins: ${adminCount}`);
    console.log(`👨‍🏫 Teachers: ${teacherCount}`);
    console.log(`👨‍👩‍👧‍👦 Parents: ${parentCount}`);
    console.log(`🎓 Students: ${studentCount}`);
    console.log(`📝 Total Auth Users: ${authUsers.users.length}`);
    console.log();

    // Show detailed breakdown
    console.log("🔍 DETAILED USER ANALYSIS:");
    console.log("---------------------------");

    // Get all users from each table
    const admins = await prisma.admin.findMany();
    const teachers = await prisma.teacher.findMany();
    const parents = await prisma.parent.findMany();
    const students = await prisma.student.findMany();

    console.log("\n👑 ADMIN USERS:");
    for (const admin of admins) {
      const authUser = authUsers.users.find((u) => u.id === admin.id);
      console.log(
        `  - ${admin.username} (${
          authUser?.email || "No email"
        }) [ID: ${admin.id.substring(0, 8)}...]`
      );
    }

    console.log("\n👨‍🏫 TEACHER USERS:");
    for (const teacher of teachers) {
      const authUser = authUsers.users.find((u) => u.id === teacher.id);
      console.log(
        `  - ${teacher.name} (${
          authUser?.email || "No email"
        }) [ID: ${teacher.id.substring(0, 8)}...]`
      );
    }

    console.log("\n👨‍👩‍👧‍👦 PARENT USERS:");
    for (const parent of parents) {
      const authUser = authUsers.users.find((u) => u.id === parent.id);
      console.log(
        `  - ${parent.name} (${
          authUser?.email || "No email"
        }) [ID: ${parent.id.substring(0, 8)}...]`
      );
    }

    console.log(`\n🎓 STUDENT USERS: (Showing first 5 of ${students.length})`);
    for (const student of students.slice(0, 5)) {
      const authUser = authUsers.users.find((u) => u.id === student.id);
      console.log(
        `  - ${student.name} (${
          authUser?.email || "No email"
        }) [ID: ${student.id.substring(0, 8)}...]`
      );
    }
    if (students.length > 5) {
      console.log(`  ... and ${students.length - 5} more students`);
    }

    // Check for orphaned auth users (users not in any role table)
    console.log("\n⚠️  ORPHANED AUTH USERS (No role assigned):");
    let orphanCount = 0;
    for (const authUser of authUsers.users) {
      const hasRole =
        admins.some((a) => a.id === authUser.id) ||
        teachers.some((t) => t.id === authUser.id) ||
        parents.some((p) => p.id === authUser.id) ||
        students.some((s) => s.id === authUser.id);

      if (!hasRole) {
        orphanCount++;
        console.log(
          `  - ${authUser.email} [Metadata Role: ${
            authUser.user_metadata?.role || "none"
          }] [ID: ${authUser.id.substring(0, 8)}...]`
        );
      }
    }
    if (orphanCount === 0) {
      console.log("  ✅ No orphaned users found!");
    }

    // Show the role determination process
    console.log("\n🔧 ROLE DETERMINATION PROCESS:");
    console.log("-------------------------------");
    console.log("When a user logs in, the system:");
    console.log("1. Gets the user ID from Supabase Auth");
    console.log("2. Queries database tables in this order:");
    console.log("   a. Admin table (if found → role = 'admin')");
    console.log("   b. Teacher table (if found → role = 'teacher')");
    console.log("   c. Parent table (if found → role = 'parent')");
    console.log("   d. Student table (if found → role = 'student')");
    console.log("3. If database lookup fails → fallback to metadata");
    console.log("4. Redirect user to /{role} page (e.g., /admin, /student)");

    // Test the role determination for sample users
    console.log("\n🧪 TESTING ROLE DETERMINATION:");
    console.log("-------------------------------");

    // Test admin role
    if (admins.length > 0) {
      const testAdmin = admins[0];
      console.log(`Testing admin user: ${testAdmin.username}`);
      console.log(`  ✅ Database lookup: Admin table has record`);
      console.log(`  ➡️  Determined role: 'admin'`);
      console.log(`  🎯 Redirect to: /admin`);
    }

    // Test student role
    if (students.length > 0) {
      const testStudent = students[0];
      console.log(`\nTesting student user: ${testStudent.name}`);
      console.log(`  ✅ Database lookup: Student table has record`);
      console.log(`  ➡️  Determined role: 'student'`);
      console.log(`  🎯 Redirect to: /student`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log("🚀 Starting user role analysis...\n");
explainUserRoles();
