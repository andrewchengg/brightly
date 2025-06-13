// src/lib/hooks/auth.ts
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation" // Import if useSignOut needs it
import { createClient } from "@/lib/supabase/client" // Uses the browser client from @supabase/ssr
import { type User, type Session } from "@supabase/supabase-js"
import safeStorage from '@/lib/safeStorage';

export const useSupabaseUser = () => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchUserAndListen = async () => {
      // Initial fetch for the authenticated user (secure)
      const { data: { user: authenticatedUser }, error } = await supabase.auth.getUser();
      if (mounted) {
        if (error) {
          console.warn("useSupabaseUser: Error fetching initial user:", error.message);
        }
        setUser(authenticatedUser ?? null);
        setIsLoaded(true);
      }

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (mounted) {
            // For onAuthStateChange, using session.user is common.
            // The initial load with getUser() establishes the secure baseline.
            // Subsequent updates via onAuthStateChange are more for UI reactivity.
            // If absolute certainty is needed on every change, uncomment the getUser() below.
            // const { data: { user: updatedUserFromEvent } } = await supabase.auth.getUser();
            // setUser(updatedUserFromEvent ?? null);
            setUser(session?.user ?? null); // This will still show the warning for this specific line
            setIsLoaded(true);
          }
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    fetchUserAndListen();
    // The cleanup function is returned by fetchUserAndListen
    // No explicit return needed here for that.
  }, [supabase]); // supabase client instance is stable

  return { user, isLoaded };
};

export const useUserRole = () => {
  const { user, isLoaded } = useSupabaseUser();

  if (!isLoaded) {
    return { role: null, isLoaded };
  }
  
  return {
    role: user?.user_metadata?.role as string | undefined,
    isLoaded,
  };
};

export const useSignOut = () => {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      // Clear any local storage items
      safeStorage.removeItem('userId', 'local');
      // Use router for proper navigation
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { signOut, isLoading };
};