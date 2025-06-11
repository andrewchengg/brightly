# Security Improvements: Environment Variables

## Overview

We've implemented important security improvements to how environment variables are handled in the Brightly application, moving away from exposing sensitive information to the client-side code.

## What Changed

### Before (Security Issue)

All API routes were using `NEXT_PUBLIC_` prefixed environment variables:

```typescript
// ❌ SECURITY ISSUE: This exposes sensitive info to client
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // ...
);
```

### After (Secure)

Server-side code now uses server-only environment variables with fallbacks:

```typescript
// ✅ SECURE: Server-only variables with fallbacks for compatibility
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
  // ...
});
```

## Environment Variable Categories

### 1. Server-Side Only (Secure)

These variables are only accessible on the server and should be used for API routes:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-postgres-database-url
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 2. Client-Side Safe (Public)

These variables are safe to expose to the browser:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
```

### 3. Fallback Variables (Backward Compatibility)

These are used as fallbacks when server-side variables aren't available:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Files Updated

### Core Library Files

- `src/lib/supabase/server.ts` - Now uses server-only variables with fallbacks
- `src/lib/supabase/admin.ts` - Now uses server-only variables with fallbacks

### API Routes (All Updated)

- `src/app/api/auth/sign-in-with-username/route.ts`
- `src/app/api/parent/assign-practice/route.ts`
- `src/app/api/user/award-xp/route.ts`
- `src/app/api/user/update-streak/route.ts`
- `src/app/api/student/review/wrong-answers/route.ts`
- `src/app/api/student/mastery/route.ts`
- `src/app/api/practice-sessions/[id]/route.ts`
- `src/app/api/student/practice-sessions/completed/route.ts`
- `src/app/api/student/weekly-challenge/start/route.ts`
- `src/app/api/student/practice-sessions/[sessionId]/route.ts`
- `src/app/api/debug/route.ts`

### Other Files

- `src/middleware.ts` - Now uses server-only variables with fallbacks
- `src/scripts/create-admin-account.js` - Now uses server-only variables with fallbacks

## Why This Matters

### Security Benefits

1. **Prevents Information Disclosure**: Sensitive environment variables are no longer exposed in client-side JavaScript bundles
2. **Reduces Attack Surface**: Attackers can't view configuration details in browser dev tools
3. **Follows Best Practices**: Aligns with Next.js security recommendations

### What Was At Risk

- Supabase URLs and keys were visible in browser JavaScript
- Potential for unauthorized access to backend services
- Configuration details exposed to anyone viewing the site

## Client-Side vs Server-Side Usage

### When to Use `NEXT_PUBLIC_` Variables

Only use `NEXT_PUBLIC_` prefixed variables for:

- Non-sensitive configuration (like Cloudinary cloud names)
- Public API endpoints
- Feature flags that are safe to expose
- Branding/UI configuration

### When to Use Server-Only Variables

Use regular environment variables (without `NEXT_PUBLIC_`) for:

- Database connections
- API keys and secrets
- Authentication tokens
- Any sensitive configuration

## Migration Guide

If you're updating an existing installation:

1. **Add the new server-side variables to your environment:**

   ```env
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. **Keep existing `NEXT_PUBLIC_` variables for backward compatibility:**

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **In production, prioritize server-side variables and eventually remove the public ones.**

## Verification

To verify your environment is properly configured, visit:

```
http://localhost:3000/api/debug
```

This endpoint will show which variables are configured without revealing their values.

## Best Practices Moving Forward

1. **Always prefer server-side variables** for API routes and server components
2. **Only use `NEXT_PUBLIC_` variables** when you need client-side access
3. **Never put secrets** in `NEXT_PUBLIC_` variables
4. **Use environment-specific configurations** for different deployment environments
5. **Regularly audit** environment variables to ensure no secrets are exposed
