// src/scripts/create-admin-account.js
// @ts-check
const { PrismaClient } = require("../generated/prisma"); // Path relative to src/scripts/
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config(); // Assumes .env is in the project root

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

async function createAdminAccount() {
  const email = process.argv[2] || "admin@example.com";
  const password = process.argv[3] || "Admin123!";
  const username = process.argv[4] || "admin" + Date.now();

  try {
    console.log(
      `Creating admin account with email: ${email}, username: ${username}`
    );

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        user_metadata: {
          role: "admin",
          username: username,
        },
        email_confirm: true,
      });

    if (authError) {
      throw new Error(
        `Failed to create admin user in Supabase Auth: ${authError.message}`
      );
    }

    console.log(
      "Supabase Auth user created successfully with ID:",
      authUser.user.id
    );

    const existingAdmin = await prisma.admin.findUnique({
      where: { id: authUser.user.id },
    });

    if (existingAdmin) {
      console.log(
        `Admin with ID ${authUser.user.id} (username: ${existingAdmin.username}) already exists in database.`
      );
    } else {
      const admin = await prisma.admin.create({
        data: {
          id: authUser.user.id,
          username: username,
        },
      });
      console.log("Admin record created in database:", admin);
    }

    console.log("\nAdmin account created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Username:", username);
    console.log("Role: admin");
    console.log("\nYou can now log in using these credentials.");
  } catch (error) {
    console.error("Error creating admin account:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminAccount();
