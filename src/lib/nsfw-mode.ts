import { cookies } from "next/headers"
import { auth } from "@/lib/auth"

/**
 * 主站 NSFW 过滤模式（三段式）：只 SFW / 只 NSFW / 全部。
 * 读取 cookie `nsfw_mode`：sfw=只显示安全（默认） nsfw=只显示露骨 all=全部。
 * 兼容旧值：cookie `nsfw_status` "1"→all（旧"显示露骨"）、"0"→sfw；缺省→sfw。
 * ⚠️ 登录要求：切换过滤需要登录（合规考量，与副站 gal_nsfw 政策一致），
 *    服务端强制"未登录一律 sfw"（防手动改 cookie 绕过登录门槛）。
 *
 * 设计要点：过滤模式必须进共享缓存 key（见 getMainNsfwMode 的调用方），
 * 否则 Redis 共享缓存会跨用户泄漏（A 的 SFW 请求可能命中 B 的 all 结果）。
 */
export type MainNsfwMode = "sfw" | "nsfw" | "all"

export async function resolveMainNsfwMode(): Promise<MainNsfwMode> {
  try {
    // 服务端落地"切换需登录"：未登录一律强制 sfw
    const session = await auth()
    if (!session?.user) return "sfw"
    const store = await cookies()
    const v = store.get("nsfw_mode")?.value
    if (v === "nsfw") return "nsfw"
    if (v === "all" || v === "1") return "all"
    if (v === "sfw" || v === "0") return "sfw"
    const legacy = store.get("nsfw_status")?.value
    if (legacy === "1") return "all"
    return "sfw"
  } catch {
    return "sfw"
  }
}

/** 导出给页面缓存 key 使用：NSFW 过滤模式必须进缓存 key，否则共享缓存跨用户泄漏 */
export async function getMainNsfwMode(): Promise<MainNsfwMode> {
  return resolveMainNsfwMode()
}
