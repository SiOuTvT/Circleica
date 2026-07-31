/**
 * slug.ts — 统一 slug 生成工具（Archive 路由稳定可读标识）
 *
 * 规则（与 M2 落地方案一致）：
 * - 来源 name（CJK 优先）/ nameJa，清洗后作为稳定路由标识
 * - 保留 CJK（UTF-8 路径合法，对中文用户更可读，不强行转拼音/罗马音）
 * - 空白/下划线 → 连字符；移除 URL 不安全字符；连字符折叠
 * - 落库后不随 name 变动；唯一性由调用方（创建/回填时）循环 `-2/-3` 保证
 */

export function slugify(input: string): string {
  const s = (input ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // 空白/下划线 → 连字符
    .replace(/[^\p{L}\p{N}-]/gu, "") // 仅保留 字母/数字/连字符（含 CJK）
    .replace(/-+/g, "-") // 折叠连续连字符
    .replace(/^-+|-+$/g, "") // 去首尾连字符
  return s || "item"
}
