"use client";

import { useSupabaseUser, useUserRole, useSignOut } from "@/lib/hooks/auth";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import prisma from "@/lib/prisma";

interface StudentInfo {
  name: string;
  level: number;
  img?: string;
}

const Navbar = () => {
  const { user, isLoaded } = useSupabaseUser();
  const { role } = useUserRole();
  const { signOut } = useSignOut();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  useEffect(() => {
    const fetchStudentInfo = async () => {
      if (role === "student" && user?.id) {
        try {
          const response = await fetch(`/api/student/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setStudentInfo(data);
          }
        } catch (error) {
          console.error("Error fetching student info:", error);
        }
      }
    };

    fetchStudentInfo();
  }, [role, user?.id]);

  return (
    <div className="flex items-center justify-between p-4">
      
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        
        {role === "student" && studentInfo ? (
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-indigo-100">
              {studentInfo.img ? (
                <Image
                  src={studentInfo.img}
                  alt={studentInfo.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-indigo-600 font-semibold text-lg">
                  {studentInfo.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">
                {studentInfo.name}
              </span>
              <span className="text-xs text-indigo-600">
                Level {studentInfo.level}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-xs leading-3 font-medium">
              {isLoaded ? user?.email?.split('@')[0] || "User" : "User"}
            </span>
            <span className="text-[10px] text-gray-500 text-right">
              {isLoaded ? role || "User" : "User"}
            </span>
          </div>
        )}
        <button 
          onClick={async () => {
            try {
              await signOut();
              // The signOut function will handle the navigation
            } catch (error) {
              console.error("Error during logout:", error);
            }
          }}
          className="bg-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer"
        >
          <Image src="/logout.png" alt="Sign Out" width={20} height={20} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
