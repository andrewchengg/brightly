// Execute cleanup of orphaned users with confirmation
const { PrismaClient } = require("../src/generated/prisma");
const { createClient } = require("@supabase/supabase-js");
const readline = require("readline");
require("dotenv").config();

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function findOrphanedUsers() {
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const admins = await prisma.admin.findMany();
  const teachers = await prisma.teacher.findMany();
  const parents = await prisma.parent.findMany();
  const students = await prisma.student.findMany();

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
        lastSignIn: authUser.last_sign_in_at,
      });
    }
  }

  const recentUsers = orphanedUsers.filter((u) => {
    if (!u.lastSignIn) return false;
    const daysSinceSignIn =
      (Date.now() - new Date(u.lastSignIn).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSignIn <= 30;
  });

  const oldUsers = orphanedUsers.filter((u) => {
    if (!u.lastSignIn) return true;
    const daysSinceSignIn =
      (Date.now() - new Date(u.lastSignIn).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSignIn > 30;
  });

  return { orphanedUsers, recentUsers, oldUsers };
}

async function deleteUser(userId, email) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`❌ Failed to delete ${email}:`, error.message);
    return false;
  }
  console.log(`✅ Deleted: ${email}`);
  return true;
}

async function createRoleRecord(user) {
  const role = user.metadataRole;

  try {
    switch (role) {
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
            schoolLevel: 1,
            level: 1,
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
      `❌ Failed to create ${role} record for ${user.email}:`,
      error.message
    );
    return false;
  }
}

async function executeCleanup() {
  console.log("🧹 ORPHANED USER CLEANUP EXECUTOR");
  console.log("==================================\n");

  const { orphanedUsers, recentUsers, oldUsers } = await findOrphanedUsers();

  if (orphanedUsers.length === 0) {
    console.log("✅ No orphaned users found! System is clean.");
    rl.close();
    return;
  }

  console.log(`Found ${orphanedUsers.length} orphaned users:`);
  console.log(
    `- 🔴 ${oldUsers.length} old/inactive users (candidates for deletion)`
  );
  console.log(
    `- 🟢 ${recentUsers.length} recent users (candidates for role creation)`
  );
  console.log();

  // Show what we'll do
  console.log("📋 CLEANUP PLAN:");
  console.log("-----------------");

  if (oldUsers.length > 0) {
    console.log(`🗑️  DELETE ${oldUsers.length} old users:`);
    oldUsers.slice(0, 3).forEach((user) => {
      const lastSignIn = user.lastSignIn
        ? new Date(user.lastSignIn).toLocaleDateString()
        : "Never";
      console.log(`   - ${user.email} [Last sign in: ${lastSignIn}]`);
    });
    if (oldUsers.length > 3) {
      console.log(`   ... and ${oldUsers.length - 3} more`);
    }
    console.log();
  }

  if (recentUsers.length > 0) {
    console.log(
      `🔗 CREATE ROLE RECORDS for ${recentUsers.length} recent users:`
    );
    recentUsers.forEach((user) => {
      console.log(`   - Create ${user.metadataRole} record for: ${user.email}`);
    });
    console.log();
  }

  // Confirmation
  const proceed = await askQuestion(
    "❓ Do you want to proceed with this cleanup? (yes/no): "
  );

  if (proceed.toLowerCase() !== "yes" && proceed.toLowerCase() !== "y") {
    console.log("❌ Cleanup cancelled.");
    rl.close();
    return;
  }

  console.log("\n🚀 Starting cleanup...\n");

  // Step 1: Delete old users
  if (oldUsers.length > 0) {
    console.log(`🗑️  Deleting ${oldUsers.length} old/inactive users...`);
    let deleteCount = 0;
    for (const user of oldUsers) {
      if (await deleteUser(user.id, user.email)) {
        deleteCount++;
      }
    }
    console.log(`✅ Deleted ${deleteCount}/${oldUsers.length} old users\n`);
  }

  // Step 2: Create role records for recent users
  if (recentUsers.length > 0) {
    console.log(
      `🔗 Creating role records for ${recentUsers.length} recent users...`
    );
    let createCount = 0;
    for (const user of recentUsers) {
      if (user.metadataRole !== "none" && (await createRoleRecord(user))) {
        createCount++;
      }
    }
    console.log(
      `✅ Created ${createCount}/${recentUsers.length} role records\n`
    );
  }

  // Final verification
  console.log("🔍 Verifying cleanup...");
  const { orphanedUsers: remainingOrphans } = await findOrphanedUsers();
  console.log(`📊 Remaining orphaned users: ${remainingOrphans.length}`);

  if (remainingOrphans.length === 0) {
    console.log("🎉 All orphaned users cleaned up successfully!");
  } else {
    console.log(
      "⚠️  Some orphaned users remain. You may want to investigate manually."
    );
    remainingOrphans.forEach((user) => {
      console.log(`   - ${user.email} [Role: ${user.metadataRole}]`);
    });
  }

  rl.close();
}

executeCleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
