"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type User } from "@supabase/supabase-js";

// Client-side hook to get the current user
export const useSupabaseUser = () => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Fetch the user on initial load
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsLoaded(true);
      }
    );

    // Clean up the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    user,
    isLoaded,
  };
};

// Client-side helper to get the user's role
export const useUserRole = () => {
  const { user, isLoaded } = useSupabaseUser();

  if (!isLoaded || !user) {
    return { role: null, isLoaded };
  }

  return {
    role: (user.user_metadata?.role as string) || "student",
    isLoaded,
  };
};

// Client-side helper to sign out
export const useSignOut = () => {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      // Redirect or other post-logout actions can be handled where this hook is used
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { signOut, isLoading };
};

// Server-side helper to check if user has a specific role
export const hasRole = async (requiredRole: string | string[]) => {
  // It should be reimplemented using Supabase if needed
  return false;
};

// Server-side helper to get user ID
export const getUserId = async () => {
  // It should be reimplemented using Supabase if needed
  return null;
};
