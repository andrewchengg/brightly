"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StudentSetupCheck() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setIsChecking(false);
          return;
        }

        // Check if user is a student by querying the Student table directly
        const { data: student, error: studentError } = await supabase
          .from("Student")
          .select("initialSetupComplete")
          .eq("id", session.user.id)
          .single();

        if (studentError && studentError.code !== "PGRST116") {
          setIsChecking(false);
          return;
        }

        if (!student) {
          setIsChecking(false);
          return;
        }

        if (student.initialSetupComplete === false) {
          router.push("/student/complete-setup");
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        setIsChecking(false);
      }
    }

    checkSetupStatus();
  }, [supabase, router]);

  // Return null - this component just handles redirects
  return null;
}
