// src/lib/cache.ts
// Simple in-memory cache for frequently accessed data

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Cleanup expired items
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Singleton cache instance
export const cache = new SimpleCache();

// Auto cleanup every 10 minutes
if (typeof window === "undefined") {
  // Server-side only
  setInterval(() => {
    const removed = cache.cleanup();
    if (removed > 0) {
      console.log(`Cache cleanup: removed ${removed} expired items`);
    }
  }, 10 * 60 * 1000);
}

// Cache helper functions for common patterns
export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch data and cache it
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
};

// Predefined cache keys for common data
export const CACHE_KEYS = {
  SUBJECTS: "subjects",
  TOPICS: (subjectId: number) => `topics:${subjectId}`,
  DASHBOARD_STATS: "dashboard:stats",
  QUESTION_STATS: "questions:stats",
} as const;
