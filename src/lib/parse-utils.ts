/**
 * 安全解析 JSON 字符串为数组
 * 兼容旧格式纯文本（逗号/斜号/顿号分隔）
 */
export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
  } catch {
    // 不是 JSON，按分隔符拆分
  }
  return raw.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
}

export type FileSizeEntry = { value: string; unit: string }

/**
 * 安全解析文件大小字符串
 * 兼容旧格式纯文本
 */
export function parseFileSizes(raw: string | null | undefined): FileSizeEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter(e => e && e.value)
  } catch {
    // 不是 JSON，按分隔符拆分
  }
  const parts = raw.split(/[、,，]/).map(s => s.trim()).filter(Boolean)
  return parts.map(part => {
    const m = part.match(/([\d.]+)\s*(MB|GB)/i)
    if (m) return { value: m[1], unit: m[2].toUpperCase() }
    return { value: part, unit: "" }
  })
}

/**
 * 安全解析任意 JSON 字符串
 * 解析失败返回 fallback
 * 兼容 Prisma Json 类型（已解析的对象直接返回）
 */
export function safeParse<T>(raw: string | unknown | null | undefined, fallback: T): T {
  if (!raw) return fallback
  // Prisma Json 类型已经是对象，直接返回
  if (typeof raw === "object") return raw as T
  try {
    return JSON.parse(raw as string)
  } catch {
    return fallback
  }
}