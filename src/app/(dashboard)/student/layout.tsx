// src/app/(dashboard)/student/layout.tsx
import React from 'react';
import DevDebugPanel from "@/components/DevDebugPanel"; // Keep this if you use it

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && <DevDebugPanel />}
    </>
  );
} 