import { redirect } from "next/navigation";
import MockExamLanding from "@/components/MockExam/MockExamLanding";
import { createClient } from "@/lib/supabase/server";

export default async function MockExamPage() {
  const supabase = createClient();
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user?.id) {
    redirect("/sign-in");
  }

  return <MockExamLanding userId={session.user.id} />;
}