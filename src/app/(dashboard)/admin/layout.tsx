import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/server-auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side auth check for admin role
  const userRole = await getUserRole();
  
  // If user is not an admin, redirect to their appropriate dashboard
  if (userRole !== "admin") {
    redirect(`/${userRole || "student"}`);
  }

  return <>{children}</>;
} 