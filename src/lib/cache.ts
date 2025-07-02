/**
 * 简单的内存缓存实现
 * 在生产环境中建议使用Redis等外部缓存
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttlMs: number = 300000): void { // 默认5分钟
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 全局缓存实例
const globalCache = new MemoryCache(1000);

// 定期清理过期缓存
if (typeof window === 'undefined') { // 只在服务端运行
  setInterval(() => {
    globalCache.cleanup();
  }, 60000); // 每分钟清理一次
}

/**
 * 缓存装饰器函数
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttlMs: number = 300000
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = keyGenerator(...args);
    
    // 尝试从缓存获取
    const cached = globalCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 执行原函数
    const result = await fn(...args);
    
    // 存入缓存
    globalCache.set(cacheKey, result, ttlMs);
    
    return result;
  }) as T;
}

/**
 * 缓存键生成器
 */
export const cacheKeys = {
  providers: (includeDisabled: boolean = false) => 
    `providers:${includeDisabled}`,
  
  models: (providerId?: string) => 
    `models:${providerId || 'all'}`,
  
  userPermissions: (userId: string) => 
    `permissions:${userId}`,
  
  userAllowedModels: (userId: string) => 
    `allowed-models:${userId}`,
  
  adminStats: () => 
    'admin:stats',
  
  userStats: (userId: string) => 
    `user:stats:${userId}`,
  
  conversation: (conversationId: string) => 
    `conversation:${conversationId}`,
  
  userConversations: (userId: string) => 
    `conversations:${userId}`,
};

/**
 * 缓存失效函数
 */
export const invalidateCache = {
  providers: () => {
    globalCache.delete(cacheKeys.providers(true));
    globalCache.delete(cacheKeys.providers(false));
  },
  
  models: (providerId?: string) => {
    if (providerId) {
      globalCache.delete(cacheKeys.models(providerId));
    } else {
      // 清除所有模型缓存
      for (const key of Array.from(globalCache['cache'].keys())) {
        if (key.startsWith('models:')) {
          globalCache.delete(key);
        }
      }
    }
  },
  
  userPermissions: (userId: string) => {
    globalCache.delete(cacheKeys.userPermissions(userId));
    globalCache.delete(cacheKeys.userAllowedModels(userId));
  },
  
  adminStats: () => {
    globalCache.delete(cacheKeys.adminStats());
  },
  
  userStats: (userId: string) => {
    globalCache.delete(cacheKeys.userStats(userId));
  },
  
  conversations: (userId?: string) => {
    if (userId) {
      globalCache.delete(cacheKeys.userConversations(userId));
    } else {
      // 清除所有对话缓存
      for (const key of Array.from(globalCache['cache'].keys())) {
        if (key.startsWith('conversation') || key.startsWith('conversations:')) {
          globalCache.delete(key);
        }
      }
    }
  },
  
  all: () => {
    globalCache.clear();
  },
};

/**
 * 缓存统计
 */
export function getCacheStats() {
  return {
    size: globalCache.size(),
    maxSize: globalCache['maxSize'],
    hitRate: 0, // 可以添加命中率统计
  };
}

/**
 * 手动缓存操作
 */
export const cache = {
  get: <T>(key: string): T | null => globalCache.get<T>(key),
  set: <T>(key: string, data: T, ttlMs?: number) => globalCache.set(key, data, ttlMs),
  delete: (key: string) => globalCache.delete(key),
  clear: () => globalCache.clear(),
  cleanup: () => globalCache.cleanup(),
  stats: getCacheStats,
};

export default cache;
