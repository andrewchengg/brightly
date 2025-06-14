"use client";

import Link from "next/link";
import { useUserRole } from "@/lib/hooks/auth";

const LogoLink = () => {
  const { role } = useUserRole();

  const getDashboardUrl = () => {
    switch (role) {
      case "admin":
        return "/admin";
      case "teacher":
        return "/teacher";
      case "parent":
        return "/parent";
      case "student":
        return "/student";
      default:
        return "/";
    }
  };

  return (
    <div className="pt-6 pb-8 px-2">
      <Link
        href={getDashboardUrl()}
        className="flex items-center justify-center gap-3 py-3 px-4 rounded-2xl hover:bg-slate-50 transition-all duration-300 group"
      >
        <span className="hidden lg:block font-bold text-4xl text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors duration-300">
          Brightly
        </span>
      </Link>
    </div>
  );
};

export default LogoLink;
