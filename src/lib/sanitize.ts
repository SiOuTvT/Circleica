import DOMPurify from "isomorphic-dompurify"

/**
 * 输入清理工具
 * 用于清理用户输入，防止 XSS 和注入攻击
 */

/**
 * 清理 HTML 标签，防止 XSS（使用 DOMPurify 确保安全）
 */
export function stripHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

/**
 * 清理字符串，移除危险字符
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // 移除尖括号
    .replace(/javascript:/gi, "") // 移除 javascript: 协议
    .replace(/on\w+=/gi, "") // 移除事件处理器
    .trim()
}

/**
 * 清理搜索查询
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>{}()[\]\\\/]/g, "") // 移除特殊字符
    .replace(/\s+/g, " ") // 合并多个空格
    .trim()
    .slice(0, 100) // 限制长度
}

/**
 * 清理文件名
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, "") // 只保留安全字符
    .replace(/\.{2,}/g, ".") // 防止路径遍历
    .slice(0, 255) // 限制长度
}


/**
 * 验证并清理 URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    // 只允许 http 和 https 协议
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * 清理对象中的所有字符串字段
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (typeof result[field] === "string") {
      ;(result[field] as unknown) = sanitizeString(result[field] as string)
    }
  }
  return result
}