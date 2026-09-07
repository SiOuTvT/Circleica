"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * 随机跳转：服务端取到候选 serialId 后，用客户端 router.replace 落到作品详情。
 *
 * 选这个做法的原因：/galvelica/random 这种"取数后 redirect"的服务端路由，在异步
 * Server Component 里 redirect() 偶发会退化成 200 + 空 body（流式响应已 flush 之后
 * 再调用 redirect 发不出 307），首请求 / 冷启动尤甚；实测连发 GET 时前几次停在
 * /galvelica/random、main 零字符、无 Location 头，正是此症。改成客户端 replace
 * 彻底绕开时机问题——与左栏「随机翻开一部」按钮（router.push）走的是同一套可靠机制。
 *
 * 取不到时由服务端直接渲染有内容的兜底页（见 random/page.tsx），本组件只负责"跳得成"。
 */
export function RandomRedirect({ serialId }: { serialId: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/galvelica/works/${serialId}`)
  }, [serialId, router])
  return (
    <div className="galvelica-random-empty space-y-4 py-16 text-center">
      <p className="galvelica-fs-meta text-muted-foreground">正在随机翻开一部作品…</p>
    </div>
  )
}
