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

        // Check if student has completed setup
        const { data: student } = await supabase
          .from('Student')
          .select('initialSetupComplete, walkthroughComplete')
          .eq('id', session.user.id)
          .single();

        if (student && student.initialSetupComplete === false) {
          if (student.walkthroughComplete === false) {
            // If walkthrough is not complete, redirect to dashboard to show walkthrough first
            router.push('/student');
          } else {
            // Walkthrough complete but setup not complete, go to setup
            console.log('Student setup not complete, redirecting to setup page');
            router.push('/student/complete-setup');
          }
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
