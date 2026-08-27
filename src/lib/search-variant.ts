import type { Prisma } from "@/generated/prisma/client"
import OpenCC from "opencc-js"

// 词组级简繁转换，能正确处理「发/髮/發」「干/幹/乾」等一简对多繁，避免错转换搜出无关游戏。
const s2t = OpenCC.Converter({ from: "cn", to: "t" }) // 简 -> 繁
const t2s = OpenCC.Converter({ from: "t", to: "cn" }) // 繁 -> 简

/**
 * 生成查询词的简体 / 繁体变体，用于双向匹配（不改数据库、不迁移）。
 * 覆盖原始词 + 简→繁 + 繁→简，去重后返回。
 * 英文 / 数字 / 假名等无变化，不会引入噪音变体。
 */
export function toVariants(q: string): string[] {
  const variants = new Set<string>([q])
  const simp = t2s(q) // 繁 -> 简
  const trad = s2t(q) // 简 -> 繁
  if (simp && simp !== q) variants.add(simp)
  if (trad && trad !== q) variants.add(trad)
  return [...variants]
}

const TEXT_FIELDS = ["title", "originalWork", "englishName", "aliases"] as const

/**
 * 与搜索页 / 建议下拉口径一致：对 title / originalWork / englishName / aliases / 标签名
 * 做不区分大小写的包含匹配，并对每个字段叠加简繁变体（OR 合并）。
 */
export function buildGameTextSearchOr(q: string): Prisma.GameWhereInput["OR"] {
  const variants = toVariants(q)
  const or: Prisma.GameWhereInput[] = []
  for (const field of TEXT_FIELDS) {
    for (const v of variants) {
      or.push({ [field]: { contains: v, mode: "insensitive" as const } })
    }
  }
  for (const v of variants) {
    or.push({ tags: { some: { tag: { name: { contains: v, mode: "insensitive" as const } } } } })
  }
  return or
}

/** 仅对 title 做简繁变体匹配（用于搜索建议下拉，保持只匹配标题的原有口径）。 */
export function buildTitleSearchOr(q: string): Prisma.GameWhereInput["OR"] {
  return toVariants(q).map((v) => ({ title: { contains: v, mode: "insensitive" as const } }))
}
