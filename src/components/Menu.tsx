"use client";

import { useUserRole, useSignOut } from "@/app/sign-in/page";
import Link from "next/link";
import { useEffect, useState } from "react";
// Import React Icons
import { 
  FaHome, 
  FaBook, 
  FaCalendarAlt, 
  FaFileAlt, 
  FaChartBar, 
  FaGift, 
  FaUserAlt, 
  FaCog, 
  FaSignOutAlt,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUsers,
  FaBookOpen,
  FaGraduationCap,
  FaClipboardList,
  FaCheckSquare,
  FaEnvelope,
  FaBullhorn
} from "react-icons/fa";

const studentMenuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: FaHome,
        label: "Home",
        href: "/student",
        visible: ["student"],
      },
      {
        icon: FaBook,
        label: "Practice",
        href: "/student/practice",
        visible: ["student"],
      },
      {
        icon: FaCalendarAlt,
        label: "Weekly Challenge",
        href: "/student/weekly-challenge",
        visible: ["student"],
      },
      {
        icon: FaFileAlt,
        label: "Mock Exam",
        href: "/student/mock-exam",
        visible: ["student"],
      },
      {
        icon: FaChartBar,
        label: "Results",
        href: "/student/results",
        visible: ["student"],
      },
      {
        icon: FaGift,
        label: "Rewards",
        href: "/student/rewards",
        visible: ["student"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: FaUserAlt,
        label: "Profile",
        href: "/profile/student",
        visible: ["student"],
      },
      {
        icon: FaCog,
        label: "Settings",
        href: "/settings",
        visible: ["student"],
      },
      {
        icon: FaSignOutAlt,
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
        icon: FaHome,
        label: "Home",
        href: "/",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaChalkboardTeacher,
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaUserGraduate,
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaUsers,
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaBookOpen,
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: FaGraduationCap,
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaBook,
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaFileAlt,
        label: "Exams",
        href: "/list/exams",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaClipboardList,
        label: "Assignments",
        href: "/list/assignments",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaChartBar,
        label: "Results",
        href: "/list/results",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaCheckSquare,
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaCalendarAlt,
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaEnvelope,
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaBullhorn,
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
        icon: FaUserAlt,
        label: "Profile",
        href: "/parent/profile",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaCog,
        label: "Settings",
        href: "/settings",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaSignOutAlt,
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
                    className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-blue-50 hover:text-blue-600 hover:translate-x-1 transition-all duration-200 w-full active:bg-blue-100"
                  >
                    <item.icon size={20} />
                    <span className="hidden lg:block">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-blue-50 hover:text-blue-600 hover:translate-x-1 transition-all duration-200 active:bg-blue-100"
                >
                  <item.icon size={20} />
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
