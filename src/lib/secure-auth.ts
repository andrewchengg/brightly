import { createClient } from "@/lib/supabase/server";

export type UserRole = "student" | "parent" | "teacher" | "admin";

/**
 * SECURE USER ROLE VERIFICATION (EDGE RUNTIME COMPATIBLE)
 *
 * This function replaces the insecure user.user_metadata?.role pattern
 * with actual database table lookups. Users cannot fake their roles.
 * Uses Supabase instead of Prisma for edge runtime compatibility.
 */
export async function getSecureUserRole(
  userId?: string
): Promise<UserRole | null> {
  try {
    const supabase = createClient();

    // Get current user if no userId provided
    if (!userId) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) return null;
      userId = user.id;
    }

    // Check Admin table first (highest privilege)
    const { data: admin } = await supabase
      .from("Admin")
      .select("id")
      .eq("id", userId)
      .single();
    if (admin) return "admin";

    // Check Teacher table
    const { data: teacher } = await supabase
      .from("Teacher")
      .select("id")
      .eq("id", userId)
      .single();
    if (teacher) return "teacher";

    // Check Parent table
    const { data: parent } = await supabase
      .from("Parent")
      .select("id")
      .eq("id", userId)
      .single();
    if (parent) return "parent";

    // Check Student table
    const { data: student } = await supabase
      .from("Student")
      .select("id")
      .eq("id", userId)
      .single();
    if (student) return "student";

    // Default fallback - should not happen in normal operation
    return null;
  } catch (error) {
    console.error("Error getting secure user role:", error);
    return null;
  }
}

/**
 * SECURE ADMIN CHECK (EDGE RUNTIME COMPATIBLE)
 *
 * Replaces: user.user_metadata?.role === "admin"
 * With: Database lookup that cannot be faked
 */
export async function isSecureAdmin(userId?: string): Promise<boolean> {
  try {
    const supabase = createClient();

    if (!userId) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) return false;
      userId = user.id;
    }

    const { data: admin } = await supabase
      .from("Admin")
      .select("id")
      .eq("id", userId)
      .single();

    return !!admin;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * SECURE AUTHORIZATION MIDDLEWARE
 *
 * Use this to protect API routes that require specific roles
 */
export async function requireRole(
  requiredRole: UserRole | UserRole[],
  userId?: string
): Promise<boolean> {
  const userRole = await getSecureUserRole(userId);
  if (!userRole) return false;

  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  // Admin has access to everything
  if (userRole === "admin") return true;

  return allowedRoles.includes(userRole);
}

/**
 * SECURE API AUTHENTICATION HELPER
 *
 * Use this at the start of API routes to get authenticated user with verified role
 */
export async function getAuthenticatedUser(): Promise<{
  user: any;
  role: UserRole;
  isAdmin: boolean;
} | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const role = await getSecureUserRole(user.id);
    if (!role) return null;

    return {
      user,
      role,
      isAdmin: role === "admin",
    };
  } catch (error) {
    console.error("Error in getAuthenticatedUser:", error);
    return null;
  }
}
