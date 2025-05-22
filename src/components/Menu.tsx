"use client";

import { useUserRole, useSignOut } from "@/lib/hooks/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  FaBullhorn,
  FaTrophy,
  FaLightbulb
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
  const pathname = usePathname();

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
      <div className="mt-8 p-4">
        <div className="flex flex-col gap-4">
          <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Use student-specific menu if the user is a student
  const displayMenuItems = userRole === "student" ? studentMenuItems : menuItems;

  return (
    <div className="mt-2">
      {/* User role badge */}
      <div className="mx-3 mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-lg text-white text-center shadow-md">
          <span className="text-xs font-medium uppercase tracking-wider">{userRole}</span>
        </div>
      </div>

      {displayMenuItems.map((i) => (
        <div className="flex flex-col gap-1 mb-6" key={i.title}>
          <span className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(userRole)) {
              const isActive = pathname === item.href;
              
              if (item.isLogout) {
                return (
                  <button
                    key={item.label}
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className={`flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 transition-all duration-200 w-full
                      ${isSigningOut ? 'opacity-60' : 'opacity-100'}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      <item.icon size={18} className="text-red-500" />
                    </div>
                    <span className="hidden lg:block font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 font-medium shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                    <item.icon size={18} />
                  </div>
                  <span className="hidden lg:block">{item.label}</span>
                  {isActive && <span className="hidden lg:block absolute left-0 w-1 h-8 bg-indigo-600 rounded-r-md"></span>}
                </Link>
              );
            }
            return null;
          })}
        </div>
      ))}
      
      {/* Footer element - version or branding */}
      <div className="hidden lg:block mt-auto px-4 py-4">
        <div className="border-t border-gray-200 pt-4">
          <div className="text-xs text-center text-gray-400">
            Edcel v1.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
