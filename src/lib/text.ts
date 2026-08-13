/**
 * 中英文混排间距工具（P2-7）。
 *
 * 在 CJK 字符与拉丁字母 / 数字边界之间插入细空格（U+2009），
 * 提升「中文English」「标题2024」这类混排文本的可读性（pangu.js 式规则）。
 *
 * 设计约束：
 * - 纯函数、幂等：对已含空格 / 细空格的边界不会重复插入。
 * - 只处理「展示用字符串」；不修改原始数据，仅在渲染层调用。
 * - 不触碰 URL / 代码等结构化内容。
 */

const THIN_SPACE = String.fromCharCode(0x2009)

/** 判断码点是否落在 CJK / 日文假名 / 韩文 / 全角形区间。 */
function isCjkCodePoint(cp: number): boolean {
  return (
    (cp >= 0x3400 && cp <= 0x9fff) || // CJK 统一表意 + 扩展 A
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK 兼容表意
    (cp >= 0x3040 && cp <= 0x30ff) || // 平假名 + 片假名
    (cp >= 0xac00 && cp <= 0xd7af) || // Hangul 音节
    (cp >= 0xff00 && cp <= 0xffef) // 全角形
  )
}

const LATIN_RE = /[A-Za-z0-9]/

/** 判断字符是否为半角拉丁字母或数字。 */
function isLatin(ch: string): boolean {
  return LATIN_RE.test(ch)
}

/**
 * 在 CJK 与拉丁 / 数字之间插入细空格（U+2009）。
 * 仅在「CJK 后紧跟拉丁 / 数字」时插入一次，避免双向重复。
 */
export function cjkSpace(input?: string | null): string {
  if (!input) return ""
  let out = ""
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const cp = ch.codePointAt(0) ?? 0
    const next = input[i + 1]
    if (
      isCjkCodePoint(cp) &&
      next != null &&
      isLatin(next) &&
      next !== " " &&
      next !== THIN_SPACE
    ) {
      out += ch + THIN_SPACE
    } else {
      out += ch
    }
  }
  return out
}
