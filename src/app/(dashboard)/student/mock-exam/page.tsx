// src/app/(dashboard)/student/mock-exam/page.tsx
import { redirect } from "next/navigation";
import MockExamLanding from "@/components/MockExam/MockExamLanding"; 
import { createClient } from "@/lib/supabase/server";

export default async function MockExamPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    redirect("/sign-in");
  }

  return <MockExamLanding userId={user.id} />;
}