"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StudentSetupCheck() {
  const router = useRouter();
  const pathname = usePathname();
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
          .select('id, initialSetupComplete, walkthroughComplete')
          .eq('id', session.user.id)
          .single();

        if (student && student.initialSetupComplete === false) {
          if (student.walkthroughComplete === false) {
            router.push('/student');
          } else {
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
  }, [supabase, router, pathname]);

  // Return null - this component just handles redirects
  return null;
}
