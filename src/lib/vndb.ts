/**
 * VNDB API 客户端
 * 用于从 VNDB 获取视觉小说和创作者信息
 * API 文档: https://vndb.org/d11
 * 
 * 使用 HTTP API (api.vndb.org/kana)
 * 因为服务器防火墙阻止了 TCP 端口 19535
 * 
 * 缓存策略：优先使用 Redis（Upstash），未配置时降级为内存缓存
 */
import { cache, cached, cacheKey } from "./redis"
import { logger } from "./logger"
import {
  type StaffResult,
  type ProducerResult,
  type CharacterResult,
  KNOWN_PRODUCER_IDS,
  STAFF_SEARCH_TERMS,
  POPULAR_VN_SEARCHES,
  STAFF_SEARCH_FIELDS,
  STAFF_SEARCH_RESULTS,
  processStaffResults,
  processProducerResults,
  processCharacterResults,
} from "./vndb-shared"
import { cleanTags } from "./vndb-tags"

interface VNDBCharacter {
  id: string
  name: string
  original: string
  aliases?: string[]
  description?: string
  image?: { url: string } | string
  blood_type?: string
  birthday?: number[] // [month, day]
  age?: number | string
  gender?: string[]
  height?: number | string
  weight?: number | string
  bust?: number | string
  waist?: number | string
  hips?: number | string
  cup?: string
  trait?: Array<{
    id: string
    name: string
    group_id: string
    group_name: string
    spoiler: number
  }>
  vns?: Array<{
    id: string
    title: string
    role: string // main, primary, side, appears
    spoiler: number
  }>
  role?: string // main, primary, side (from va relation)
}

interface VNDBProducer {
  id: string
  name: string
  original: string
  type: string // company, individual
}

interface VNDBStaff {
  id: string
  name: string
  original?: string
  role: string // scenario, artist, music, songs, director, etc.
}

interface VNDBVisualNovel {
  id: string
  title: string
  alttitle: string
  description: string
  tags: Array<{ id: string; name: string; rating: number }>
  developers: VNDBProducer[]
  staff?: VNDBStaff[]
  va: Array<{
    character: VNDBCharacter
  }>
}

interface VNDBSearchResult {
  results: Array<{
    id: string
    title?: string
    name?: string
    original?: string
    image?: string
    rating?: number
  }>
  more: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UndiciDispatcher = any

class VNDBClient {
  // 使用 HTTP API endpoint
  private baseUrl = "https://api.vndb.org/kana"
  private CACHE_TTL = 24 * 60 * 60 // 24小时缓存（秒）
  private dispatcher: UndiciDispatcher = null
  private proxyInitialized = false
  
  // 熔断器：当 VNDB 不可达时快速失败，避免长时间阻塞
  private circuitBroken = false
  private circuitBrokenUntil = 0
  private CIRCUIT_BREAK_DURATION = 5 * 60 * 1000 // 5分钟

