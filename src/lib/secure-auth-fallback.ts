import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export type UserRole = "student" | "parent" | "teacher" | "admin";

/**
 * FALLBACK ROLE VERIFICATION FOR MIDDLEWARE
 *
 * This is a simplified version that provides basic protection when
 * database queries fail in edge runtime. Uses minimal metadata but
 * only as a fallback - the main auth should use database lookups.
 */
export async function getFallbackUserRole(
  req: NextRequest,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<UserRole | null> {
  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set() {
          // No-op for read-only in middleware
        },
        remove() {
          // No-op for read-only in middleware
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[FALLBACK_ROLE] No user found or auth error:", authError);
      return null;
    }

    console.log("[FALLBACK_ROLE] Checking role for user:", user.id);

    // Try database lookup first
    try {
      // Check Admin table
      const { data: admin } = await supabase
        .from("Admin")
        .select("id")
        .eq("id", user.id)
        .single();
      if (admin) {
        console.log("[FALLBACK_ROLE] User is admin");
        return "admin";
      }

      // Check Teacher table
      const { data: teacher } = await supabase
        .from("Teacher")
        .select("id")
        .eq("id", user.id)
        .single();
      if (teacher) {
        console.log("[FALLBACK_ROLE] User is teacher");
        return "teacher";
      }

      // Check Parent table
      const { data: parent } = await supabase
        .from("Parent")
        .select("id")
        .eq("id", user.id)
        .single();
      if (parent) {
        console.log("[FALLBACK_ROLE] User is parent");
        return "parent";
      }

      // Check Student table
      const { data: student } = await supabase
        .from("Student")
        .select("id")
        .eq("id", user.id)
        .single();
      if (student) {
        console.log("[FALLBACK_ROLE] User is student");
        return "student";
      }

      console.log(
        "[FALLBACK_ROLE] User not found in any table, defaulting to student"
      );
      return "student";
    } catch (dbError) {
      console.error(
        "Database lookup failed in middleware, using fallback:",
        dbError
      );

      // FALLBACK: Use metadata only if DB fails AND only for non-admin roles
      // Admin roles must always be verified via database
      const metadataRole = user.user_metadata?.role as string | undefined;
      console.log(
        "[FALLBACK_ROLE] Using metadata fallback, role:",
        metadataRole
      );

      // Never trust metadata for admin - require database verification
      if (metadataRole === "admin") {
        console.warn(
          "Admin role in metadata rejected - database verification required"
        );
        return "student"; // Safe default
      }

      // Allow other roles as fallback but log for monitoring
      if (metadataRole === "teacher" || metadataRole === "parent") {
        console.warn(
          `Using metadata fallback for role: ${metadataRole}. User: ${user.id}`
        );
        return metadataRole as UserRole;
      }

      console.log("[FALLBACK_ROLE] Defaulting to student role");
      return "student"; // Safe default
    }
  } catch (error) {
    console.error("Complete auth failure in middleware:", error);
    return null;
  }
}
