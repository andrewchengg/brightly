// Simple in-memory cache for quest data
interface CacheEntry {
  data: any;
  timestamp: number;
}

class QuestCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Remove expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

export const questCache = new QuestCache();

// Cleanup expired entries every 5 minutes
setInterval(() => questCache.cleanup(), 5 * 60 * 1000);
