// src/app/(dashboard)/student/layout.tsx
import React from "react";
import { QuestProvider } from "@/contexts/QuestContext";
import StudentSetupCheck from "@/components/StudentSetupCheck";

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuestProvider>
      <StudentSetupCheck />
      {children}
    </QuestProvider>
  );
}