  /**
   * 初始化代理（延迟加载，避免 import 失败影响启动）
   * 如果未配置代理，强制使用 IPv4 连接（避免 IPv6 不通导致超时）
   */
  private async initProxy() {
    if (this.proxyInitialized) return
    this.proxyInitialized = true

    const proxyUrl = process.env.VNDB_API_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY

    try {
      const undici = await import("undici")

      if (proxyUrl) {
        this.dispatcher = new undici.ProxyAgent(proxyUrl)
        logger.db.debug("[VNDB] 已配置代理", { proxy: proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") })
      } else {
        // 强制 IPv4：Node.js undici fetch 默认优先 IPv6，
        // 但很多国内网络 IPv6 到 api.vndb.org 不通，导致超时
        this.dispatcher = new undici.Agent({ connect: { family: 4 } })
        logger.db.debug("[VNDB] 未配置代理，强制 IPv4 直连")
      }
    } catch (e) {
      logger.db.warn("[VNDB] 无法加载 undici Agent，将使用默认 fetch", { error: e instanceof Error ? e.message : String(e) })
    }
  }

  /**
   * 发送 HTTP POST 请求到 VNDB API（带重试机制 + 代理支持 + 熔断器）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sendRequest(endpoint: string, data: Record<string, unknown>, retries = 2): Promise<any> {
    // 熔断器检查：如果 VNDB 之前不可达，直接快速失败
    if (this.circuitBroken && Date.now() < this.circuitBrokenUntil) {
      const remaining = Math.ceil((this.circuitBrokenUntil - Date.now()) / 1000)
      logger.db.debug("[VNDB] 熔断器已触发，快速失败", { remaining })
      throw new Error("VNDB API 不可达（熔断器已触发）")
    }

    await this.initProxy()

    const url = `${this.baseUrl}/${endpoint}`
    logger.db.debug("[VNDB] 发送 HTTP 请求", { url })
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const fetchOptions: RequestInit & { dispatcher?: UndiciDispatcher } = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "FangameNext/1.0",
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(10000), // 10秒超时
        }
        // 使用 undici.fetch 代替全局 fetch（Next.js 的 fetch 会忽略 dispatcher 参数）
        let response: Response
        if (this.dispatcher) {
        const undici = await import("undici")
          fetchOptions.dispatcher = this.dispatcher
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response = await (undici.fetch as any)(url, fetchOptions)
        } else {
          response = await fetch(url, fetchOptions)
        }

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "unknown")
          logger.db.error("[VNDB] HTTP error body", undefined, { errorBody })
          // 400 错误不重试（参数问题）
          if (response.status === 400) {
            throw new Error(`VNDB HTTP error: ${response.status} ${response.statusText} - ${errorBody}`)
          }
          throw new Error(`VNDB HTTP error: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        logger.db.debug("[VNDB] 响应成功", { resultCount: result.results?.length || 0 })
        return result
      } catch (error: unknown) {
        const err = error as Error & { code?: string; cause?: { code?: string } }
        const isTimeout = err?.code === 'ETIMEDOUT' || err?.code === 'UND_ERR_CONNECT_TIMEOUT' || err?.name === 'TimeoutError'
        const isLastAttempt = attempt === retries
        
        if (isLastAttempt) {
          logger.db.error(`[VNDB] 请求失败（已重试 ${retries} 次）`, err)
          // 触发熔断器：网络不可达时，后续请求快速失败
          if (isTimeout || err?.message?.includes('fetch failed') || err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
            this.circuitBroken = true
            this.circuitBrokenUntil = Date.now() + this.CIRCUIT_BREAK_DURATION
            logger.db.debug(`[VNDB] 熔断器已触发，${this.CIRCUIT_BREAK_DURATION / 1000}秒内不再尝试`)
          }
          throw error
        }

        if (isTimeout || err?.message?.includes('fetch failed') || err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
          const delay = attempt * 500 // 递增延迟: 500ms
          logger.db.debug(`[VNDB] 请求超时，${delay}ms 后重试 (${attempt}/${retries})...`)
          await new Promise(r => setTimeout(r, delay))
        } else {
          throw error // 非网络错误直接抛出
        }
      }
    }
    throw new Error("VNDB request failed after all retries")
  }

  /**
   * 搜索视觉小说
   */
  async searchVisualNovels(query: string, limit = 10): Promise<VNDBSearchResult> {
    const key = cacheKey("vndb", "vn_search", query, limit)
    try {
      return await cached(key, async () => {
        return await this.sendRequest("vn", {
          filters: ["search", "=", query],
          fields: "id,title,alttitle,rating,image.url",
          results: limit,
        })
      }, this.CACHE_TTL)
    } catch (error) {
      logger.db.error("VNDB search failed", error)
      throw error
    }
  }

  /**
   * 获取视觉小说详情
   */
  async getVisualNovel(id: string): Promise<VNDBVisualNovel | null> {
    const key = cacheKey("vndb", "vn_detail", id)
    try {
      return await cached(key, async () => {
        const data = await this.sendRequest("vn", {
          filters: ["id", "=", id],
          fields: "id,title,alttitle,description,tags.id,tags.name,tags.rating,developers.id,developers.name,developers.original,developers.type,staff.id,staff.name,staff.original,staff.role,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
        })
        
        if (!data.results || data.results.length === 0) {
          return null
        }
        
        return data.results[0]
      }, this.CACHE_TTL)
    } catch (error) {
      logger.db.error("Failed to fetch VN details", error)
      return null
    }
  }

  /**
   * 搜索创作者（个人）
   */
  async searchProducers(query: string, limit = 10): Promise<VNDBSearchResult> {
    const key = cacheKey("vndb", "producer_search", query, limit)
    try {
      return await cached(key, async () => {
        return await this.sendRequest("producer", {
          filters: ["search", "=", query],
          fields: "id,name,original,description,type",
          results: limit,
        })
      }, this.CACHE_TTL)
    } catch (error) {
      logger.db.error("VNDB producer search failed", error)
      throw error
    }
  }

  /**
   * 获取随机 galgame 创作者（脚本家、画师、音乐人等）
   * 使用多个搜索关键词获取更多创作者
   */
  async getRandomDoujinCreator(): Promise<ProducerResult | null> {
    try {
      logger.db.debug("[VNDB] 开始获取随机 galgame 创作者...")

      // 直接通过 ID 获取随机创作者（避免搜索 API 不稳定）
      const randomId = KNOWN_PRODUCER_IDS[Math.floor(Math.random() * KNOWN_PRODUCER_IDS.length)]
      logger.db.debug(`[VNDB] 直接获取创作者: ${randomId}`)

      const data = await this.sendRequest("producer", {
        filters: ["id", "=", randomId],
        fields: "id,name,original,description,type",
        results: 1,
      })

      const result = processProducerResults(data)
      if (result) {
        logger.db.debug(`[VNDB] 选中创作者: ${result.name} (ID: ${result.id})`)
      }
      return result
    } catch (error) {
      logger.db.error("[VNDB] Failed to fetch random creator", error)
      return null
    }
  }

  /**
   * 获取随机创作者（staff - 个人创作者，有明确角色如脚本/原画/音乐）
   */
  async getRandomStaffMember(): Promise<StaffResult | null> {
    // 打乱顺序，尝试最多 5 个不同的搜索词（增加命中率）
    const shuffled = [...STAFF_SEARCH_TERMS].sort(() => Math.random() - 0.5)
    const attempts = shuffled.slice(0, 5)

    for (const term of attempts) {
      try {
        logger.db.debug(`[VNDB] 尝试搜索 staff，关键词: "${term}"`)

        const data = await this.sendRequest("staff", {
          filters: ["search", "=", term],
          fields: STAFF_SEARCH_FIELDS,
          results: STAFF_SEARCH_RESULTS,
        })

        const result = processStaffResults(data)
        if (result) {
          logger.db.debug(`[VNDB] 选中 staff: ${result.name} (ID: ${result.id}, 作品数: ${result.vns?.length || 0})`)
          return result
        }

        logger.db.debug(`[VNDB] 关键词 "${term}" 未找到 staff 数据，尝试下一个...`)
      } catch (error) {
        logger.db.warn(`[VNDB] 关键词 "${term}" 搜索失败`, { error: error instanceof Error ? error.message : String(error) })
        // 继续尝试下一个关键词
      }
    }

    logger.db.warn("[VNDB] 所有搜索关键词均未获取到 staff 数据")
    return null
  }

  /**
   * 获取 staff 创作者详情（含参与的作品和角色）
   */
  async getStaffDetail(vndbId: string): Promise<{
    id: string
    name: string
    original?: string
    description?: string
    gender?: string
    vndbId: string
    roles: string[]
    vns: Array<{
      id: string
      title: string
      original?: string
      role: string
      rating?: number
      image?: string
    }>
  } | null> {
    const key = cacheKey("vndb", "staff_detail", vndbId)
    try {
      return await cached(key, async () => {
        // 1. 获取 staff 基本信息
        const staffData = await this.sendRequest("staff", {
          filters: ["id", "=", `s${vndbId}`],
          fields: "id,name,original,description,gender",
          results: 1,
        })

        if (!staffData.results || staffData.results.length === 0) return null

        const staff = staffData.results[0] as Record<string, unknown>
        const staffName = staff.name as string

        // 2. 用 staff 名字搜索 VN（VNDB 搜索接口按游戏名搜索）
        // 尝试多个搜索词以提高命中率
        const searchTerms = [staffName]
        if (staff.original) searchTerms.push(staff.original as string)

        const vns: Array<{
          id: string
          title: string
          original?: string
          role: string
          rating?: number
          image?: string
        }> = []

        const roles = new Set<string>()
        const seenVnIds = new Set<string>()

        for (const term of searchTerms.slice(0, 2)) {
          try {
            const vnData = await this.sendRequest("vn", {
              filters: ["search", "=", term],
              fields: "id,title,staff.id,staff.name,staff.role",
              results: 25,
            })

            if (vnData.results) {
              for (const vn of vnData.results as Array<Record<string, unknown>>) {
                const vnId = vn.id as string
                if (seenVnIds.has(vnId)) continue

                const staffList = (vn.staff || []) as Array<{ id: string; name: string; role: string }>
                const staffRoles = staffList.filter(s => s.id === `s${vndbId}`)
                if (staffRoles.length > 0) {
                  seenVnIds.add(vnId)
                  for (const sr of staffRoles) {
                    roles.add(sr.role)
                    vns.push({
                      id: vnId,
                      title: vn.title as string,
                      role: sr.role,
                    })
                  }
                }
              }
            }
          } catch {
            // individual search failure doesn't block other results
          }
        }

        return {
          id: staff.id as string,
          name: staffName,
          original: staff.original as string | undefined,
          description: staff.description as string | undefined,
          gender: staff.gender as string | undefined,
          vndbId,
          roles: [...roles],
          vns: vns.slice(0, 20),
        }
      }, this.CACHE_TTL)
    } catch (error) {
      logger.db.error("[VNDB] Failed to fetch staff detail", error)
      return null
    }
  }

  /**
   * 获取创作者详情（含开发的作品）
   */
  async getProducer(vndbId: string): Promise<{
    id: string
    name: string
    original?: string
    type: string
    description?: string
    image?: { url: string }
    developed?: Array<{
      id: string
      title: string
      image?: { url: string }
      rating?: number
    }>
  } | null> {
    const key = cacheKey("vndb", "producer_detail", vndbId)
    try {
      return await cached(key, async () => {
        // 获取创作者基本信息
        const data = await this.sendRequest("producer", {
          filters: ["id", "=", `p${vndbId}`],
          fields: "id,name,original,type,description",
          results: 1,
        })

        if (!data.results || data.results.length === 0) {
          return null
        }

        const producer = data.results[0]

        // 通过搜索该创作者名称获取其开发的VN
        try {
          const vnData = await this.sendRequest("vn", {
            filters: ["search", "=", producer.name],
            fields: "id,title,rating,image.url",
            results: 10,
            sort: "rating",
            reverse: true,
          })
          producer.developed = vnData.results || []
        } catch {
          producer.developed = []
        }

        return producer
      }, this.CACHE_TTL)
    } catch (error) {
      logger.db.error("Failed to fetch producer details", error)
      return null
    }
  }

  /**
   * 验证 VNDB ID 是否为同人作品
   */
  async validateDoujinWork(vndbId: string): Promise<{
    isValid: boolean
    isDoujin: boolean
    title?: string
    tags?: string[]
  }> {
    try {
      const vn = await this.getVisualNovel(`v${vndbId}`)
      
      if (!vn) {
        return { isValid: false, isDoujin: false }
      }

      // 检查是否包含同人标签
      const doujinTags = ["doujin", "doujin soft", "indie"]
      const hasDoujinTag = vn.tags?.some(tag => 
        doujinTags.some(dt => tag.name.toLowerCase().includes(dt))
      ) || false

      return {
        isValid: true,
        isDoujin: hasDoujinTag,
        title: vn.title,
        tags: vn.tags?.map(t => t.name),
      }
    } catch (error) {
      logger.db.error("Failed to validate VNDB work", error)
      return { isValid: false, isDoujin: false }
    }
  }

  /**
   * 从 VNDB ID 自动填充游戏信息
   */
  async autoFillFromVNDB(vndbId: string): Promise<{
    title?: string
    original?: string
    description?: string
    tags?: string[]
    creators?: Array<{ vndbId: string; name: string; nameJa: string; role: string }>
  } | null> {
    try {
      const vn = await this.getVisualNovel(`v${vndbId}`)

      if (!vn) return null

      // 提取标签（智能清洗：黑名单过滤 + 翻译 + 去重）
      const tags = cleanTags(
        (vn.tags || []).map(t => ({ name: t.name, rating: t.rating }))
      ).slice(0, 10)

      // 提取创作者信息（staff：脚本、原画、音乐等）
      const creators = (vn.staff || [])
        .filter(s => s.id && s.name)
        .map(s => ({
          vndbId: s.id.replace("s", ""),
          name: s.name,
          nameJa: s.original || "",
          role: s.role || "other",
        }))
        .slice(0, 20)

      return {
        title: vn.title,
        original: vn.alttitle,
        description: vn.description,
        tags,
        creators,
      }
    } catch (error) {
      logger.db.error("Failed to auto-fill from VNDB", error)
      return null
    }
  }

  /**
   * 获取角色详情（通过 VNDB character ID）
   */
  async getCharacterDetail(charId: string): Promise<{
    id: string
    name: string
    original?: string
    image?: string
    role?: string
    gender?: string[]
    age?: number | string
    birthday?: number[]
    bloodType?: string
    height?: number | string
    weight?: number | string
    bust?: number | string
    waist?: number | string
    hips?: number | string
    cup?: string
    description?: string
    aliases?: string[]
    traits?: Array<{ name: string; groupName: string }>
    vnTitle?: string
  } | null> {
    const key = cacheKey("vndb", "char_detail", charId)
    try {
      return await cached(key, async () => {
        // 确保 character ID 有 "c" 前缀（VNDB 格式）
        const fullCharId = charId.startsWith("c") ? charId : `c${charId}`
        const data = await this.sendRequest("character", {
          filters: ["id", "=", fullCharId],
          fields: "id,name,original,aliases,description,image.url,blood_type,birthday,age,gender,height,weight,bust,waist,hips,cup,traits.id,traits.name,traits.group_id,traits.group_name,traits.spoiler,vns.id,vns.title,vns.role,vns.spoiler",
          results: 1,
        })

        if (!data.results || data.results.length === 0) {
          return null
        }

        const c = data.results[0]
        const vn = c.vns?.[0]

        return {
          id: c.id,
          name: c.name || "未知角色",
          original: c.original || "",
          image: c.image?.url || "",
          role: vn?.role || "",
          gender: c.gender || [],
          age: c.age || null,
          birthday: c.birthday || null,
          bloodType: c.blood_type || "",
          height: c.height || "",
          weight: c.weight || "",
          bust: c.bust || "",
          waist: c.waist || "",
          hips: c.hips || "",
          cup: c.cup || "",
          description: c.description || "",
          aliases: c.aliases || [],
          traits: (c.traits || [])
            .filter((t: { spoiler: number }) => t.spoiler === 0)
            .map((t: { name: string; group_name: string }) => ({ name: t.name, groupName: t.group_name })),
          vnTitle: vn?.title || "",
        }
      }, this.CACHE_TTL)
    } catch (error) {
      logger.db.error("[VNDB] Failed to fetch character detail", error)
      return null
    }
  }

  /**
   * 获取随机游戏角色
   */
  async getRandomCharacter(): Promise<CharacterResult | null> {
    try {
      logger.db.debug("[VNDB] 开始获取随机游戏角色...")

      // 搜索热门角色（通过搜索知名VN获取角色）
      const randomSearch = POPULAR_VN_SEARCHES[Math.floor(Math.random() * POPULAR_VN_SEARCHES.length)]

      const vnData = await this.sendRequest("vn", {
        filters: ["search", "=", randomSearch],
        fields: "id,title,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
        results: 5,
        sort: "rating",
        reverse: true,
      })

      const result = processCharacterResults(vnData)
      if (result) {
        logger.db.debug(`[VNDB] 选中角色: ${result.name} (ID: ${result.id})`)
      }
      return result
    } catch (error) {
      logger.db.error("[VNDB] Failed to fetch random character", error)
      return null
    }
  }

  /**
   * 清除所有缓存
   */
  async clearCache(): Promise<void> {
    await cache.clear()
  }
}

// 导出单例实例
export const vndbClient = new VNDBClient()
export default VNDBClient