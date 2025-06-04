// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Removed cache for simplicity with Next.js 14 style, direct cookies() usage.
// If using Next.js 15 alpha/beta, `cache` can be re-added.
export const createClient = () => {
  const cookieStore = cookies();

  // Use server-only variables for better security, with fallback to public ones for backward compatibility
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};
