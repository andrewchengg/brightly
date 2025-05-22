"use client";

import { useSupabaseUser, useUserRole, useSignOut } from "@/lib/hooks/auth";
import Image from "next/image";

const Navbar = () => {
  const { user, isLoaded } = useSupabaseUser();
  const { role } = useUserRole();
  const { signOut } = useSignOut();

  return (
    <div className="flex items-center justify-between p-4">
      
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">
            {isLoaded ? user?.email?.split('@')[0] || "User" : "User"}
          </span>
          <span className="text-[10px] text-gray-500 text-right">
            {isLoaded ? role || "User" : "User"}
          </span>
        </div>
        <button 
          onClick={() => signOut()}
          className="bg-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer"
        >
          <Image src="/logout.png" alt="Sign Out" width={20} height={20} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
