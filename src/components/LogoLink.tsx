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
    <div className="w-full flex justify-center items-center py-3">
      <Link
        href={getDashboardUrl()}
        className="w-full flex justify-center items-center"
      >
        <span className="font-bold text-4xl text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors duration-300">
          Brightly
        </span>
      </Link>
    </div>
  );
};

export default LogoLink;
