import React from 'react';
import DevDebugPanel from "@/components/DevDebugPanel";

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <DevDebugPanel />
    </>
  );
} 