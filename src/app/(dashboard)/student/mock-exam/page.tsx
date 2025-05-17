import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import MockExamLanding from "@/components/MockExam/MockExamLanding";

export default async function MockExamPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user?.id) {
    redirect("/sign-in");
  }

  return <MockExamLanding userId={session.user.id} />;
}