import { NextRequest, NextResponse } from "next/server"

/**
 * 翻译代理 API
 * 将英文文本翻译为中文，使用 Google Translate 免费 API
 */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: "文本不能为空" }, { status: 400 })
    }

    // 限制文本长度
    const truncated = text.slice(0, 5000)

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(truncated)}`

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: "翻译服务请求失败" }, { status: 502 })
    }

    const data = await res.json()
    const translated = data[0]?.map((s: string[]) => s[0]).join("") || ""

    if (!translated) {
      return NextResponse.json({ error: "翻译结果为空" }, { status: 502 })
    }

    return NextResponse.json({ translated })
  } catch (error) {
    console.error("[Translate] Error:", error)
    return NextResponse.json({ error: "翻译失败" }, { status: 500 })
  }
}