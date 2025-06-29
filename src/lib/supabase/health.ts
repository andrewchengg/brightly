// src/lib/supabase/health.ts
// Performance monitoring for Supabase connections

let healthStats = {
  totalRequests: 0,
  totalTime: 0,
  errors: 0,
  lastCheck: Date.now(),
};

export const trackSupabasePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  healthStats.totalRequests++;

  try {
    const result = await fn();
    const duration = Date.now() - start;
    healthStats.totalTime += duration;

    // Log slow operations in development
    if (process.env.NODE_ENV === "development" && duration > 1000) {
      console.warn(
        `🐌 Slow Supabase operation: ${operation} took ${duration}ms`
      );
    }

    return result;
  } catch (error) {
    healthStats.errors++;
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.error(
        `❌ Supabase operation failed: ${operation} (${duration}ms)`,
        error
      );
    }

    throw error;
  }
};

export const getSupabaseHealthStats = () => {
  const avgTime =
    healthStats.totalRequests > 0
      ? Math.round(healthStats.totalTime / healthStats.totalRequests)
      : 0;

  return {
    averageResponseTime: avgTime,
    totalRequests: healthStats.totalRequests,
    errorRate:
      healthStats.totalRequests > 0
        ? Math.round((healthStats.errors / healthStats.totalRequests) * 100)
        : 0,
    uptime: Date.now() - healthStats.lastCheck,
  };
};

export const resetHealthStats = () => {
  healthStats = {
    totalRequests: 0,
    totalTime: 0,
    errors: 0,
    lastCheck: Date.now(),
  };
};
