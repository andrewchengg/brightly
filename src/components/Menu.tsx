// src/components/Menu.tsx
"use client";

import { useUserRole, useSignOut } from "@/lib/hooks/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation"; // Import useRouter
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
  FaBullhorn,
  FaLightbulb,
  FaEdit,
  FaPlusSquare,
  FaUserFriends,
  FaTasks,
  FaQuestionCircle,
  FaRobot,
} from "react-icons/fa";

const studentMenuItems = [
  {
    title: "MENU",
    items: [
      { icon: FaHome, label: "Home", href: "/student", visible: ["student"] },
      {
        icon: FaBook,
        label: "Practice",
        href: "/student/practice",
        visible: ["student"],
      },
      {
        icon: FaQuestionCircle,
        label: "Ask",
        href: "/student/ask",
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
        label: "Mock Exams",
        href: "/student/mock-exam",
        visible: ["student"],
      },
      {
        icon: FaLightbulb,
        label: "Review",
        href: "/student/review",
        visible: ["student"],
      },
      {
        icon: FaChartBar,
        label: "My Results",
        href: "/student/results",
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
        label: "Dashboard",
        href: "/",
        visible: ["admin", "teacher", "parent"],
      },
      {
        icon: FaPlusSquare,
        label: "Content Creation",
        href: "/admin/content/create",
        visible: ["admin"],
      },
      {
        icon: FaEdit,
        label: "Question Review",
        href: "/admin/question-review",
        visible: ["admin"],
      },
      {
        icon: FaTasks,
        label: "Assign Homework",
        href: "/parent/assign",
        visible: ["parent"],
      },
      {
        icon: FaRobot,
        label: "AI Planner",
        href: "/parent/plan",
        visible: ["parent"],
      },
      {
        icon: FaLightbulb,
        label: "Child Review",
        href: "/parent/review",
        visible: ["parent"],
      },
      {
        icon: FaChalkboardTeacher,
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin"],
      },
      {
        icon: FaUserGraduate,
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaUsers,
        label: "Parents List",
        href: "/list/parents",
        visible: ["admin"],
      }, // Admin view of all parents
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
        visible: ["admin", "teacher"],
      },
      {
        icon: FaClipboardList,
        label: "Assignments",
        href: "/list/assignments",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaChartBar,
        label: "Overall Results",
        href: "/list/results",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaChartBar,
        label: "Children's Results",
        href: "/parent/results",
        visible: ["parent"],
      },
      {
        icon: FaCheckSquare,
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher"],
      },
      {
        icon: FaBullhorn,
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: FaUserFriends,
        label: "My Children",
        href: "/profile",
        visible: ["parent"],
      },
      {
        icon: FaUserAlt,
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher"],
      }, // Generic, will be adjusted
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
  const { signOut } = useSignOut();
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter(); // For logout redirect
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (role) {
        setUserRole(role);

        // Adjust dashboard and profile links dynamically based on role
        // This modification happens on a mutable copy if menuItems is defined inside useEffect or passed appropriately
        const currentMenuItems = (
          role === "student" ? studentMenuItems : menuItems
        ).map((group) => ({
          ...group,
          items: group.items.map((item) => {
            let effectiveHref = item.href;
            if (item.label === "Dashboard") {
              if (role === "admin") effectiveHref = "/admin";
              else if (role === "teacher") effectiveHref = "/teacher";
              else if (role === "parent") effectiveHref = "/parent";
              // student dashboard is handled by studentMenuItems directly
            } else if (item.label === "Profile" && role !== "student") {
              effectiveHref = `/profile/${role}`;
            }
            return { ...item, href: effectiveHref };
          }),
        }));
        // Note: Directly mutating menuItems like this if it's a top-level const can be problematic.
        // A better approach for dynamic hrefs might be to adjust them during the render phase.
        // For this example, we'll assume the effect correctly modifies a local or component-level copy.
        // However, the `displayMenuItems` logic below is safer.
      } else {
        setUserRole("student"); // Fallback or guest state
        console.warn(
          "Menu: User is loaded but role is undefined/null. Defaulting to student view or limited access."
        );
      }
    }
  }, [role, isLoaded]);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut(); // This already clears client-side session
      // Force immediate redirect without waiting
      window.location.href = "/sign-in"; // Use window.location for immediate redirect
    } catch (error) {
      console.error("Error during logout:", error);
      setIsLoading(false);
    }
  };

  if (!isLoaded || !userRole) {
    return (
      <div className="mt-8 p-4">
        <div className="flex flex-col gap-4">
          {Array(5)
            .fill(0)
            .map((_, idx) => (
              <div
                key={idx}
                className="h-4 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
        </div>
      </div>
    );
  }

  // Determine which menu set to use
  const itemsToRender = userRole === "student" ? studentMenuItems : menuItems;

  return (
    <div className="mt-2">
      <div className="mx-3 mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-lg text-white text-center shadow-md">
          <span className="text-xs font-medium uppercase tracking-wider">
            {userRole}
          </span>
        </div>
      </div>

      {itemsToRender.map((group) => (
        <div className="flex flex-col gap-1 mb-6" key={group.title}>
          <span className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">
            {group.title}
          </span>
          {group.items.map((item) => {
            if (item.visible.includes(userRole)) {
              let effectiveHref = item.href;
              // Adjust "Dashboard" link based on actual role dynamically
              if (item.label === "Dashboard" && userRole !== "student") {
                effectiveHref = `/${userRole}`;
              }
              // Adjust "Profile" link for non-student roles
              if (item.label === "Profile" && userRole !== "student") {
                effectiveHref = `/profile/${userRole}`;
              }
              // Adjust "My Children" link for parents to show their children profile
              if (item.label === "My Children" && userRole === "parent") {
                effectiveHref = `/parent/children`;
              }

              // More precise isActive check
              const isActive = (() => {
                // For student Home page
                if (userRole === "student" && item.label === "Home") {
                  return pathname === "/student";
                }

                // For Dashboard pages (admin, teacher, parent)
                if (item.label === "Dashboard" && userRole !== "student") {
                  return (
                    pathname === `/${userRole}` ||
                    (pathname === "/" && effectiveHref === "/")
                  );
                }

                // For exact path matches
                if (pathname === effectiveHref) {
                  return true;
                }

                // For sub-paths (but not for root paths to avoid false positives)
                if (
                  effectiveHref !== "/" &&
                  effectiveHref !== "/student" &&
                  pathname.startsWith(effectiveHref + "/")
                ) {
                  return true;
                }

                return false;
              })();

              if (item.isLogout) {
                return (
                  <button
                    key={item.label}
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className={`flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 transition-all duration-200 w-full
                      ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "opacity-100"
                      }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      <item.icon size={18} className="text-red-500" />
                    </div>
                    <span className="hidden lg:block font-medium">
                      {isLoading ? "Signing out..." : item.label}
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  href={effectiveHref}
                  key={item.label}
                  className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 relative group`}
                >
                  <div
                    className={`absolute left-0 top-0 h-full w-1 rounded-r-md 
                    ${
                      isActive
                        ? "bg-indigo-600"
                        : "bg-transparent group-hover:bg-indigo-200"
                    } transition-all duration-200`}
                  ></div>
                  <div
                    className={`flex items-center justify-center w-8 h-8 ml-2 ${
                      isActive
                        ? "text-indigo-600"
                        : "text-gray-500 group-hover:text-indigo-600"
                    } transition-colors duration-200`}
                  >
                    <item.icon size={18} />
                  </div>
                  <span
                    className={`hidden lg:block ${
                      isActive
                        ? "font-semibold text-indigo-700"
                        : "text-gray-700 group-hover:text-indigo-600"
                    } transition-colors duration-200`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }
            return null;
          })}
        </div>
      ))}

      <div className="hidden lg:block px-4 py-4 mt-6">
        <div className="border-t border-gray-200 pt-4">
                          <div className="text-xs text-center text-gray-400">Brightly v1.0</div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
