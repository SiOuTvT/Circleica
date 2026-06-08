import { features } from "./env"
import { logger } from "./logger"

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
  /** 原子递增并返回新值，key 不存在时从 0 开始 */
  incr(key: string, ttlSeconds?: number): Promise<number>
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
      // 使用 POST body 避免 URL 长度限制
      const path = ttlSeconds
        ? `/set/${encodeURIComponent(key)}?ex=${ttlSeconds}`
        : `/set/${encodeURIComponent(key)}`
      await this.request(path, {
        method: "POST",
        body: serialized,
      })
    } catch (error) {
      logger.db.error("Redis set error", error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.request(`/del/${encodeURIComponent(key)}`)
    } catch (error) {
      logger.db.error("Redis del error", error)
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
    logger.db.warn("Redis clear() not implemented for Upstash - use key prefixes and del()")
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await this.request(`/incr/${encodeURIComponent(key)}`)
      const count = result.result as number
      // 首次递增时设置过期（count === 1 表示刚创建）
      if (count === 1 && ttlSeconds) {
        await this.request(`/expire/${encodeURIComponent(key)}/${ttlSeconds}`)
      }
      return count
    } catch {
      return 0
    }
  }
}

// ============ 内存缓存实现 (LRU) ============

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

  /** 将 key 移到 Map 末尾（标记为最近使用） */
  private touch(key: string, entry: MemoryEntry): void {
    this.store.delete(key)
    this.store.set(key, entry)
  }

  /** 淘汰最久未使用的条目 */
  private evict(): void {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    // LRU：访问时移到末尾
    this.touch(key, entry)
    return entry.value as T
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    // 如果 key 已存在，先删除再重新插入（更新位置）
    this.store.delete(key)
    this.evict()

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

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const entry = this.store.get(key)
    if (!entry || (entry.expiresAt && Date.now() > entry.expiresAt)) {
      // 新建或已过期
      this.evict()
      this.store.set(key, {
        value: 1,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      })
      return 1
    }
    const newVal = (entry.value as number) + 1
    entry.value = newVal
    // LRU：更新时移到末尾
    this.touch(key, entry)
    return newVal
  }
}

// ============ 创建缓存实例 ============

function createCache(): CacheClient {
  if (features.redis) {
    logger.db.info("Redis 缓存已启用")
    return new RedisCache(
      process.env.UPSTASH_REDIS_REST_URL!,
      process.env.UPSTASH_REDIS_REST_TOKEN!
    )
  }

  logger.db.info("使用内存缓存（配置 UPSTASH_REDIS_REST_URL 以启用 Redis）")
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