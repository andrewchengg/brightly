import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireRole, UserRole } from "@/lib/secure-auth";

/**
 * API ROUTE PROTECTION UTILITIES
 *
 * Use these helpers to consistently protect API routes with proper authentication
 * and authorization checks.
 */

export async function withAuth<T>(
  handler: (auth: {
    user: any;
    role: UserRole;
    isAdmin: boolean;
  }) => Promise<T>,
  requiredRole?: UserRole | UserRole[]
): Promise<T | NextResponse> {
  try {
    // Get authenticated user with verified role
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check role requirements if specified
    if (requiredRole) {
      const hasAccess = await requireRole(requiredRole, auth.user.id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // Execute the handler with authenticated user
    return await handler(auth);
  } catch (error) {
    console.error("API protection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * ADMIN-ONLY API PROTECTION
 *
 * Use this for routes that should only be accessible by admins
 */
export async function withAdminAuth<T>(
  handler: (auth: { user: any; role: UserRole; isAdmin: boolean }) => Promise<T>
): Promise<T | NextResponse> {
  return withAuth(handler, "admin");
}

/**
 * RATE LIMITING STORE
 *
 * Simple in-memory rate limiting (replace with Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const key = userId;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Increment count
  record.count++;
  return true;
}

/**
 * RATE LIMITED API PROTECTION
 *
 * Use this for APIs that should have rate limiting
 */
export async function withRateLimit<T>(
  handler: (auth: {
    user: any;
    role: UserRole;
    isAdmin: boolean;
  }) => Promise<T>,
  maxRequests = 100,
  windowMs = 60 * 60 * 1000, // 1 hour default
  requiredRole?: UserRole | UserRole[]
): Promise<T | NextResponse> {
  return withAuth(async (auth) => {
    // Check rate limit
    if (!checkRateLimit(auth.user.id, maxRequests, windowMs)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      ) as any;
    }

    return handler(auth);
  }, requiredRole);
}

/**
 * VALIDATE JSON BODY
 *
 * Helper to safely parse and validate request bodies
 */
export async function validateJsonBody<T>(
  request: Request,
  validator?: (data: any) => data is T
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json();

    if (validator && !validator(body)) {
      return {
        error: NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 }
        ),
      };
    }

    return { data: body };
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      ),
    };
  }
}
