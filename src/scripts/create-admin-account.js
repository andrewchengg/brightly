// @ts-check
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env' });

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Supabase admin client with service role key
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Creates an admin account in Supabase and links it to the Admin model in Prisma.
 */
async function createAdminAccount() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'Admin123!';
  const username = process.argv[4] || 'admin' + Date.now(); // Make username unique by default

  try {
    console.log(`Creating admin account with email: ${email}`);
    
    // First, create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { 
        role: 'admin',
        username: username
      },
      email_confirm: true // Automatically confirm the email
    });

    if (authError) {
      throw new Error(`Failed to create admin user in Supabase Auth: ${authError.message}`);
    }

    console.log('Supabase Auth user created successfully with ID:', authUser.user.id);

    // Now create the admin record in Prisma
    // Check if admin already exists in database
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: authUser.user.id }
    });

    if (existingAdmin) {
      console.log(`Admin with ID ${authUser.user.id} already exists in database.`);
    } else {
      const admin = await prisma.admin.create({
        data: {
          id: authUser.user.id,
          username: username
        }
      });
      console.log('Admin record created in database:', admin);
    }

    console.log('\nAdmin account created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: admin');
    console.log('\nYou can now log in using these credentials.');

  } catch (error) {
    console.error('Error creating admin account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminAccount(); 