# Security Fixes for Supabase Warnings

This document explains how to fix the security warnings identified by the Supabase database linter.

## Issues Identified

1. **Function Search Path Mutable** - The `check_rls_performance` function had a mutable search_path which poses a security risk
2. **Leaked Password Protection Disabled** - Supabase Auth leaked password protection was disabled

## Fixes Applied

### 1. Function Search Path Fix

**Issue**: `Function public.check_rls_performance has a role mutable search_path`

**Solution**: Created a new secure version of the function with immutable search_path.

**File**: `prisma/migrations/fix_security_warnings.sql`

The function now includes:

```sql
SET search_path = public, pg_temp
```

This prevents the function from being affected by malicious search_path changes.

### 2. Leaked Password Protection

**Issue**: `Leaked password protection is currently disabled`

**Solution**: Created a script to enable leaked password protection via the Supabase Management API.

**File**: `scripts/fix-auth-security.js`

## How to Apply These Fixes

### Step 1: Apply Database Function Fix

Run the SQL migration to fix the function search path:

```bash
# If using Supabase CLI
supabase db push --file prisma/migrations/fix_security_warnings.sql

# Or manually execute the SQL file in your Supabase SQL editor
```

### Step 2: Enable Leaked Password Protection

You have two options:

#### Option A: Using the Automated Script (Recommended)

1. Generate a Supabase Access Token:

   - Go to https://app.supabase.com/account/tokens
   - Create a new token with appropriate permissions

2. Set environment variables:

   ```bash
   export SUPABASE_ACCESS_TOKEN="your_access_token_here"
   export SUPABASE_PROJECT_REF="your_project_ref" # Found in your project URL
   ```

3. Run the fix script:
   ```bash
   npm run fix-security
   ```

#### Option B: Manual Setup via Dashboard

1. Go to your Supabase dashboard
2. Navigate to **Authentication > Settings**
3. Find the **Password Requirements** section
4. Enable **"Leaked Password Protection"**
5. Save the changes

## Verification

After applying the fixes, you can verify they worked by:

1. **Function Fix**: Run the database linter again - the function search path warning should be resolved
2. **Password Protection**: The auth warning should disappear, and new user registrations will be checked against the HaveIBeenPwned database

## Additional Security Functions

The migration also includes helpful security audit functions:

- `check_rls_performance()` - Checks RLS policy performance
- `check_rls_status()` - Verifies RLS is enabled on all tables
- `auth_security_reminder()` - Returns reminder about security settings

You can call these functions to audit your security posture:

```sql
-- Check RLS status on all tables
SELECT * FROM check_rls_status();

-- Check RLS performance
SELECT * FROM check_rls_performance();

-- Get security reminder
SELECT auth_security_reminder();
```

## Script Configuration

The `fix-auth-security.js` script accepts these environment variables:

- `SUPABASE_ACCESS_TOKEN` - Your Supabase Management API token (required)
- `SUPABASE_PROJECT_REF` - Your project reference ID (required)
- `NEXT_PUBLIC_SUPABASE_PROJECT_REF` - Alternative project ref from your .env file

## Troubleshooting

### Common Issues

1. **Access Token Issues**:

   - Ensure your access token has the correct permissions
   - Check that the token hasn't expired

2. **Project Reference Issues**:

   - Make sure you're using the correct project reference ID
   - Check your environment variables are properly set

3. **API Rate Limits**:
   - The script includes basic error handling for API limits
   - If you encounter rate limits, wait a few minutes and try again

### Manual Verification

To manually verify the fixes:

1. **Check Function**: Query the function in your database
2. **Check Auth Settings**: Look in your Supabase dashboard under Authentication settings

## Security Best Practices

After applying these fixes, consider implementing these additional security measures:

1. **Regular Security Audits**: Run the provided audit functions regularly
2. **Monitor RLS Policies**: Ensure all tables have appropriate RLS policies
3. **Review Function Permissions**: Regularly audit function permissions and search paths
4. **Update Dependencies**: Keep your Supabase client libraries updated
5. **Enable Additional Auth Features**: Consider enabling other Supabase Auth security features

## Support

If you encounter issues with these fixes:

1. Check the Supabase documentation for the latest API changes
2. Verify your environment variables are correctly set
3. Consult the Supabase community forum for help
4. Check the Supabase status page for any ongoing issues

---

**Note**: These fixes address the specific security warnings identified by the Supabase linter. Always follow current security best practices and regularly audit your application's security posture.
