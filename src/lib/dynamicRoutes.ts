/**
 * Utility for handling dynamic routes during build
 * This file helps manage which routes should be marked as dynamic
 */

// Force dynamic rendering for specific route segments
export function makeDynamic() {
  return {
    dynamic: "force-dynamic",
  };
}

// Map of routes that should always be dynamic
export const dynamicRoutes = [
  "/api/debug/user-status",
  "/api/practice-sessions/assigned",
  "/api/student/practice-sessions/in-progress",
  "/settings",
];

// Helper to check if a route should be dynamic
export function shouldBeDynamic(path: string): boolean {
  return dynamicRoutes.some((route) => path.startsWith(route));
}

// Dynamic config for pages that need it
export const dynamicConfig = {
  dynamic: "force-dynamic",
  dynamicParams: true,
};
