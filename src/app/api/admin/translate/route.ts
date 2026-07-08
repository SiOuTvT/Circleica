import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"

/**
 * 后台翻译接口 — 调用 MyMemory 免费翻译 API
 * 支持 en→zh、ja→zh 等方向
 * 单次最大 500 字符（MyMemory 限制），超长文本自动分段
 */

const MAX_SEGMENT = 500

async function translateSegment(text: string, from: string, to: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
  const res = await fetch(url, {
    headers: { "User-Agent": "FangameAdmin/1.0" },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new AppError(`翻译服务响应异常 (${res.status})`, "INTERNAL", 502)
  const data = await res.json()
  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    return data.responseData.translatedText
  }
  throw new AppError(data.responseDetails || "翻译失败", "INTERNAL", 502)
}

/** 将长文本按段落/句子拆分，每段不超过 MAX_SEGMENT */
function splitText(text: string): string[] {
  if (text.length <= MAX_SEGMENT) return [text]

  const segments: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= MAX_SEGMENT) {
      segments.push(remaining)
      break
    }

    // 优先在段落处分割
    let cut = remaining.lastIndexOf("\n\n", MAX_SEGMENT)
    if (cut < MAX_SEGMENT * 0.3) cut = -1

    // 其次在句号/换行处分割
    if (cut < 0) {
      const delimiters = ["\n", ". ", "! ", "? ", "。", "！", "？", "；"]
      for (const d of delimiters) {
        const idx = remaining.lastIndexOf(d, MAX_SEGMENT)
        if (idx > MAX_SEGMENT * 0.3) {
          cut = idx + d.length
          break
        }
      }
    }

    // 最后强制截断
    if (cut < 0) cut = MAX_SEGMENT

    segments.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut).trimStart()
  }

  return segments
}

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const { text, from = "en", to = "zh-CN" } = await req.json()

  if (!text || typeof text !== "string") {
    throw new AppError("缺少翻译文本", "VALIDATION_ERROR", 422)
  }

  if (text.length > 3000) {
    throw new AppError("文本过长，最多 3000 字符", "VALIDATION_ERROR", 422)
  }

  const segments = splitText(text)
  const translated: string[] = []

  for (const seg of segments) {
    const result = await translateSegment(seg, from, to)
    translated.push(result)
    // 分段之间稍作间隔，避免触发限流
    if (segments.length > 1) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  return json({ translatedText: translated.join("\n\n") })
})
