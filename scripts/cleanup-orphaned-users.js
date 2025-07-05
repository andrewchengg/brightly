// Script to cleanup orphaned users (auth accounts without role records)
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

async function findOrphanedUsers() {
  try {
    // Get all users from auth
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error fetching users:", authError.message);
      return [];
    }

    // Get all users from role tables
    const admins = await prisma.admin.findMany();
    const teachers = await prisma.teacher.findMany();
    const parents = await prisma.parent.findMany();
    const students = await prisma.student.findMany();

    // Find orphaned users
    const orphanedUsers = [];
    for (const authUser of authUsers.users) {
      const hasRole =
        admins.some((a) => a.id === authUser.id) ||
        teachers.some((t) => t.id === authUser.id) ||
        parents.some((p) => p.id === authUser.id) ||
        students.some((s) => s.id === authUser.id);

      if (!hasRole) {
        orphanedUsers.push({
          id: authUser.id,
          email: authUser.email,
          metadataRole: authUser.user_metadata?.role || "none",
          username: authUser.user_metadata?.username,
          createdAt: authUser.created_at,
          lastSignIn: authUser.last_sign_in_at,
        });
      }
    }

    return orphanedUsers;
  } catch (error) {
    console.error("❌ Error finding orphaned users:", error);
    return [];
  }
}

async function analyzeOrphanedUsers() {
  console.log("🧹 ORPHANED USER CLEANUP TOOL");
  console.log("==============================");
  console.log();

  const orphanedUsers = await findOrphanedUsers();

  if (orphanedUsers.length === 0) {
    console.log("✅ No orphaned users found! Your system is clean.");
    return;
  }

  console.log(`⚠️  Found ${orphanedUsers.length} orphaned users:`);
  console.log();

  // Group by metadata role
  const byRole = orphanedUsers.reduce((acc, user) => {
    const role = user.metadataRole;
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {});

  // Show breakdown
  for (const [role, users] of Object.entries(byRole)) {
    console.log(`📋 ${role.toUpperCase()} (${users.length} users):`);
    users.forEach((user) => {
      const lastSignIn = user.lastSignIn
        ? new Date(user.lastSignIn).toLocaleDateString()
        : "Never";
      console.log(
        `  - ${
          user.email
        } [Last sign in: ${lastSignIn}] [ID: ${user.id.substring(0, 8)}...]`
      );
    });
    console.log();
  }

  // Analyze activity
  const recentUsers = orphanedUsers.filter((u) => {
    if (!u.lastSignIn) return false;
    const daysSinceSignIn =
      (Date.now() - new Date(u.lastSignIn).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSignIn <= 30; // Signed in within last 30 days
  });

  const oldUsers = orphanedUsers.filter((u) => {
    if (!u.lastSignIn) return true; // Never signed in
    const daysSinceSignIn =
      (Date.now() - new Date(u.lastSignIn).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSignIn > 30;
  });

  console.log("📊 ACTIVITY ANALYSIS:");
  console.log(`🟢 Recent activity (last 30 days): ${recentUsers.length} users`);
  console.log(`🔴 Old/inactive users: ${oldUsers.length} users`);
  console.log();

  return { orphanedUsers, recentUsers, oldUsers, byRole };
}

async function deleteOrphanedUser(userId, email) {
  try {
    console.log(`🗑️  Deleting orphaned user: ${email}`);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`❌ Failed to delete ${email}:`, error.message);
      return false;
    }

    console.log(`✅ Successfully deleted: ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting ${email}:`, error);
    return false;
  }
}

async function createMissingRoleRecord(user) {
  try {
    const role = user.metadataRole;
    console.log(`🔗 Creating ${role} record for: ${user.email}`);

    switch (role) {
      case "admin":
        await prisma.admin.create({
          data: {
            id: user.id,
            username: user.username || user.email.split("@")[0],
          },
        });
        break;

      case "teacher":
        await prisma.teacher.create({
          data: {
            id: user.id,
            username: user.username || user.email.split("@")[0],
            name: user.username || user.email.split("@")[0],
          },
        });
        break;

      case "parent":
        await prisma.parent.create({
          data: {
            id: user.id,
            username: user.username || user.email.split("@")[0],
            name: user.username || user.email.split("@")[0],
            email: user.email,
          },
        });
        break;

      case "student":
        await prisma.student.create({
          data: {
            id: user.id,
            username: user.username || user.email.split("@")[0],
            name: user.username || user.email.split("@")[0],
            email: user.email,
            schoolLevel: 1, // Default
            level: 1, // Default
            xpPoints: 0,
          },
        });
        break;

      default:
        console.log(`⚠️  Unknown role '${role}' for ${user.email} - skipping`);
        return false;
    }

    console.log(`✅ Created ${role} record for: ${user.email}`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to create ${user.metadataRole} record for ${user.email}:`,
      error
    );
    return false;
  }
}

async function runCleanup() {
  console.log("🚀 Starting orphaned user analysis...\n");

  const analysis = await analyzeOrphanedUsers();
  if (!analysis) return;

  const { orphanedUsers, oldUsers, recentUsers } = analysis;

  console.log("🛠️  CLEANUP OPTIONS:");
  console.log("1. 🗑️  Delete all old/inactive users (safer)");
  console.log("2. 🔗 Create missing role records for recent users");
  console.log("3. 🗑️  Delete ALL orphaned users (nuclear option)");
  console.log("4. 📊 Just show analysis (no changes)");
  console.log();

  // For demo purposes, let's show what each option would do
  console.log("💡 RECOMMENDED ACTIONS:");
  console.log();

  if (oldUsers.length > 0) {
    console.log(`🗑️  SAFE DELETE (${oldUsers.length} old users):`);
    oldUsers.slice(0, 5).forEach((user) => {
      const lastSignIn = user.lastSignIn
        ? new Date(user.lastSignIn).toLocaleDateString()
        : "Never";
      console.log(
        `  - Would delete: ${user.email} [Last sign in: ${lastSignIn}]`
      );
    });
    if (oldUsers.length > 5) {
      console.log(`  ... and ${oldUsers.length - 5} more old users`);
    }
    console.log();
  }

  if (recentUsers.length > 0) {
    console.log(`🔗 CREATE RECORDS (${recentUsers.length} recent users):`);
    recentUsers.slice(0, 5).forEach((user) => {
      console.log(
        `  - Would create ${user.metadataRole} record for: ${user.email}`
      );
    });
    if (recentUsers.length > 5) {
      console.log(`  ... and ${recentUsers.length - 5} more recent users`);
    }
    console.log();
  }

  console.log("⚠️  WARNING: This is a DRY RUN. No changes made.");
  console.log(
    "📝 To actually perform cleanup, uncomment the action code below."
  );

  // UNCOMMENT ONE OF THESE TO ACTUALLY PERFORM CLEANUP:

  // Option 1: Delete old users
  // console.log("\n🗑️  Deleting old users...");
  // for (const user of oldUsers) {
  //   await deleteOrphanedUser(user.id, user.email);
  // }

  // Option 2: Create records for recent users
  // console.log("\n🔗 Creating missing records...");
  // for (const user of recentUsers) {
  //   if (user.metadataRole && user.metadataRole !== 'none') {
  //     await createMissingRoleRecord(user);
  //   }
  // }

  // Option 3: Nuclear - delete all
  // console.log("\n💥 NUCLEAR OPTION - Deleting ALL orphaned users...");
  // for (const user of orphanedUsers) {
  //   await deleteOrphanedUser(user.id, user.email);
  // }
}

runCleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
