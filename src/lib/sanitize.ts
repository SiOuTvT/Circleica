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
 * 使用 DOMPurify 替代正则替换，防止绕过（如编码攻击、大小写变体等）
 */
export function sanitizeString(input: string): string {
  // 先用 DOMPurify 剥离所有 HTML 标签和危险内容
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
  return cleaned.trim()
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