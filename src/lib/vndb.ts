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
  private CACHE_TTL = 24 * 60 * 60 // 24小时缓存（秒）

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
      const errorBody = await response.text().catch(() => "unknown")
      console.error(`[VNDB] HTTP error body:`, errorBody)
      throw new Error(`VNDB HTTP error: ${response.status} ${response.statusText} - ${errorBody}`)
    }

    const result = await response.json()
    console.log("[VNDB] 响应成功，结果数量:", result.results?.length || 0)
    return result
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
      console.error("VNDB search failed:", error)
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
          fields: "id,title,alttitle,description,tags.id,tags.name,tags.rating,developers.id,developers.name,developers.original,developers.type,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
        })
        
        if (!data.results || data.results.length === 0) {
          return null
        }
        
        return data.results[0]
      }, this.CACHE_TTL)
    } catch (error) {
      console.error("Failed to fetch VN details:", error)
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
      console.error("VNDB producer search failed:", error)
      throw error
    }
  }

  /**
   * 获取随机 galgame 创作者（脚本家、画师、音乐人等）
   * 使用多个搜索关键词获取更多创作者
   */
  async getRandomDoujinCreator(): Promise<{
    id: string
    name: string
    original?: string
    image?: string
    vndbId: string
    type?: string
    description?: string
  } | null> {
    try {
      console.log("[VNDB] 开始获取随机 galgame 创作者...")
      
      // 使用多个搜索关键词获取更多创作者
      const searchTerms = [
        "key", "type-moon", "yuzusoft", "smee", "alette", "nana", "aselia",
        "fate", "clannad", "muv-luv", "grisaia", "rewrite", "little busters",
        "august", "hook", "frontwing", "minori", "purple", "ensemble",
        "sprite", "tone work", "saga planets", "candy", "lump of sugar",
        "narcissu", "planetarian", "ever17", "remember11", "steins",
        "utsuge", "nakige", "eroge", "galge", "bishoujo",
      ]
      
      // 随机选一个搜索词
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)]
      console.log(`[VNDB] 使用搜索词: "${randomTerm}"`)
      
      const data = await this.sendRequest("producer", {
        filters: ["search", "=", randomTerm],
        fields: "id,name,original,description,type",
        results: 100,
      })
      
      let producers = data.results || []

      if (producers.length === 0) {
        // 如果搜索词没结果，用更通用的词
        console.log("[VNDB] 搜索词无结果，尝试通用搜索...")
        const fallbackData = await this.sendRequest("producer", {
          filters: ["search", "=", "game"],
          fields: "id,name,original,description,type",
          results: 100,
        })
        producers = fallbackData.results || []
        if (producers.length === 0) {
          console.log("[VNDB] 未找到创作者数据")
          return null
        }
      }

      console.log(`[VNDB] 获取到 ${producers.length} 个创作者，随机选择一个...`)

      // 随机选择一个
      const randomIndex = Math.floor(Math.random() * producers.length)
      const producer = producers[randomIndex]

      console.log(`[VNDB] 选中创作者: ${producer.name} (ID: ${producer.id})`)

      return {
        id: producer.id,
        name: producer.name || "未知创作者",
        original: producer.original,
        image: undefined,
        vndbId: producer.id.replace("p", ""),
        type: producer.type,
        description: producer.description,
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
   * 获取随机游戏角色
   */
  async getRandomCharacter(): Promise<{
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
    try {
      console.log("[VNDB] 开始获取随机游戏角色...")
      
      // 搜索热门角色（通过搜索知名VN获取角色）
      const popularSearches = ["fate", "clannad", "steins", "muv-luv", "grisaia", "little busters", "rewrite", "angel beats", "danganronpa", "zero escape"]
      const randomSearch = popularSearches[Math.floor(Math.random() * popularSearches.length)]
      
      const vnData = await this.sendRequest("vn", {
        filters: ["search", "=", randomSearch],
        fields: "id,title,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
        results: 5,
        sort: "rating",
        reverse: true,
      })

      const vns = vnData.results || []
      if (vns.length === 0) {
        console.log("[VNDB] 未找到VN数据")
        return null
      }

      // 收集所有角色
      const allCharacters: Array<{ character: any; vnTitle: string }> = []
      for (const vn of vns) {
        if (vn.va) {
          for (const va of vn.va) {
            if (va.character) {
              allCharacters.push({ character: va.character, vnTitle: vn.title })
            }
          }
        }
      }

      if (allCharacters.length === 0) {
        console.log("[VNDB] 未找到角色数据")
        return null
      }

      // 随机选择一个角色
      const randomIndex = Math.floor(Math.random() * allCharacters.length)
      const { character, vnTitle } = allCharacters[randomIndex]

      console.log(`[VNDB] 选中角色: ${character.name} (ID: ${character.id})`)

      // 处理图片URL
      let imageUrl: string | undefined
      if (character.image?.url) {
        imageUrl = character.image.url
      }

      // 处理特征
      const traits = character.traits
        ?.filter((t: any) => t.spoiler === 0)
        .map((t: any) => ({ name: t.name, groupName: t.group_name })) || []

      return {
        id: character.id,
        name: character.name || "未知角色",
        original: character.original,
        image: imageUrl,
        role: character.role,
        gender: character.gender,
        age: character.age,
        birthday: character.birthday,
        bloodType: character.blood_type,
        height: character.height,
        weight: character.weight,
        bust: character.bust,
        waist: character.waist,
        hips: character.hips,
        cup: character.cup,
        description: character.description,
        aliases: character.aliases,
        traits,
        vnTitle,
      }
    } catch (error) {
      console.error("[VNDB] Failed to fetch random character:", error)
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
   * 清除所有缓存
   */
  async clearCache(): Promise<void> {
    await cache.clear()
  }
}

// 导出单例实例
export const vndbClient = new VNDBClient()
export default VNDBClient