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
 * 富文本净化白名单（全站唯一来源）
 * 所有需要"保留安全标签并渲染"的富文本（帖子、公告、游戏规则、游戏简介等）
 * 都必须经过此配置净化，禁止在各组件内联重复定义净化白名单。
 */
const RICH_TEXT_ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "a", "img",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "code", "pre",
  "hr", "div", "span", "table", "thead", "tbody", "tr", "th", "td",
] as const

const RICH_TEXT_ALLOWED_ATTR = [
  "href", "src", "alt", "title", "target", "rel",
  "class", "width", "height",
] as const

/**
 * 净化富文本 HTML，保留安全的排版标签（防 XSS）
 * 这是全站富文本渲染的唯一净化入口；`RichTextContent` 与游戏简介渲染均复用它。
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_TEXT_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_TEXT_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
  })
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
  const trimmed = url.trim()
  // 同源相对路径（本地/对象存储上传返回，如 /uploads/xxx.png）直接放行，避免被当作非法 URL 清空
  if (trimmed.startsWith("/")) return trimmed
  try {
    const parsed = new URL(trimmed)
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