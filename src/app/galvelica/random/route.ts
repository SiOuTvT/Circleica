import { NextResponse } from "next/server"
import { getRandomWorkSerialId } from "@/lib/galvelica"

// 随机一部作品：取一个随机 serialId 并 302 跳转到其详情页。
// 之前该路由不存在，GalvelicaRandomLink 推到 /galvelica/random 会落到首页，故“随机”无效。
export async function GET(request: Request) {
  try {
    const serialId = await getRandomWorkSerialId()
    if (serialId == null) {
      // 没有可随机的作品时退回作品库，而不是首页
      return NextResponse.redirect(new URL("/galvelica/works", request.url), 302)
    }
    return NextResponse.redirect(new URL(`/galvelica/works/${serialId}`, request.url), 302)
  } catch {
    return NextResponse.redirect(new URL("/galvelica/works", request.url), 302)
  }
}
