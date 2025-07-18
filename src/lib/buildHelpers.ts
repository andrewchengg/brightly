/**
 * Helpers for Next.js build process
 */

// Check if we're in a build environment
export const isBuildEnv =
  process.env.NODE_ENV === "production" && !process.env.NEXT_RUNTIME;

// Safely serialize objects for server components
export function safeSerialize(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  // For arrays, map each item
  if (Array.isArray(obj)) {
    return obj.map((item) => safeSerialize(item));
  }

  // For Date objects, convert to ISO string
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // For normal objects, process each property
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "function") {
      // Skip functions
      continue;
    }

    try {
      // Attempt to serialize the value
      result[key] = safeSerialize(value);
    } catch (e) {
      // If serialization fails, use a placeholder
      result[key] = `[Unserializable: ${typeof value}]`;
    }
  }

  return result;
}

// Helper to safely wrap data for build-time rendering
export function buildSafeData<T>(data: T): T {
  return isBuildEnv ? (safeSerialize(data) as T) : data;
}
