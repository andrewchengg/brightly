// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// PERFORMANCE: Cache client configuration to avoid recreation
let cachedConfig: { url: string; key: string } | null = null;

const getSupabaseConfig = () => {
  if (!cachedConfig) {
    cachedConfig = {
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key:
        process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }
  return cachedConfig;
};

export const createClient = () => {
  const cookieStore = cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient(url, key, {
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
    // PERFORMANCE: Add production optimizations
    db: {
      schema: "public",
    },
    auth: {
      // PERFORMANCE: Reduce auth refresh frequency in production
      autoRefreshToken: process.env.NODE_ENV === "production" ? false : true,
      persistSession: true,
      detectSessionInUrl: false, // Disable for better performance
    },
    global: {
      // PERFORMANCE: Add connection timeout for faster failures
      fetch: (url, options = {}) => {
        if (process.env.NODE_ENV === "production") {
          // Create timeout for production environment
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));
        }
        return fetch(url, options);
      },
    },
  });
};
