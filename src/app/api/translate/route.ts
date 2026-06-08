import { logger } from "@/lib/logger"
import { checkRateLimit, type RateLimitConfig } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

// 翻译专用限流：每分钟 10 次
const translateRateLimit: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
  message: "翻译请求过于频繁，请稍后再试",
}

/**
 * 翻译代理 API
 * 将英文文本翻译为中文
 * 使用 MyMemory API（免费、国内可访问）作为主翻译源
 * Google Translate 作为备用（国内可能被墙）
 */

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
      // MyMemory 有时返回全大写的失败提示
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

export async function POST(req: NextRequest) {
  // 速率限制
  const rateLimit = await checkRateLimit(translateRateLimit)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: translateRateLimit.message },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.reset),
        },
      }
    )
  }

  try {
    const { text } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: "文本不能为空" }, { status: 400 })
    }

    // 限制文本长度，分段翻译长文本
    const truncated = text.slice(0, 5000)

    // 优先使用 MyMemory（国内可访问），失败则尝试 Google
    let translated = await translateWithMyMemory(truncated)
    if (!translated) {
      logger.api.debug("[Translate] MyMemory 失败，尝试 Google Translate...")
      translated = await translateWithGoogle(truncated)
    }

    if (!translated) {
      return NextResponse.json({ error: "翻译服务暂不可用，请稍后重试" }, { status: 502 })
    }

    return NextResponse.json({ translated })
  } catch (error) {
    logger.api.error("[Translate] Error", error)
    return NextResponse.json({ error: "翻译失败" }, { status: 500 })
  }
}
