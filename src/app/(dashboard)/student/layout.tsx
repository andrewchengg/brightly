// src/app/(dashboard)/student/layout.tsx
import React from "react";
import { QuestProvider } from "@/contexts/QuestContext";

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QuestProvider>{children}</QuestProvider>;
}
