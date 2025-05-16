"use client";

import { useUserRole, useSignOut } from "@/app/sign-in/page";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const studentMenuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/student",
        visible: ["student"],
      },
      {
        icon: "/assignment.png",
        label: "Practice",
        href: "/student/practice",
        visible: ["student"],
      },
      {
        icon: "/calendar.png",
        label: "Weekly Challenge",
        href: "/student/weekly-challenge",
        visible: ["student"],
      },
      {
        icon: "/exam.png",
        label: "Mock Exam",
        href: "/student/mock-exam",
        visible: ["student"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/student/results",
        visible: ["student"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile/student",
        visible: ["student"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/settings",
        visible: ["student"],
      },
      {
        icon: "/logout.png",
        label: "Logout",
        href: "#",
        visible: ["student"],
        isLogout: true,
      },
    ],
  },
];

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/exam.png",
        label: "Exams",
        href: "/list/exams",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/assignment.png",
        label: "Assignments",
        href: "/list/assignments",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/message.png",
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "parent"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/settings",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: "/logout.png",
        label: "Logout",
        href: "#",
        visible: ["admin", "teacher", "parent"],
        isLogout: true,
      },
    ],
  },
];

const Menu = () => {
  const { role, isLoaded } = useUserRole();
  const { signOut, isLoading: isSigningOut } = useSignOut();
  const [userRole, setUserRole] = useState<string>("student"); // Default to student

  // Set the user role once user data is loaded
  useEffect(() => {
    if (isLoaded && role) {
      setUserRole(role);
    }
  }, [role, isLoaded]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/sign-in";
  };

  // Show loading state while user data is loading
  if (!isLoaded) {
    return (
      <div className="mt-4 text-sm">
        <div className="flex flex-col gap-2">
          <span className="hidden lg:block text-gray-400 font-light my-4">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // Use student-specific menu if the user is a student
  const displayMenuItems = userRole === "student" ? studentMenuItems : menuItems;

  return (
    <div className="mt-4 text-sm">
      {displayMenuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(userRole)) {
              if (item.isLogout) {
                return (
                  <button
                    key={item.label}
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight w-full"
                  >
                    <Image src={item.icon} alt="" width={20} height={20} />
                    <span className="hidden lg:block">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
