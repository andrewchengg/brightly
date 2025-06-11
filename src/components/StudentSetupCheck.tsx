"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function StudentSetupCheck() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsChecking(false);
          return;
        }

        // Only for student users
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.user_metadata?.role !== 'student') {
          setIsChecking(false);
          return;
        }

        // Check if student has completed setup
        const { data: student } = await supabase
          .from('Student')
          .select('initialSetupComplete')
          .eq('id', session.user.id)
          .single();

        if (student && student.initialSetupComplete === false) {
          console.log('Student setup not complete, redirecting to setup page');
          router.push('/student/complete-setup');
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking student setup status:', error);
        setIsChecking(false);
      }
    }

    checkSetupStatus();
  }, [supabase, router]);

  // Return null - this component just handles redirects
  return null;
} 
