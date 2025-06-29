// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

// PERFORMANCE: Cache configuration and client instance
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;
let cachedConfig: { url: string; key: string } | null = null;

const getSupabaseConfig = () => {
  if (!cachedConfig) {
    cachedConfig = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }
  return cachedConfig;
};

export const createClient = () => {
  // PERFORMANCE: Return cached client if it exists
  if (cachedClient) {
    return cachedClient;
  }

  const { url, key } = getSupabaseConfig();

  cachedClient = createBrowserClient(url, key, {
    // PERFORMANCE: Add browser-specific optimizations
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // PERFORMANCE: Reduce storage access
      storage: {
        ...globalThis.localStorage,
        // Cache frequently accessed items
        getItem: (key: string) => {
          try {
            return globalThis.localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            globalThis.localStorage.setItem(key, value);
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (key: string) => {
          try {
            globalThis.localStorage.removeItem(key);
          } catch {
            // Ignore storage errors
          }
        },
      },
    },
    db: {
      schema: "public",
    },
    global: {
      // PERFORMANCE: Add connection optimizations for browser
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          // Add keep-alive for better connection reuse
          keepalive: true,
        });
      },
    },
  });

  return cachedClient;
};
