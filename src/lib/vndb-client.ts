/**
 * VNDB 客户端 API（浏览器端直接调用）
 * 用于绕过服务器网络限制，从用户浏览器直接请求 VNDB API
 */

import { KNOWN_PRODUCER_IDS, STAFF_SEARCH_TERMS, POPULAR_VN_SEARCHES } from "./vndb-constants"

const VNDB_BASE = "https://api.vndb.org/kana"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function vndbPost(endpoint: string, data: any, retries = 2): Promise<any> {
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
        if (response.status === 400) {
          throw new Error(`VNDB HTTP error: ${response.status}`)
        }
        throw new Error(`VNDB HTTP error: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      const isLastAttempt = attempt === retries
      if (isLastAttempt) throw error
      
      // 网络错误则重试
      if (error?.message?.includes('fetch failed') || error?.name === 'TimeoutError') {
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
export async function getRandomStaff() {
  // 打乱顺序，尝试最多 5 个不同的搜索词
  const shuffled = [...STAFF_SEARCH_TERMS].sort(() => Math.random() - 0.5)
  const attempts = shuffled.slice(0, 5)
  
  for (const term of attempts) {
    try {
      
      const data = await vndbPost("staff", {
        filters: ["search", "=", term],
        fields: "id,name,original,description,gender,vns.role,vns.title",
        results: 25,
      })
      
      const staffList = (data.results || []).filter((s: any) => s.id)
      if (staffList.length > 0) {
        // 优先选择有作品的 staff
        const withWorks = staffList.filter((s: any) => s.vns && s.vns.length > 0)
        const pool = withWorks.length > 0 ? withWorks : staffList
        
        const staff = pool[Math.floor(Math.random() * pool.length)]
        
        const roles = [...new Set((staff.vns || []).map((v: any) => v.role).filter(Boolean))] as string[]
        const vns = (staff.vns || []).slice(0, 10).map((v: any) => ({
          id: v.id || "",
          title: v.title || "",
          original: v.original || "",
          role: v.role || "",
          rating: v.rating,
          image: v.image?.url,
        }))
        
        return {
          id: staff.id,
          name: staff.name,
          original: staff.original,
          description: staff.description,
          gender: staff.gender,
          vndbId: staff.id.replace("s", ""),
          roles,
          vns,
          source: "vndb-staff",
        }
      }
    } catch (error) {
      console.warn(`[VNDB Client] 关键词 "${term}" 搜索失败:`, error instanceof Error ? error.message : error)
    }
  }
  
  return null
}

/**
 * 获取随机 producer 创作者（客户端，fallback）
 */
export async function getRandomProducer() {
  const randomId = KNOWN_PRODUCER_IDS[Math.floor(Math.random() * KNOWN_PRODUCER_IDS.length)]
  
  const data = await vndbPost("producer", {
    filters: ["id", "=", randomId],
    fields: "id,name,original,description,type",
    results: 1,
  })
  
  const producers = data.results || []
  if (producers.length === 0) return null

  const producer = producers[0]
  return {
    id: producer.id,
    name: producer.name || "未知创作者",
    original: producer.original,
    image: producer.image?.url,
    vndbId: producer.id.replace("p", ""),
    type: producer.type,
    description: producer.description,
    source: "vndb-producer",
  }
}

/**
 * 获取随机角色（客户端）
 */
export async function getRandomCharacter() {
  const randomSearch = POPULAR_VN_SEARCHES[Math.floor(Math.random() * POPULAR_VN_SEARCHES.length)]
  
  const vnData = await vndbPost("vn", {
    filters: ["search", "=", randomSearch],
    fields: "id,title,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
    results: 5,
    sort: "rating",
    reverse: true,
  })

  const vns = vnData.results || []
  if (vns.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (allCharacters.length === 0) return null

  const randomIndex = Math.floor(Math.random() * allCharacters.length)
  const { character, vnTitle } = allCharacters[randomIndex]

  const traits = character.traits
    ?.filter((t: any) => t.spoiler === 0)
    .map((t: any) => ({ name: t.name, groupName: t.group_name })) || []

  return {
    id: character.id,
    name: character.name || "未知角色",
    original: character.original,
    image: character.image?.url,
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
    vndbId: character.id.replace("c", ""),
  }
}