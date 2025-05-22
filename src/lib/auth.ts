// src/lib/hooks/auth.ts
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation" 
import { createClient } from "@/lib/supabase/client" 
import { type User, type Session } from "@supabase/supabase-js" // Import Session
import safeStorage from '@/lib/safeStorage'; // Import your safeStorage utility

export const useSupabaseUser = () => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleUserSession = (session: Session | null) => {
      if (mounted) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsLoaded(true);
        if (currentUser) {
          console.log("useSupabaseUser: User session active, saving userId to localStorage:", currentUser.id);
          safeStorage.setItem('userId', currentUser.id, 'local'); // Use 'local' for localStorage
        } else {
          console.log("useSupabaseUser: No user session, removing userId from localStorage.");
          safeStorage.removeItem('userId', 'local');
        }
      }
    };

    const fetchUserAndListen = async () => {
      // Initial fetch for the session (which includes the user)
      const { data: { session }, error } = await supabase.auth.getSession();
      if (mounted) {
        if (error) {
          console.warn("useSupabaseUser: Error fetching initial session:", error.message);
        }
        handleUserSession(session); // Process the initial session
      }

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (mounted) {
            handleUserSession(session); // Process session changes
          }
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    fetchUserAndListen();
  }, [supabase]); 

  return { user, isLoaded };
};

// useUserRole and useSignOut can remain as they are
export const useUserRole = () => { /* ... as before ... */ };
export const useSignOut = () => { 
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter(); 

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      safeStorage.removeItem('userId', 'local'); // Also clear userId on sign out
      router.push('/sign-in'); // Redirect after sign out
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return { signOut, isLoading };
};