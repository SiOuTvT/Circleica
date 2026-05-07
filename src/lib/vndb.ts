/**
 * VNDB API 客户端
 * 用于从 VNDB 获取视觉小说和创作者信息
 * API 文档: https://vndb.org/d11
 * 
 * 使用 HTTP API (api.vndb.org/kana)
 * 因为服务器防火墙阻止了 TCP 端口 19535
 */

interface VNDBCharacter {
  id: string
  name: string
  original: string
  image: string
  role: string // main, primary, side
}

interface VNDBProducer {
  id: string
  name: string
  original: string
  type: string // company, individual
}

interface VNDBVisualNovel {
  id: string
  title: string
  alttitle: string
  description: string
  tags: Array<{ id: string; name: string; rating: number }>
  developers: VNDBProducer[]
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

class VNDBClient {
  // 使用 HTTP API endpoint
  private baseUrl = "https://api.vndb.org/kana"
  private cache = new Map<string, { data: any; timestamp: number }>()
  private CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时缓存

  /**
   * 发送 HTTP POST 请求到 VNDB API
   */
  private async sendRequest(endpoint: string, data: any): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`
    console.log("[VNDB] 发送 HTTP 请求:", url)
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FangameNext/1.0",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`VNDB HTTP error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log("[VNDB] 响应成功，结果数量:", result.results?.length || 0)
    return result
  }

  /**
   * 搜索视觉小说
   */
  async searchVisualNovels(query: string, limit = 10): Promise<VNDBSearchResult> {
    const cacheKey = `vn_search_${query}_${limit}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      const data = await this.sendRequest("vn", {
        filters: ["search", "=", query],
        fields: "id,title,alttitle,rating,image.url",
        results: limit,
      })
      this.setCached(cacheKey, data)
      return data
    } catch (error) {
      console.error("VNDB search failed:", error)
      throw error
    }
  }

  /**
   * 获取视觉小说详情
   */
  async getVisualNovel(id: string): Promise<VNDBVisualNovel | null> {
    const cacheKey = `vn_detail_${id}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      const data = await this.sendRequest("vn", {
        filters: ["id", "=", id],
        fields: "id,title,alttitle,description,tags.id,tags.name,tags.rating,developers.id,developers.name,developers.original,developers.type,va.character.id,va.character.name,va.character.original",
      })
      
      if (!data.results || data.results.length === 0) {
        return null
      }
      
      this.setCached(cacheKey, data.results[0])
      return data.results[0]
    } catch (error) {
      console.error("Failed to fetch VN details:", error)
      return null
    }
  }

  /**
   * 搜索创作者（个人）
   */
  async searchProducers(query: string, limit = 10): Promise<VNDBSearchResult> {
    const cacheKey = `producer_search_${query}_${limit}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      const data = await this.sendRequest("producer", {
        filters: ["search", "=", query],
        fields: "id,name,original,description,type",
        results: limit,
      })
      this.setCached(cacheKey, data)
      return data
    } catch (error) {
      console.error("VNDB producer search failed:", error)
      throw error
    }
  }

  /**
   * 获取随机 galgame 创作者（脚本家、画师、音乐人等，不限于同人）
   */
  async getRandomDoujinCreator(): Promise<{
    id: string
    name: string
    original?: string
    image?: string
    vndbId: string
  } | null> {
    try {
      console.log("[VNDB] 开始获取随机 galgame 创作者...")
      
      // 获取个人类型的创作者（脚本家、画师、音乐人等 galgame 相关创作者）
      // 注意：VNDB producer API 不支持 sort 和 image 字段
      const data = await this.sendRequest("producer", {
        filters: ["search", "=", "visual novel"],
        fields: "id,name,original,description,type",
        results: 50,
      })
      
      const producers = data.results || []

      if (producers.length === 0) {
        console.log("[VNDB] 未找到创作者数据")
        return null
      }

      console.log(`[VNDB] 获取到 ${producers.length} 个 galgame 创作者，随机选择一个...`)

      // 随机选择一个
      const randomIndex = Math.floor(Math.random() * producers.length)
      const producer = producers[randomIndex]

      console.log(`[VNDB] 选中创作者: ${producer.name} (ID: ${producer.id})`)

      return {
        id: producer.id,
        name: producer.name || "未知创作者",
        original: producer.original,
        image: undefined, // producer API 不返回 image
        vndbId: producer.id.replace("p", ""),
      }
    } catch (error) {
      console.error("[VNDB] Failed to fetch random creator:", error)
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
    const cacheKey = `producer_detail_${vndbId}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
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

      this.setCached(cacheKey, producer)
      return producer
    } catch (error) {
      console.error("Failed to fetch producer details:", error)
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
      console.error("Failed to validate VNDB work:", error)
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
    creators?: Array<{ name: string; role: string }>
  } | null> {
    try {
      const vn = await this.getVisualNovel(`v${vndbId}`)
      
      if (!vn) return null

      // 提取标签
      const tags = vn.tags
        ?.filter(t => t.rating > 0)
        .map(t => t.name)
        .slice(0, 10) || []

      // 提取创作者信息
      const creators = vn.developers
        ?.map(dev => ({
          name: dev.original || dev.name,
          role: "开发者",
        }))
        .slice(0, 5) || []

      return {
        title: vn.title,
        original: vn.alttitle,
        description: vn.description,
        tags,
        creators,
      }
    } catch (error) {
      console.error("Failed to auto-fill from VNDB:", error)
      return null
    }
  }

  /**
   * 映射角色职责
   */
  private mapCharacterRole(role: string): string {
    const roleMap: Record<string, string> = {
      main: "主角",
      primary: "主要角色",
      side: "次要角色",
    }
    return roleMap[role] || "角色"
  }

  /**
   * 获取缓存数据
   */
  private getCached(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * 设置缓存
   */
  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })

    // 限制缓存大小
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// 导出单例实例
export const vndbClient = new VNDBClient()
export default VNDBClient
