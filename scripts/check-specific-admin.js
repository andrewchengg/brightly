// Check specific admin account
const { PrismaClient } = require("../src/generated/prisma");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const prisma = new PrismaClient();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing Supabase environment variables. Please check your .env file."
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkSpecificAdmin() {
  console.log("🔍 Checking admin@example.com account");
  console.log("=====================================");

  try {
    // Check Supabase Auth users
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error fetching auth users:", authError.message);
      return;
    }

    // Find admin@example.com
    const adminExampleUser = authUsers.users.find(
      (u) => u.email === "admin@example.com"
    );

    if (!adminExampleUser) {
      console.log("❌ admin@example.com not found in auth users");
      console.log("📋 Available users with admin role:");
      const adminUsers = authUsers.users.filter(
        (u) => u.user_metadata?.role === "admin"
      );
      adminUsers.forEach((user) => {
        console.log(`  - ${user.email} (ID: ${user.id})`);
      });
      return;
    }

    console.log("✅ Found admin@example.com in auth:");
    console.log(`  - ID: ${adminExampleUser.id}`);
    console.log(`  - Email: ${adminExampleUser.email}`);
    console.log(`  - Role: ${adminExampleUser.user_metadata?.role}`);
    console.log(`  - Username: ${adminExampleUser.user_metadata?.username}`);
    console.log(`  - Created: ${adminExampleUser.created_at}`);

    // Check if this user has a record in Admin table
    const adminRecord = await prisma.admin.findUnique({
      where: { id: adminExampleUser.id },
    });

    if (adminRecord) {
      console.log("✅ Found matching Admin record in database:");
      console.log(`  - ID: ${adminRecord.id}`);
      console.log(`  - Username: ${adminRecord.username}`);
      console.log(`  - Created: ${adminRecord.createdAt}`);
    } else {
      console.log("❌ No matching Admin record found in database!");
      console.log("💡 Creating missing Admin record...");

      try {
        const newAdminRecord = await prisma.admin.create({
          data: {
            id: adminExampleUser.id,
            username: adminExampleUser.user_metadata?.username || "admin",
          },
        });
        console.log("✅ Created Admin record:", newAdminRecord);
      } catch (createError) {
        console.error("❌ Failed to create Admin record:", createError.message);
      }
    }

    // Test the middleware role check for this specific user
    console.log("\n🧪 Testing middleware role check for admin@example.com:");
    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";
    const supabaseRegular = createClient(supabaseUrl, anonKey);

    try {
      const { data: roleCheck, error: roleError } = await supabaseRegular
        .from("Admin")
        .select("id")
        .eq("id", adminExampleUser.id)
        .single();

      if (roleError) {
        console.error(
          "❌ Middleware role check would fail:",
          roleError.message
        );
        console.log(
          "💡 This is why admin@example.com gets redirected to student page!"
        );

        // Let's check what the RLS policies are doing
        console.log("\n🔍 Checking RLS policies for Admin table:");
        const { data: policies, error: policyError } = await supabaseAdmin
          .from("pg_policies")
          .select(
            "policyname, tablename, permissive, roles, cmd, qual, with_check"
          )
          .eq("tablename", "Admin");

        if (policyError) {
          console.error("Error fetching policies:", policyError.message);
        } else {
          console.log("Current RLS policies for Admin table:");
          policies.forEach((policy) => {
            console.log(
              `  - ${policy.policyname}: ${policy.cmd} (${policy.qual})`
            );
          });
        }
      } else {
        console.log("✅ Middleware role check would succeed");
      }
    } catch (err) {
      console.error("❌ Exception in role check:", err);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificAdmin();
