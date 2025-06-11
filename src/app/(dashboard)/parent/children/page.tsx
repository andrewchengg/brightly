// src/app/(dashboard)/parent/children/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { FaUserGraduate, FaArrowRight, FaPlusCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client'; 
import type { Student as PrismaStudent, Class as PrismaClass, Grade as PrismaGrade } from '@/generated/prisma'; // Import Prisma types
import { toast } from 'react-toastify';
import Image from 'next/image'; // Make sure Image is imported from next/image

// Define ChildDisplayInfo based on what we fetch and need for display
interface ChildDisplayInfo extends Pick<PrismaStudent, 
  'id' | 'name' | 'username' | 'schoolLevel' | 'schoolName' | 'img' | 'level' | 'xpPoints' | 'email' | 'initialSetupComplete'
> {
    class?: Pick<PrismaClass, 'name'> | null; 
    grade?: Pick<PrismaGrade, 'level' | 'name'> | null; 
}

export default function MyChildrenPage() { 
  const router = useRouter();
  const supabase = createClient();
  const [children, setChildren] = useState<ChildDisplayInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to view this page."); 
        router.push('/sign-in');
        return;
      }
      
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('Student')
          .select(`
            id, 
            name, 
            username, 
            email,
            img,
            schoolLevel, 
            schoolName, 
            level, 
            xpPoints,
            initialSetupComplete,
            classId,
            gradeId,
            Class ( id, name ), 
            Grade ( id, level, name )
          `)
          .eq('parentId', user.id);

        if (studentsError) {
          console.error("Supabase error fetching children:", studentsError);
          throw new Error(studentsError.message || "Failed to fetch children data.");
        }
        
        const typedChildren = (studentsData || []).map(s => {
          // Ensure all properties expected by ChildDisplayInfo are present
          // or have default fallbacks if they can be null from the query
          return {
            id: s.id,
            name: s.name,
            username: s.username,
            email: s.email, // Added email
            img: s.img,
            schoolLevel: s.schoolLevel,
            schoolName: s.schoolName,
            level: s.level,
            xpPoints: s.xpPoints,
            initialSetupComplete: s.initialSetupComplete, // Added
            class: s.Class ? { name: s.Class.name } : null, // Map from Supabase's 'Class' to 'class'
            grade: s.Grade ? { level: s.Grade.level, name: s.Grade.name } : null, // Map from Supabase's 'Grade'
          } as ChildDisplayInfo; // Assert type after mapping
        });

        setChildren(typedChildren);

      } catch (err: any) {
        console.error("Error fetching children:", err);
        setError(err.message || "Could not load your children's information. Please try again.");
        toast.error(err.message || "Could not load children's information.");
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, [supabase, router]);

  if (loading) {
    return (
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] p-4">
            <FaSpinner className="animate-spin text-4xl text-indigo-600"/>
            <p className="mt-4 text-lg text-gray-600">Loading your children's profiles...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md max-w-md">
                <div className="flex items-center mb-2">
                    <FaExclamationTriangle className="h-6 w-6 text-red-500 mr-3" />
                    <h2 className="text-xl font-semibold">Error</h2>
                </div>
                <p>{error}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">My Children</h1>
        <Button onClick={() => router.push('/sign-up/parent-child-setup')} className="bg-green-500 hover:bg-green-600"> 
          <FaPlusCircle className="mr-2"/> Add Another Child
        </Button>
      </div>

      {children.length === 0 ? (
        <Card className="text-center py-12 shadow-md">
          <CardContent className="flex flex-col items-center">
            <FaUserGraduate className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Children Found</h3>
            <p className="text-gray-500 mb-6">You haven't added any children to your account yet.</p>
            <Button onClick={() => router.push('/sign-up/parent-child-setup')} className="bg-indigo-600 hover:bg-indigo-700">
              Add Your First Child
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <Card key={child.id} className="hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4 pb-3 bg-gray-50 rounded-t-lg">
                {child.img ? (
                  <Image src={child.img} alt={child.name} width={56} height={56} className="rounded-full border-2 border-white shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-2xl font-semibold border-2 border-white shadow-sm">
                    {child.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800">{child.name}</CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Level {child.level || 1} • {child.grade?.name || (child.schoolLevel ? `Primary ${child.schoolLevel}` : 'N/A')}
                    {child.class?.name ? ` (${child.class.name})` : ''}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-grow">
                <p className="text-sm text-gray-600 mb-1">Username: <span className="font-medium">{child.username}</span></p>
                <p className="text-sm text-gray-600">XP Points: <span className="font-medium text-amber-600">{child.xpPoints || 0}</span></p>
              </CardContent>
              <CardFooter className="pt-3">
                <Link href={`/parent/child/${child.id}`} passHref legacyBehavior>
                  <a className="w-full"> {/* The <a> tag is important for Link with custom components like Button */}
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                        View Details & Assign <FaArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                  </a>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
