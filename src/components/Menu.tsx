// src/components/Menu.tsx
"use client";

import { useUserRole, useSignOut, useSupabaseUser } from "@/lib/hooks/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation"; // Import useRouter
import Image from "next/image";
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
  FaChevronDown,
  FaChevronUp,
  FaFlag,
  FaCreditCard,
} from "react-icons/fa";

interface StudentInfo {
  name: string;
  level: number;
  img?: string;
}

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
        label: "Ask Ben",
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
        icon: FaChartBar,
        label: "My Results",
        href: "/student/results",
        visible: ["student"],
      },
      {
        icon: FaLightbulb,
        label: "Review",
        href: "/student/review",
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
        icon: FaFlag,
        label: "Question Reports",
        href: "/admin/question-reports",
        visible: ["admin"],
      },
      {
        icon: FaTasks,
        label: "Manage Homework",
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
        icon: FaChartBar,
        label: "Children's Results",
        href: "/parent/results",
        visible: ["parent"],
      },

      {
        icon: FaUserGraduate,
        label: "Students",
        href: "/admin/students",
        visible: ["admin"],
      },
      {
        icon: FaUsers,
        label: "Parents",
        href: "/admin/parents",
        visible: ["admin"],
      },
      {
        icon: FaUserGraduate,
        label: "Students List",
        href: "/list/students",
        visible: ["teacher"],
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
        href: "/parent/settings",
        visible: ["parent"],
      },
      {
        icon: FaCog,
        label: "Settings",
        href: "/settings",
        visible: ["admin", "teacher"],
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
  const { user } = useSupabaseUser();
  const { signOut } = useSignOut();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const pathname = usePathname();
  const router = useRouter(); // For logout redirect
  const [isLoading, setIsLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (role) {
        setUserRole(role);

        // Fetch student info if role is student
        if (role === "student" && user?.id) {
          const fetchStudentInfo = async () => {
            try {
              const response = await fetch(`/api/student/${user.id}`);
              if (response.ok) {
                const data = await response.json();
                setStudentInfo(data);
              }
            } catch (error) {
              console.error("Error fetching student info:", error);
            }
          };
          fetchStudentInfo();
        }

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
  }, [role, isLoaded, user?.id]);

  // Manage loading skeleton display with delay to prevent flickering
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (!isLoaded || !userRole) {
      // Show loading skeleton after a short delay to prevent flickering during quick auth checks
      timeoutId = setTimeout(() => {
        setShowLoadingSkeleton(true);
      }, 150); // 150ms delay
    } else {
      // Hide loading skeleton immediately when data is ready
      setShowLoadingSkeleton(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoaded, userRole]);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      // The signOut function will handle the navigation
    } catch (error) {
      console.error("Error during logout:", error);
      setIsLoading(false);
    }
  };

  if (showLoadingSkeleton) {
    return (
      <div className="mt-8 p-6">
        <div className="flex flex-col gap-4">
          {Array(5)
            .fill(0)
            .map((_, idx) => (
              <div
                key={idx}
                className="h-12 bg-gray-100 rounded-xl animate-pulse shadow-sm"
              ></div>
            ))}
        </div>
      </div>
    );
  }

  // If we still don't have the necessary data after the delay, show a fallback
  if (!isLoaded || !userRole) {
    return null; // Or return a minimal menu if preferred
  }

  // Determine which menu set to use and flatten the items
  const itemsToRender = userRole === "student" ? studentMenuItems : menuItems;
  const allItems = itemsToRender.flatMap((group) => group.items);

  // Prioritize important items to always be visible
  const priorityItems = [
    "Home",
    "Dashboard",
    "Practice",
    "Ask Ben",
    "Weekly Challenge",
    "Mock Exams",
    "My Results",
    "Review",
    "Children's Results",
    "Manage Homework",
    "AI Planner",
    "Child Review",
  ];
  const prioritizedItems = allItems.sort((a, b) => {
    const aIndex = priorityItems.indexOf(a.label);
    const bIndex = priorityItems.indexOf(b.label);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Split items into main menu (first 8 prioritized) and more items
  const mainItems = prioritizedItems.slice(0, 8);
  const moreItems = prioritizedItems.slice(8);

  const renderMenuItem = (item: any) => {
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
            className={`flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-red-50 hover:shadow-sm transition-all duration-300 w-full group border border-transparent hover:border-red-100 min-h-[48px]
              ${isLoading ? "opacity-60 cursor-not-allowed" : "opacity-100"}`}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors duration-300 shadow-sm">
              <item.icon size={16} className="text-red-600" />
            </div>
            <span className="font-semibold text-slate-700 group-hover:text-red-600 transition-colors duration-300">
              {isLoading ? "Signing out..." : item.label}
            </span>
          </button>
        );
      }

      return (
        <Link
          href={effectiveHref}
          key={item.label}
          className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 group border relative overflow-hidden min-h-[48px]
            ${
              isActive
                ? "bg-purple-100 border-purple-200 shadow-sm"
                : "border-transparent hover:bg-gray-50 hover:shadow-sm hover:border-gray-100"
            }`}
        >
          {/* Active indicator */}
          <div
            className={`absolute left-0 top-0 h-full w-1 rounded-r-full transition-all duration-300
              ${isActive ? "bg-purple-800" : "bg-transparent"}`}
          ></div>

          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 shadow-sm ${
              isActive
                ? "bg-purple-100"
                : "bg-gray-50 group-hover:bg-gray-100"
            }`}
          >
            <item.icon
              size={16}
              className={`transition-colors duration-300 ${
                isActive
                  ? "text-purple-800"
                  : "text-gray-600 group-hover:text-purple-800"
              }`}
            />
          </div>

          <span
            className={`font-semibold transition-colors duration-300 ${
              isActive
                ? "text-gray-900"
                : "text-gray-700 group-hover:text-gray-900"
            }`}
          >
            {item.label}
          </span>
        </Link>
      );
    }
    return null;
  };

  return (
    <div className="mt-2 px-2 w-full max-w-sm">
      {/* Main menu items */}
      <div className="space-y-0.5">
        {mainItems.map((item) => renderMenuItem(item))}
      </div>

      {/* More button and additional items */}
      {moreItems.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all duration-300 w-full group border border-transparent hover:border-slate-100 min-h-[48px]"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-all duration-300 shadow-sm">
              {showMore ? (
                <FaChevronUp
                  size={16}
                  className="text-slate-600 group-hover:text-indigo-600 transition-colors duration-300"
                />
              ) : (
                <FaChevronDown
                  size={16}
                  className="text-slate-600 group-hover:text-indigo-600 transition-colors duration-300"
                />
              )}
            </div>
            <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors duration-300">
              More
            </span>
          </button>

          {showMore && (
            <div className="space-y-0.5 mt-3 pl-2 border-l-2 border-slate-100">
              {moreItems.map((item) => renderMenuItem(item))}
            </div>
          )}
        </div>
      )}

      <div className="px-2 py-4 mt-6"></div>
    </div>
  );
};

export default Menu;
