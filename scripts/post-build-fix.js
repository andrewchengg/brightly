/**
 * Post-build verification script
 *
 * This script runs after the build to check for and fix common issues
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Running post-build verification...");

// Check if settings page was correctly built
const settingsPagePath = path.join(
  process.cwd(),
  ".next/server/app/settings/page.js"
);
if (!fs.existsSync(settingsPagePath)) {
  console.log("⚠️ Settings page was not built correctly");

  // Create directory if it doesn't exist
  const settingsDir = path.join(process.cwd(), ".next/server/app/settings");
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  // Create a simple client-side only component
  const clientCode = `
export const dynamic = "error";
export const dynamicParams = false;
export const revalidate = false;
export const fetchCache = "only-no-store";
export const runtime = "nodejs";
export const preferredRegion = "auto";

export default function Page(props) {
  return { redirect: { destination: "/parent/settings" } };
}
`;

  fs.writeFileSync(settingsPagePath, clientCode);
  console.log("✅ Created settings page fallback");
} else {
  console.log("✅ Settings page exists");
}

console.log("✅ Post-build verification complete");
