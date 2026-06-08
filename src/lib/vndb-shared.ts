/**
 * VNDB 共享数据处理逻辑
 * vndb-client.ts（浏览器端）和 vndb.ts（服务器端）共用的结果处理函数
 */

import { KNOWN_PRODUCER_IDS, STAFF_SEARCH_TERMS, POPULAR_VN_SEARCHES } from "./vndb-constants"

// ============ 共享接口 ============

export interface VNDBResponse {
  results: Array<Record<string, unknown>>
  more?: boolean
}

export interface StaffResult {
  id: string
  name: string
  original?: string
  description?: string
  gender?: string
  roles: string[]
  vns: Array<{
    id: string
    title: string
    original?: string
    role: string
    rating?: number
    image?: string
  }>
  vndbId: string
  source: "vndb-staff"
}

export interface ProducerResult {
  id: string
  name: string
  original?: string
  image?: string
  vndbId: string
  type?: string
  description?: string
  source: "vndb-producer"
}

export interface CharacterResult {
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
  traits: Array<{ name: string; groupName: string }>
  vnTitle: string
  vndbId: string
}

// ============ 共享常量（重新导出） ============

export { KNOWN_PRODUCER_IDS, STAFF_SEARCH_TERMS, POPULAR_VN_SEARCHES }

// ============ Staff 搜索参数 ============

export const STAFF_SEARCH_FIELDS = "id,name,original,description,gender,vns.role,vns.title,vns.id"
export const STAFF_SEARCH_RESULTS = 25

// ============ 结果处理函数 ============

/**
 * 处理 staff 搜索结果，返回随机选择的 staff
 */
export function processStaffResults(
  data: VNDBResponse,
): StaffResult | null {
  const staffList = (data.results || []).filter((s: Record<string, unknown>) => !!s.id)
  if (staffList.length === 0) return null

  // 优先选择有作品的 staff
  const withWorks = staffList.filter((s: Record<string, unknown>) => s.vns && (s.vns as unknown[]).length > 0)
  const pool = withWorks.length > 0 ? withWorks : staffList

  const staff = pool[Math.floor(Math.random() * pool.length)] as Record<string, unknown>
  const vns = (staff.vns || []) as Array<{ id: string; title: string; original?: string; role: string; rating?: number; image?: { url: string } }>

  const roles = [...new Set(vns.map(v => v.role).filter(Boolean))] as string[]
  const processedVns = vns.slice(0, 10).map(v => ({
    id: v.id || "",
    title: v.title || "",
    original: v.original || "",
    role: v.role || "",
    rating: v.rating,
    image: v.image?.url,
  }))

  return {
    id: staff.id as string,
    name: staff.name as string,
    original: staff.original as string | undefined,
    description: staff.description as string | undefined,
    gender: staff.gender as string | undefined,
    vndbId: (staff.id as string).replace("s", ""),
    roles,
    vns: processedVns,
    source: "vndb-staff",
  }
}

/**
 * 处理 producer 搜索结果
 */
export function processProducerResults(
  data: VNDBResponse,
): ProducerResult | null {
  const producers = data.results || []
  if (producers.length === 0) return null

  const producer = producers[0] as Record<string, unknown>
  return {
    id: producer.id as string,
    name: (producer.name as string) || "未知创作者",
    original: producer.original as string | undefined,
    image: (producer.image as { url?: string })?.url,
    vndbId: (producer.id as string).replace("p", ""),
    type: producer.type as string | undefined,
    description: producer.description as string | undefined,
    source: "vndb-producer",
  }
}

/**
 * 处理 character 搜索结果，从 VN 列表中提取随机角色
 */
export function processCharacterResults(
  data: VNDBResponse,
): CharacterResult | null {
  const vns = data.results || []
  if (vns.length === 0) return null

  // 收集所有角色
  const allCharacters: Array<{ character: Record<string, unknown>; vnTitle: string }> = []
  for (const vn of vns) {
    const vnRecord = vn as Record<string, unknown>
    if (vnRecord.va) {
      for (const va of vnRecord.va as Array<{ character?: Record<string, unknown> }>) {
        if (va.character) {
          allCharacters.push({ character: va.character, vnTitle: vnRecord.title as string })
        }
      }
    }
  }

  if (allCharacters.length === 0) return null

  // 随机选择一个角色
  const randomIndex = Math.floor(Math.random() * allCharacters.length)
  const { character, vnTitle } = allCharacters[randomIndex]

  // 处理特征（过滤剧透）
  const rawTraits = (character.traits || []) as Array<{ name: string; group_name: string; spoiler: number }>
  const traits = rawTraits
    .filter(t => t.spoiler === 0)
    .map(t => ({ name: t.name, groupName: t.group_name }))

  return {
    id: character.id as string,
    name: (character.name as string) || "未知角色",
    original: character.original as string | undefined,
    image: (character.image as { url?: string })?.url,
    role: character.role as string | undefined,
    gender: character.gender as string[] | undefined,
    age: character.age as number | string | undefined,
    birthday: character.birthday as number[] | undefined,
    bloodType: (character.blood_type as string) || "",
    height: character.height as number | string | undefined,
    weight: character.weight as number | string | undefined,
    bust: character.bust as number | string | undefined,
    waist: character.waist as number | string | undefined,
    hips: character.hips as number | string | undefined,
    cup: character.cup as string | undefined,
    description: (character.description as string) || "",
    aliases: (character.aliases as string[]) || [],
    traits,
    vnTitle,
    vndbId: (character.id as string).replace("c", ""),
  }
}
