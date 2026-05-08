import { features } from "./env"

/**
 * Redis 客户端（带内存缓存降级）
 * 当 Upstash Redis 未配置时，自动降级为内存缓存
 * 确保开发环境无需 Redis 也能正常运行
 */

// ============ 类型定义 ============

interface CacheClient {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  has(key: string): Promise<boolean>
  clear(): Promise<void>
}

// ============ Redis 实现 ============

class RedisCache implements CacheClient {
  private url: string
  private token: string

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  private async request(path: string, options?: RequestInit) {
    const res = await fetch(`${this.url}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })
    if (!res.ok) {
      throw new Error(`Redis request failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.request(`/get/${encodeURIComponent(key)}`)
      if (result.result === null) return null
      return typeof result.result === "string"
        ? JSON.parse(result.result)
        : result.result
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      const path = ttlSeconds
        ? `/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}?ex=${ttlSeconds}`
        : `/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}`
      await this.request(path)
    } catch (error) {
      console.error("Redis set error:", error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.request(`/del/${encodeURIComponent(key)}`)
    } catch (error) {
      console.error("Redis del error:", error)
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.request(`/exists/${encodeURIComponent(key)}`)
      return result.result === 1
    } catch {
      return false
    }
  }

  async clear(): Promise<void> {
    // Upstash 不支持通配符删除，需要逐个删除
    // 建议使用 key 前缀 + SCAN
    console.warn("Redis clear() not implemented for Upstash - use key prefixes and del()")
  }
}

// ============ 内存缓存实现 ============

interface MemoryEntry {
  value: unknown
  expiresAt: number | null
}

class MemoryCache implements CacheClient {
  private store = new Map<string, MemoryEntry>()
  private maxSize: number

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    // 如果超过最大容量，删除最早的条目
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }

    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key)
    if (!entry) return false

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }

    return true
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}

// ============ 创建缓存实例 ============

function createCache(): CacheClient {
  if (features.redis) {
    console.log("🔴 Redis 缓存已启用")
    return new RedisCache(
      process.env.UPSTASH_REDIS_REST_URL!,
      process.env.UPSTASH_REDIS_REST_TOKEN!
    )
  }

  console.log("💾 使用内存缓存（配置 UPSTASH_REDIS_REST_URL 以启用 Redis）")
  return new MemoryCache()
}

export const cache = createCache()

/** 是否使用 Redis 后端 */
export const isRedisAvailable = (): boolean => features.redis

// ============ 便捷缓存工具 ============

/**
 * 带缓存的数据获取
 * 如果缓存中有数据则直接返回，否则执行 fetcher 并缓存结果
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const cachedValue = await cache.get<T>(key)
  if (cachedValue !== null) return cachedValue

  const value = await fetcher()
  await cache.set(key, value, ttlSeconds)
  return value
}

/**
 * 生成带命名空间的缓存 key
 */
export function cacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `fangame:${namespace}:${parts.join(":")}`
}