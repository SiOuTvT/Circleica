import { Prisma } from "@prisma/client"

/**
 * 根据 NSFW 设置生成游戏查询的 where 条件
 * @param nsfwEnabled 是否启用 NSFW 内容
 * @returns Prisma.GameWhereInput 过滤条件
 */
export function getGameNsfwFilter(nsfwEnabled: boolean): Prisma.GameWhereInput {
  return nsfwEnabled ? {} : { isNsfw: false }
}

/**
 * 解析请求中的 NSFW 参数
 * @param searchParams URLSearchParams 或类似对象
 * @returns 是否启用 NSFW
 */
export function parseNsfwParam(
  searchParams: { get?: (key: string) => string | null; [key: string]: any } | Record<string, any>,
  fallback: boolean = false
): boolean {
  // 支持 URLSearchParams
  if (searchParams.get && typeof searchParams.get === "function") {
    const value = searchParams.get("nsfw")
    if (value !== null && value !== undefined) {
      return value === "1" || value === "true"
    }
    return fallback
  }

  // 支持普通对象
  if ("nsfw" in searchParams) {
    const value = searchParams.nsfw
    if (value !== undefined && value !== null) {
      return value === "1" || value === "true" || value === true
    }
    return fallback
  }

  return fallback
}

/**
 * 构建游戏搜索的基础 where 条件
 * @param options 搜索选项
 * @returns Prisma.GameWhereInput
 */
export function buildGameSearchFilter(options: {
  q?: string
  tag?: string
  nsfw?: boolean
  publishedOnly?: boolean
}): Prisma.GameWhereInput {
  const { q = "", tag = "", nsfw = false, publishedOnly = true } = options

  const where: Prisma.GameWhereInput = {
    ...(publishedOnly && { isPublished: true }),
    ...getGameNsfwFilter(nsfw),
  }

  // 搜索关键词
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { originalWork: { contains: q, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
    ]
  }

  // 标签筛选
  if (tag && tag !== "全部") {
    where.tags = { some: { tag: { name: tag } } }
  }

  return where
}
