// Cache inteligente para scraping
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live em milliseconds
}

class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTtl = 30 * 60 * 1000; // 30 minutos

  set(key: string, data: any, ttl: number = this.defaultTtl): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Limpa entradas expiradas
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const scrapingCache = new InMemoryCache();

// Limpa cache a cada 10 minutos
setInterval(() => {
  scrapingCache.cleanup();
}, 10 * 60 * 1000);