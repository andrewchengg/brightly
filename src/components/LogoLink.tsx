'use client';

import Link from 'next/link';
import { useUserRole } from '@/lib/hooks/auth';

const LogoLink = () => {
  const { role } = useUserRole();

  const getDashboardUrl = () => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'parent':
        return '/parent';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  };

  return (
    <Link
      href={getDashboardUrl()}
      className="flex items-center justify-center gap-2"
    >
      <span className="hidden lg:block font-bold text-2xl">Brightly</span>
    </Link>
  );
};

export default LogoLink; 