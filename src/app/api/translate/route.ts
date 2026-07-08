import { withHandler, json } from "@/lib/api-handler"
import { logger } from "@/lib/logger"
import { ValidationError } from "@/lib/errors"

// 翻译专用限流：每分钟 10 次
const TRANSLATE_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
  message: "翻译请求过于频繁，请稍后再试",
}

async function translateWithMyMemory(text: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "FangameNext/1.0" },
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

async function translateWithGoogle(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
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
  const { text } = await req.json()

  if (!text?.trim()) {
    throw new ValidationError("文本不能为空")
  }

  // 限制文本长度
  const truncated = text.slice(0, 5000)

  // 优先使用 MyMemory（国内可访问），失败则尝试 Google
  let translated = await translateWithMyMemory(truncated)
  if (!translated) {
    logger.api.debug("[Translate] MyMemory 失败，尝试 Google Translate...")
    translated = await translateWithGoogle(truncated)
  }

  if (!translated) {
    throw new ValidationError("翻译服务暂不可用，请稍后重试")
  }

  return json({ translated })
})
