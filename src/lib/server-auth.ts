import { createClient } from "./supabase/server";

// Server-side helper to check if user has a specific role
export const hasRole = async (requiredRole: string | string[]) => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const userRole = user.user_metadata?.role as string | undefined;
  
  if (!userRole) {
    return false;
  }

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }

  return userRole === requiredRole;
};

// Server-side helper to get user ID
export const getUserId = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

// Server-side helper to get user role
export const getUserRole = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.role as string | undefined;
}; 