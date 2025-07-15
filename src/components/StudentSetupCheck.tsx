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
        console.log("[SETUP_CHECK] Starting setup check...");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.log("[SETUP_CHECK] No session found");
          setIsChecking(false);
          return;
        }

        console.log("[SETUP_CHECK] Session found for user:", session.user.id);

        // Check if user is a student by querying the Student table directly
        const { data: student, error: studentError } = await supabase
          .from("Student")
          .select("initialSetupComplete")
          .eq("id", session.user.id)
          .single();

        console.log("[SETUP_CHECK] Student query result:", {
          student,
          error: studentError,
        });

        if (studentError && studentError.code !== "PGRST116") {
          // PGRST116 means row not found, which means user is not a student
          console.error(
            "[SETUP_CHECK] Error checking student setup status:",
            studentError
          );
          setIsChecking(false);
          return;
        }

        if (!student) {
          // User is not a student, so no setup check needed
          console.log("[SETUP_CHECK] User is not a student");
          setIsChecking(false);
          return;
        }

        console.log(
          "[SETUP_CHECK] Student initialSetupComplete:",
          student.initialSetupComplete
        );

        if (student.initialSetupComplete === false) {
          console.log(
            "[SETUP_CHECK] Student setup not complete, redirecting to setup page"
          );
          router.push("/student/complete-setup");
        } else {
          console.log("[SETUP_CHECK] Student setup is complete");
          setIsChecking(false);
        }
      } catch (error) {
        console.error(
          "[SETUP_CHECK] Error checking student setup status:",
          error
        );
        setIsChecking(false);
      }
    }

    checkSetupStatus();
  }, [supabase, router]);

  // Return null - this component just handles redirects
  return null;
}
