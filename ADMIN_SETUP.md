# Admin Account Setup Guide

This guide explains how to create administrator accounts for your application using Supabase authentication.

## Prerequisites

Before creating an admin account, make sure you have:

1. Set up your Supabase project correctly
2. Added the necessary environment variables to your `.env` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Run the database migrations using Prisma

## Creating an Admin Account

### Option 1: Using the Command Line Script (Recommended)

We've created a script to automatically create an admin account with the proper role metadata in Supabase:

```bash
# Default admin account (admin@example.com / Admin123!)
npm run create-admin

# Custom admin account
npm run create-admin your-email@example.com your-password
```

This script will:
1. Create a user in Supabase Auth with the role metadata set to "admin"
2. Create a corresponding entry in the Admin table in your database
3. Automatically confirm the email address

### Option 2: Manual Creation

You can also create an admin account manually:

1. Go to your Supabase dashboard: https://app.supabase.com/
2. Navigate to Authentication > Users
3. Click "Add User"
4. Enter the email and password
5. Set the metadata to: `{"role": "admin"}`
6. Set "Email Confirmation" to "Confirmed"
7. Save the user

After creating the user in Supabase Auth, you'll need to manually add an entry to the Admin table in your database:

```sql
INSERT INTO "Admin" (id, username) 
VALUES ('user-id-from-supabase', 'admin');
```

## How Admin Role Works

The admin role provides access to all routes and features in the application. When a user signs in:

1. Their role is read from the user metadata in Supabase
2. If the role is "admin", they get access to all admin features
3. The middleware routes user requests based on their role

## Troubleshooting

If you encounter issues with admin access:

1. Check if the user exists in Supabase Auth with the correct metadata
2. Verify there's a corresponding record in the Admin table
3. Make sure your environment variables are set correctly
4. Check that the user's email is confirmed

For more help, refer to the Supabase documentation on authentication and user management. 