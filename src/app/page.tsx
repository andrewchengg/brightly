"use client";

import { useSupabaseUser, useUserRole } from "@/app/sign-in/page";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Homepage = () => {
  const router = useRouter();
  const { isLoaded } = useSupabaseUser();
  const { role, isLoaded: isRoleLoaded } = useUserRole();

  // Redirect based on user role
  useEffect(() => {
    if (isLoaded && isRoleLoaded) {
      if (role) {
        router.push(`/${role}`);
      } else {
        router.push('/sign-in');
      }
    }
  }, [isLoaded, isRoleLoaded, role, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-lamaSkyLight">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Welcome to SchooLama</h1>
        <p className="mb-4">Loading your dashboard...</p>
      </div>
    </div>
  );
};

export default Homepage;
