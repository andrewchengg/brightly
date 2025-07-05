/**
 * Script to enable leaked password protection in Supabase Auth
 * This addresses the security warning about leaked password protection being disabled
 */

const https = require("https");
const { URL } = require("url");

// Configuration
const SUPABASE_PROJECT_REF =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ||
  process.env.SUPABASE_PROJECT_REF;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_PROJECT_REF) {
  console.error("❌ SUPABASE_PROJECT_REF environment variable is required");
  console.log(
    "   You can find this in your Supabase project URL: https://app.supabase.com/project/YOUR_PROJECT_REF"
  );
  process.exit(1);
}

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("❌ SUPABASE_ACCESS_TOKEN environment variable is required");
  console.log("   Generate one at: https://app.supabase.com/account/tokens");
  process.exit(1);
}

/**
 * Make HTTP request to Supabase Management API
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}${path}`
    );

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonResponse);
          } else {
            reject(
              new Error(
                `HTTP ${res.statusCode}: ${
                  jsonResponse.message || responseData
                }`
              )
            );
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Get current auth configuration
 */
async function getCurrentAuthConfig() {
  try {
    console.log("📋 Fetching current auth configuration...");
    const config = await makeRequest("GET", "/auth/config");
    return config;
  } catch (error) {
    console.error("❌ Failed to fetch auth configuration:", error.message);
    throw error;
  }
}

/**
 * Enable leaked password protection
 */
async function enableLeakedPasswordProtection() {
  try {
    console.log("🔧 Enabling leaked password protection...");

    // Get current configuration
    const currentConfig = await getCurrentAuthConfig();

    // Update configuration to enable leaked password protection
    const updatedConfig = {
      ...currentConfig,
      SECURITY_LEAKED_PASSWORD_PROTECTION: true,
      SECURITY_LEAKED_PASSWORD_PROTECTION_ENABLED: true,
    };

    // Remove read-only fields that shouldn't be sent in the update
    delete updatedConfig.JWT_SECRET;
    delete updatedConfig.JWT_EXP;
    delete updatedConfig.REFRESH_TOKEN_EXP;
    delete updatedConfig.SITE_URL;
    delete updatedConfig.URI_ALLOW_LIST;

    const result = await makeRequest("POST", "/auth/config", updatedConfig);

    console.log("✅ Leaked password protection enabled successfully!");
    return result;
  } catch (error) {
    console.error(
      "❌ Failed to enable leaked password protection:",
      error.message
    );
    throw error;
  }
}

/**
 * Check if leaked password protection is enabled
 */
async function checkLeakedPasswordProtection() {
  try {
    const config = await getCurrentAuthConfig();
    const isEnabled =
      config.SECURITY_LEAKED_PASSWORD_PROTECTION === true ||
      config.SECURITY_LEAKED_PASSWORD_PROTECTION_ENABLED === true;

    console.log(
      `🔍 Leaked password protection status: ${
        isEnabled ? "✅ ENABLED" : "❌ DISABLED"
      }`
    );
    return isEnabled;
  } catch (error) {
    console.error(
      "❌ Failed to check leaked password protection status:",
      error.message
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🔐 Supabase Auth Security Configuration Tool");
  console.log("==========================================");

  try {
    // Check current status
    const isCurrentlyEnabled = await checkLeakedPasswordProtection();

    if (isCurrentlyEnabled) {
      console.log("🎉 Leaked password protection is already enabled!");
      return;
    }

    // Enable leaked password protection
    await enableLeakedPasswordProtection();

    // Verify the change
    console.log("🔍 Verifying configuration...");
    const isNowEnabled = await checkLeakedPasswordProtection();

    if (isNowEnabled) {
      console.log("🎉 Security configuration updated successfully!");
      console.log(
        "📝 The leaked password protection warning should now be resolved."
      );
    } else {
      console.log(
        "⚠️  Configuration may not have been applied correctly. Please check manually."
      );
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
    console.log("\n📖 Manual Setup Instructions:");
    console.log("1. Go to your Supabase dashboard");
    console.log("2. Navigate to Authentication > Settings");
    console.log('3. Find "Password Requirements" section');
    console.log('4. Enable "Leaked Password Protection"');
    console.log("5. Save the changes");
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
}

module.exports = {
  enableLeakedPasswordProtection,
  checkLeakedPasswordProtection,
  getCurrentAuthConfig,
};
