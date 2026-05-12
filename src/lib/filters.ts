
/**
 * 根据 NSFW 设置生成游戏查询的 where 条件
 * @param nsfwEnabled 是否启用 NSFW 内容
 * @returns 过滤条件
 */
export function getGameNsfwFilter(nsfwEnabled: boolean): Record<string, unknown> {
  return nsfwEnabled ? {} : { isNsfw: false }
}

/**
 * 解析请求中的 NSFW 参数
 * @param searchParams URLSearchParams 或类似对象
 * @returns 是否启用 NSFW
 */
export function parseNsfwParam(
  searchParams: { get?: (key: string) => string | null; [key: string]: unknown } | Record<string, unknown>,
  fallback: boolean = false
): boolean {
  // 支持 URLSearchParams
  if (searchParams.get && typeof searchParams.get === "function") {
    const value = (searchParams as { get: (key: string) => string | null }).get("nsfw")
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
 * @returns where 条件对象
 */
export function buildGameSearchFilter(options: {
  q?: string
  tag?: string
  nsfw?: boolean
  publishedOnly?: boolean
}): Record<string, unknown> {
  const { q = "", tag = "", nsfw = false, publishedOnly = true } = options

  const where: Record<string, unknown> = {
    ...(publishedOnly && { isPublished: true }),
    ...getGameNsfwFilter(nsfw),
  }

  // 标签筛选（精确匹配，作为顶层 AND 条件）
  if (tag && tag !== "全部") {
    where.tags = { some: { tag: { name: tag } } }
  }

  // 搜索关键词（当已指定标签时，不在 OR 中重复搜索 tags，避免冲突）
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { originalWork: { contains: q, mode: "insensitive" } },
      // 仅在未指定精确标签时，才将关键词模糊匹配加入 tags 搜索
      ...(tag && tag !== "全部"
        ? []
        : [{ tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } }]),
    ]
  }

  return where
}
