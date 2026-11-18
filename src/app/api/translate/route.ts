import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { logger } from "@/lib/logger"
import { ValidationError, RateLimitError } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireAuth } from "@/lib/auth-context"

// 翻译专用限流：每分钟 10 次
const TRANSLATE_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
  message: "翻译请求过于频繁，请稍后再试",
}

/**
 * 允许的源语言白名单。源语言会拼进第三方请求参数，必须白名单校验，杜绝参数注入。
 * 未提供 source 时沿用历史默认 en，既有调用方行为不变。
 */
const ALLOWED_SOURCES = new Set([
  "en",
  "ja",
  "ko",
  "ru",
  "zh-Hans",
  "zh-Hant",
  "es",
  "fr",
  "de",
  "pt",
  "pt-br",
  "it",
  "nl",
  "pl",
  "tr",
  "vi",
  "th",
  "id",
  "ar",
  "uk",
  "cs",
  "hu",
  "sv",
  "da",
  "fi",
  "no",
])

function normalizeSource(raw: unknown): string {
  return typeof raw === "string" && ALLOWED_SOURCES.has(raw) ? raw : "en"
}

// MyMemory 匿名额度是每天 5000 字符，带上 de（一个邮箱地址）可提到每天 50000 字符。
// 离线批量翻译（几万条标题）靠匿名额度要跑两个月，所以留了这枚开关；
// 未配置时完全不带这个参数，线上行为与历史一致。
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL?.trim() ?? ""

async function translateWithMyMemory(text: string, source: string): Promise<string | null> {
  try {
    const de = MYMEMORY_EMAIL ? `&de=${encodeURIComponent(MYMEMORY_EMAIL)}` : ""
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|zh-CN${de}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Circleica/1.0" },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const result = data.responseData.translatedText
      if (result.toUpperCase() === result && result.length > 50) return null
      return result
    }
    return null
  } catch {
    return null
  }
}

async function translateWithLibre(text: string, source: string): Promise<string | null> {
  try {
    const res = await fetch("https://translate.argosopensearch.com/translate", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target: "zh", format: "text" }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.translatedText === "string" && data.translatedText.trim()
      ? data.translatedText
      : null
  } catch {
    return null
  }
}

async function translateWithGoogle(text: string, source: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data[0]?.map((s: string[]) => s[0]).join("") || null
  } catch {
    return null
  }
}

export const POST = withHandler(async (req) => {
  // 翻译代理走第三方外部服务，匿名调用可被滥用（刷额度 / 成本），须登录后使用。
  await requireAuth()

  const rl = await checkRateLimit(TRANSLATE_RATE_LIMIT)
  if (!rl.success) throw new RateLimitError(TRANSLATE_RATE_LIMIT.message)

  const { text, source } = await safeParseJson(req)

  if (!text?.trim()) {
    throw new ValidationError("文本不能为空")
  }

  // 限制文本长度
  const truncated = text.slice(0, 5000)
  // 源语言：调用方可显式指定（如 ja / ko / ru），缺省沿用 en
  const src = normalizeSource(source)

  // 免费翻译链路（无需密钥）：MyMemory（国内可访问）→ LibreTranslate → Google。
  let translated = await translateWithMyMemory(truncated, src)
  if (!translated) {
    logger.api.debug("[Translate] MyMemory 失败，尝试 LibreTranslate...")
    translated = await translateWithLibre(truncated, src)
  }
  if (!translated) {
    logger.api.debug("[Translate] LibreTranslate 失败，尝试 Google Translate...")
    translated = await translateWithGoogle(truncated, src)
  }

  if (!translated) {
    throw new ValidationError("翻译服务暂不可用，请稍后重试")
  }

  return json({ translated })
})
