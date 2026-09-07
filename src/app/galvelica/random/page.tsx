import Link from "next/link"
import { getRandomWorkSerialId } from "@/lib/galvelica"
import { RandomRedirect } from "@/components/galvelica/random-redirect"

export const dynamic = "force-dynamic"

/**
 * /galvelica/random：取候选 + 客户端跳转。
 * 取不到时（资料库为空 / 全部被 NSFW 过滤掉）渲染一个有内容的兜底页，
 * 绝不空白、绝不出现 main 里零字符。真正的跳转交给 RandomRedirect 用
 * router.replace 完成，绕开服务端 redirect 在流式上下文偶发发不出 307 的问题。
 */
export default async function GalvelicaRandom() {
  const serialId = await getRandomWorkSerialId()
  if (!serialId) {
    return (
      <div className="galvelica-random-empty space-y-4 py-16 text-center">
        <h1 className="galvelica-h1">暂时没有可随机翻阅的作品</h1>
        <p className="galvelica-fs-meta text-muted-foreground">
          资料库当前为空或正在收录中，请稍后再试。
        </p>
        <Link href="/galvelica" className="galvelica-cta galvelica-cta-primary inline-flex">
          返回首页
        </Link>
      </div>
    )
  }
  return <RandomRedirect serialId={serialId} />
}
