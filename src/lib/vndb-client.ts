/**
 * VNDB 客户端 API（浏览器端直接调用）
 * 用于绕过服务器网络限制，从用户浏览器直接请求 VNDB API
 *
 * 数据处理逻辑共享自 vndb-shared.ts
 */

import { logger } from "./logger"
import {
  type VNDBResponse,
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

const VNDB_BASE = "https://api.vndb.org/kana"

async function vndbPost(endpoint: string, data: Record<string, unknown>, retries = 2): Promise<VNDBResponse> {
  const url = `${VNDB_BASE}/${endpoint}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "FangameNext/1.0",
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        throw new Error(`VNDB HTTP error: ${response.status}`)
      }

      return await response.json()
    } catch (error: unknown) {
      const isLastAttempt = attempt === retries
      if (isLastAttempt) throw error

      // 网络错误则重试
      const err = error as Error & { name?: string }
      if (err?.message?.includes('fetch failed') || err?.name === 'TimeoutError') {
        await new Promise(r => setTimeout(r, 1000 * attempt))
      } else {
        throw error
      }
    }
  }
  throw new Error("VNDB request failed")
}

/**
 * 获取随机 staff 创作者（客户端）
 */
export async function getRandomStaff(): Promise<StaffResult | null> {
  // 打乱顺序，尝试最多 5 个不同的搜索词
  const shuffled = [...STAFF_SEARCH_TERMS].sort(() => Math.random() - 0.5)
  const attempts = shuffled.slice(0, 5)

  for (const term of attempts) {
    try {
      const data = await vndbPost("staff", {
        filters: ["search", "=", term],
        fields: STAFF_SEARCH_FIELDS,
        results: STAFF_SEARCH_RESULTS,
      })

      const result = processStaffResults(data)
      if (result) return result
    } catch (error) {
      logger.db.warn(`[VNDB Client] 关键词 "${term}" 搜索失败`, { error: error instanceof Error ? error.message : String(error) })
    }
  }

  return null
}

/**
 * 获取随机 producer 创作者（客户端，fallback）
 */
export async function getRandomProducer(): Promise<ProducerResult | null> {
  const randomId = KNOWN_PRODUCER_IDS[Math.floor(Math.random() * KNOWN_PRODUCER_IDS.length)]

  const data = await vndbPost("producer", {
    filters: ["id", "=", randomId],
    fields: "id,name,original,description,type",
    results: 1,
  })

  return processProducerResults(data)
}

/**
 * 获取随机角色（客户端）
 */
export async function getRandomCharacter(): Promise<(CharacterResult & { source: string }) | null> {
  const randomSearch = POPULAR_VN_SEARCHES[Math.floor(Math.random() * POPULAR_VN_SEARCHES.length)]

  const vnData = await vndbPost("vn", {
    filters: ["search", "=", randomSearch],
    fields: "id,title,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
    results: 5,
    sort: "rating",
    reverse: true,
  })

  const result = processCharacterResults(vnData)
  return result ? { ...result, source: "vndb" } : null
}
