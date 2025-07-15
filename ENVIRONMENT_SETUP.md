# Environment Setup Guide

## Fix the Supabase Configuration Error

You're getting this error because the Supabase environment variables are not configured. Follow these steps to fix it:

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/_/settings/api
2. Copy these values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Step 2: Create Environment File

Create a `.env.local` file in your project root with the following content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional: Service Role Key (for admin operations)
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Site URL (update this for your domain)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 3: Replace Placeholder Values

Replace the placeholder values with your actual Supabase credentials:

- `your-supabase-project-url-here` → Your actual Supabase project URL
- `your-supabase-anon-key-here` → Your actual Supabase anon key

### Step 4: Restart Your Development Server

After creating the `.env.local` file, restart your development server:

```bash
npm run dev
# or
yarn dev
```

## Example .env.local File

Here's what your `.env.local` file should look like (with example values):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjQ5NjAwMCwiZXhwIjoxOTUyMDcyMDAwfQ.example
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Important Notes

- The `.env.local` file is automatically ignored by git (it's in `.gitignore`)
- Never commit your actual Supabase credentials to version control
- For production, set these environment variables in your hosting platform (Vercel, Netlify, etc.)

## Troubleshooting

If you still get the error after setting up the environment variables:

1. Make sure the `.env.local` file is in the project root (same level as `package.json`)
2. Restart your development server completely
3. Check that the environment variable names are exactly as shown (case-sensitive)
4. Verify your Supabase credentials are correct 