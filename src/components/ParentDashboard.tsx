"use client";

import { useState, useEffect } from "react";
import {
  FaUser,
  FaGraduationCap,
  FaCalendarDay,
  FaTrophy,
  FaArrowRight,
  FaSpinner,
} from "react-icons/fa";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";

interface Child {
  id: string;
  name: string;
  username: string;
  email?: string;
  img?: string;
  level: number;
  xpPoints: number;
  class?: {
    name: string;
  };
  grade?: {
    level: number;
    name?: string;
  };
}

interface ParentDashboardProps {
  className?: string;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ className }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to view this page.");
          return;
        }

        const { data: studentsData, error: studentsError } = await supabase
          .from("Student")
          .select(
            `
            id, 
            name, 
            username, 
            email,
            img,
            level, 
            xpPoints,
            classId,
            gradeId,
            Class ( id, name ), 
            Grade ( id, level, name )
          `
          )
          .eq("parentId", user.id);

        if (studentsError) {
          console.error("Error fetching children:", studentsError);
          throw new Error(
            studentsError.message || "Failed to fetch children data."
          );
        }

        setChildren(studentsData || []);
      } catch (error: any) {
        console.error("Error fetching children:", error);
        toast.error(error.message || "Failed to load children data");
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [supabase]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <FaSpinner className="animate-spin text-2xl text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading your children...</span>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <FaUser className="mx-auto text-4xl text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Children Found
        </h3>
        <p className="text-gray-600 mb-4">
          You don't have any children registered yet.
        </p>
        <Link href="/sign-up/parent-child-setup">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            Add Your Child
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Your Children</h2>
        <Link href="/parent/children">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <span>Manage Children</span>
            <FaArrowRight size={12} />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <Card
            key={child.id}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                {child.img ? (
                  <img
                    src={child.img}
                    alt={child.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <FaUser className="text-indigo-600 text-lg" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 truncate">
                  {child.name}
                </h3>
                <p className="text-sm text-gray-600">@{child.username}</p>

                <div className="mt-2 space-y-1">
                  {child.class && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <FaGraduationCap size={10} />
                      <span>Class: {child.class.name}</span>
                    </div>
                  )}

                  {child.grade && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <FaCalendarDay size={10} />
                      <span>Grade {child.grade.level}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <FaTrophy size={10} />
                    <span>
                      Level {child.level} • {child.xpPoints} XP
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link href={`/student?viewAs=${child.id}`}>
                    <Button
                      size="sm"
                      className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      View Progress
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {children.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/parent/children">
              <Button variant="outline" size="sm" className="text-xs">
                View All Children
              </Button>
            </Link>
            <Link href="/sign-up/parent-child-setup">
              <Button variant="outline" size="sm" className="text-xs">
                Add Another Child
              </Button>
            </Link>
            <Link href="/parent/profile">
              <Button variant="outline" size="sm" className="text-xs">
                Update Profile
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
