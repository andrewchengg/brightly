// Debug script to check admin authentication issues
const { PrismaClient } = require("../src/generated/prisma");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const prisma = new PrismaClient();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error(
    "Missing Supabase environment variables. Please check your .env file."
  );
  process.exit(1);
}

// Create both admin and regular clients
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const supabaseRegular = createClient(supabaseUrl, anonKey);

async function debugAdminAuth() {
  console.log("🔍 Debugging Admin Authentication");
  console.log("================================");

  try {
    // 1. Check all admin records in database
    console.log("\n1. Checking Admin records in database:");
    const admins = await prisma.admin.findMany();
    console.log(`Found ${admins.length} admin records:`, admins);

    if (admins.length === 0) {
      console.log("❌ No admin records found in database!");
      console.log("💡 You may need to create an admin account first.");
      return;
    }

    // 2. Check Supabase Auth users
    console.log("\n2. Checking Supabase Auth users:");
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error fetching auth users:", authError.message);
    } else {
      console.log(`Found ${authUsers.users.length} auth users`);
      const adminUsers = authUsers.users.filter(
        (user) => user.user_metadata?.role === "admin"
      );
      console.log(
        `Admin users in auth:`,
        adminUsers.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.user_metadata?.role,
          username: u.user_metadata?.username,
        }))
      );
    }

    // 3. Test database queries with regular client (simulating middleware)
    console.log("\n3. Testing database queries with regular client:");
    for (const admin of admins) {
      console.log(`\nTesting admin ID: ${admin.id}`);

      try {
        const { data: adminRecord, error } = await supabaseRegular
          .from("Admin")
          .select("id")
          .eq("id", admin.id)
          .single();

        if (error) {
          console.error(`❌ Error querying admin ${admin.id}:`, error.message);
        } else if (adminRecord) {
          console.log(`✅ Successfully found admin record:`, adminRecord);
        } else {
          console.log(`❌ Admin record not found for ID: ${admin.id}`);
        }
      } catch (err) {
        console.error(`❌ Exception querying admin ${admin.id}:`, err);
      }
    }

    // 4. Test RLS policies
    console.log("\n4. Testing RLS policies:");
    const testUserId = admins[0]?.id;
    if (testUserId) {
      try {
        // Test with service role
        const { data: serviceRoleResult, error: serviceRoleError } =
          await supabaseAdmin
            .from("Admin")
            .select("id")
            .eq("id", testUserId)
            .single();

        console.log(
          "Service role query result:",
          serviceRoleResult ? "✅ SUCCESS" : "❌ FAILED"
        );
        if (serviceRoleError)
          console.log("Service role error:", serviceRoleError.message);

        // Test with anon key
        const { data: anonResult, error: anonError } = await supabaseRegular
          .from("Admin")
          .select("id")
          .eq("id", testUserId)
          .single();

        console.log(
          "Anon key query result:",
          anonResult ? "✅ SUCCESS" : "❌ FAILED"
        );
        if (anonError) console.log("Anon key error:", anonError.message);
      } catch (err) {
        console.error("❌ Exception testing RLS:", err);
      }
    }

    // 5. Check if any admin can authenticate
    console.log("\n5. Testing admin authentication simulation:");
    const testAdmin = admins[0];
    if (testAdmin) {
      // Find corresponding auth user
      const authUser = authUsers?.users.find((u) => u.id === testAdmin.id);
      if (authUser) {
        console.log(`Testing auth for admin: ${authUser.email}`);

        // Simulate the middleware role check
        try {
          const { data: roleCheck, error: roleError } = await supabaseRegular
            .from("Admin")
            .select("id")
            .eq("id", authUser.id)
            .single();

          if (roleError) {
            console.error(
              "❌ Middleware role check would fail:",
              roleError.message
            );
            console.log(
              "💡 This explains why admin is redirected to student page!"
            );
          } else {
            console.log("✅ Middleware role check would succeed");
          }
        } catch (err) {
          console.error("❌ Exception in role check:", err);
        }
      } else {
        console.log("❌ No matching auth user found for admin record");
      }
    }

    console.log("\n📋 Summary:");
    console.log("- Admin records in database:", admins.length);
    console.log(
      "- Auth users with admin role:",
      authUsers?.users.filter((u) => u.user_metadata?.role === "admin")
        .length || 0
    );
    console.log("- RLS policies may be blocking admin queries");
  } catch (error) {
    console.error("❌ Debug script error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAdminAuth();
