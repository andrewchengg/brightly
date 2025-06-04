# Admin Setup Guide

This guide walks you through creating an admin account for your EdCel application.

## Prerequisites

1. Your Next.js application should be running
2. Supabase should be properly configured
3. Your environment variables should be properly set

## Environment Variables

Set up your environment variables in `.env.local` (for development) or as environment variables in your deployment platform:

```env
# Server-side Environment Variables (secure, not exposed to client)
# These are the preferred variables for server-side code
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database
DATABASE_URL=your-postgres-database-url

# Cloudinary (API Secret is server-only)
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Client-side Environment Variables (exposed to browser)
# Only include variables that are safe to expose publicly
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name

# Fallback public variables (for backward compatibility)
# In production, prefer using the server-side variables above
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Security Note**: The new server-side variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are preferred over their `NEXT_PUBLIC_` counterparts for server-side API routes as they are not exposed to the client.

## Steps to Create an Admin Account

1. **Navigate to the scripts directory:**

   ```bash
   cd src/scripts
   ```

2. **Run the admin creation script:**

   ```bash
   node create-admin-account.js [email] [password] [username]
   ```

   **Parameters (all optional):**

   - `email`: Admin email address (default: `admin@example.com`)
   - `password`: Admin password (default: `Admin123!`)
   - `username`: Admin username (default: `admin` + timestamp)

   **Examples:**

   ```bash
   # Using defaults
   node create-admin-account.js

   # With custom email
   node create-admin-account.js admin@myschool.edu

   # With custom email and password
   node create-admin-account.js admin@myschool.edu MySecurePassword123!

   # With all custom parameters
   node create-admin-account.js admin@myschool.edu MySecurePassword123! admin_user
   ```

3. **Successful Output:**
   If the script runs successfully, you'll see output like:

   ```
   Creating admin account with email: admin@myschool.edu, username: admin_user
   Supabase Auth user created successfully with ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Admin record created in database: { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', username: 'admin_user' }

   Admin account created successfully!
   Email: admin@myschool.edu
   Password: MySecurePassword123!
   Username: admin_user
   Role: admin

   You can now log in using these credentials.
   ```

## Login

After creating the admin account, you can log in at:

- **URL:** `http://localhost:3000/sign-in` (or your deployed URL)
- **Username:** The username you specified (or the generated one)
- **Password:** The password you specified (or the default one)

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**

   - Ensure your `.env.local` file contains the required Supabase variables
   - Check that the variables are correctly named and have values

2. **"Failed to create admin user in Supabase Auth"**

   - Verify your `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Ensure your Supabase project allows admin user creation
   - Check Supabase project settings and RLS policies

3. **Database connection errors**
   - Verify your `DATABASE_URL` is correct
   - Ensure Prisma schema is synced with your database

### Checking Your Environment

You can verify your environment setup by visiting:

```
http://localhost:3000/api/debug
```

This will show which environment variables are properly configured (without revealing their values).

## Next Steps

Once you have an admin account:

1. Log in to the admin dashboard
2. Set up your school/organization information
3. Create teacher accounts
4. Import or create student data
5. Configure subjects and topics
