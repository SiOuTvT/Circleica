import { getRedisConfig } from "./service-config"
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

// ============ 故障可见性 ============

/**
 * 缓存故障告警（限流 60s 一次）。
 *
 * Redis 不可用时每个请求都会走 catch，直接打日志会瞬间刷屏；
 * 但完全静默又会让"缓存全失效、全部回源打库"变成看不见的故障。
 */
let lastCacheWarnAt = 0
const CACHE_WARN_INTERVAL_MS = 60_000

function warnCacheFailureThrottled(op: string, key: string, err: unknown): void {
  const now = Date.now()
  if (now - lastCacheWarnAt < CACHE_WARN_INTERVAL_MS) return
  lastCacheWarnAt = now
  logger.db.warn(`[cache] Redis ${op} 失败，已回退直连数据源（60s 内不再重复告警）`, {
    key,
    error: err instanceof Error ? err.message : String(err),
  })
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
    } catch (err) {
      // 读缓存失败会静默退化为 100% 回源打库，不留痕迹就无从察觉 Redis 已挂，
      // 这里降噪记录（限流避免刷屏），保持"失败即回源"的行为不变。
      warnCacheFailureThrottled("get", key, err)
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
    // Upstash REST 不支持 DEL 通配符，需用 SCAN 游标遍历 + pipeline 批量删除。
    // 所有本项目的缓存 key 都以 cacheKey() 生成的 "circleica:" 为前缀。
    try {
      const match = "circleica:*"
      let cursor = "0"
      do {
        const res = await this.request(`/scan/${cursor}?cursor=${cursor}&match=${encodeURIComponent(match)}`)
        const keys: string[] = Array.isArray(res.result) ? res.result : []
        if (keys.length > 0) {
          await this.request("/pipeline", {
            method: "POST",
            body: JSON.stringify(keys.map((k) => ["del", k])),
          })
        }
        cursor = String(res.cursor ?? "0")
      } while (cursor !== "0")
    } catch (error) {
      logger.db.error("Redis clear error", error)
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      // 使用 MULTI 保证 incr + expire 原子性，避免进程崩溃导致 key 永不过期
      const result = await this.request(`/pipeline`, {
        method: "POST",
        body: JSON.stringify(ttlSeconds
          ? [["incr", key], ["expire", key, ttlSeconds]]
          : [["incr", key]]
        ),
      })
      // Upstash pipeline 返回数组，第一个元素是 incr 结果
      const count = Array.isArray(result.result) ? result.result[0]?.result as number : result.result as number
      return count ?? 0
    } catch {
      // pipeline 不可用时降级为非原子操作
      try {
        const result = await this.request(`/incr/${encodeURIComponent(key)}`)
        const count = result.result as number
        if (count === 1 && ttlSeconds) {
          await this.request(`/expire/${encodeURIComponent(key)}/${ttlSeconds}`)
        }
        return count
      } catch {
        return 0
      }
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

// ============ 运行时后端选择（反映 Redis 实时可用性）============
// 重要：服务配置（Redis URL/Token）在模块加载时是异步加载的，可能在
// 此处求值时尚未就绪。若在此刻冻结后端实例，会导致 Redis 配置就绪后
// 缓存/限流仍走内存实现 —— 分布式限流永不生效，多副本下认证限流被绕过。
// 因此用惰性代理：每次调用时按 getRedisConfig() 的实时值选择后端。

const _memoryFallback = new MemoryCache()
let _redisCache: RedisCache | null = null
let _redisCacheUrl: string | null = null

function getActiveCache(): CacheClient {
  const cfg = getRedisConfig()
  if (cfg) {
    if (!_redisCache || _redisCacheUrl !== cfg.url) {
      _redisCache = new RedisCache(cfg.url, cfg.token)
      _redisCacheUrl = cfg.url
    }
    return _redisCache
  }
  return _memoryFallback
}

/** 对外缓存实例：方法调用时按 Redis 实时可用性委托给对应后端 */
export const cache: CacheClient = {
  get: (k) => getActiveCache().get(k),
  set: (k, v, t) => getActiveCache().set(k, v, t),
  del: (k) => getActiveCache().del(k),
  has: (k) => getActiveCache().has(k),
  clear: () => getActiveCache().clear(),
  incr: (k, t) => getActiveCache().incr(k, t),
}

/** 是否使用 Redis 后端（实时） */
export const isRedisAvailable = (): boolean => !!getRedisConfig()

// ============ 便捷缓存工具 ============

/**
 * 进程内在途请求表（single-flight）。
 *
 * 解决缓存击穿：key 过期的瞬间，所有并发请求都会判定未命中并同时打到数据库。
 * 同一 key 只放行一次 fetcher，其余调用复用同一个 Promise。
 */
const inFlight = new Map<string, Promise<unknown>>()

/**
 * 给 TTL 施加 ±10% 抖动，避免缓存雪崩。
 *
 * 固定 TTL 会让「部署/重启后同一时刻批量生成的 key」在未来同一时刻集体过期，
 * 形成周期性的同步回源尖峰。
 */
function jitterTtl(ttlSeconds: number): number {
  if (ttlSeconds <= 0) return ttlSeconds
  const delta = ttlSeconds * 0.1
  return Math.max(1, Math.round(ttlSeconds + (Math.random() * 2 - 1) * delta))
}

/**
 * 带缓存的数据获取
 * 如果缓存中有数据则直接返回，否则执行 fetcher 并缓存结果
 *
 * 特性：命中判定区分「未缓存」与「缓存了 null」；同 key 并发只回源一次；TTL 带抖动。
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const cachedValue = await cache.get<T>(key)
  if (cachedValue !== null) return cachedValue

  // 已有同 key 在途：复用，避免并发穿透
  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const task = (async () => {
    try {
      const value = await fetcher()
      await cache.set(key, value, jitterTtl(ttlSeconds))
      return value
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, task)
  return task
}

/**
 * 生成带命名空间的缓存 key
 */
export function cacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `circleica:${namespace}:${parts.join(":")}`
}