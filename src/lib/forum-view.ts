import prisma from "@/lib/prisma"
import { forumRepo } from "@/repositories/forum"

const COOKIE = "fv"
const WINDOW_MS = 30 * 60 * 1000 // 30 分钟内同一用户对同一帖只计一次浏览

function parseFv(raw?: string | null): Record<string, number> {
  if (!raw) return {}
  try {
    const o = JSON.parse(raw)
    return o && typeof o === "object" ? (o as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function prune(seen: Record<string, number>, now: number) {
  for (const k of Object.keys(seen)) {
    if (now - seen[k] > WINDOW_MS) delete seen[k]
  }
}

// 浏览量累加 + 去重窗口：同一用户在 WINDOW_MS 内对同一帖只 +1。
// 基于 cookie（登录/未登录访客均计入），无需新表。返回最新浏览数与需要在响应里写回的 cookie。
export async function recordForumView(postId: string, cookieRaw?: string | null) {
  const seen = parseFv(cookieRaw)
  const now = Date.now()
  let cookieValue: string | null = null
  if (now - (seen[postId] ?? 0) < WINDOW_MS) {
    const cur = await prisma.forumPost.findUnique({ where: { id: postId }, select: { viewCount: true } })
    return { viewCount: cur?.viewCount ?? 0, cookieValue: null }
  }
  const updated = await forumRepo.incrementPostView(postId)
  seen[postId] = now
  prune(seen, now)
  cookieValue = JSON.stringify(seen)
  return { viewCount: updated.viewCount, cookieValue }
}

export const FORUM_VIEW_COOKIE = COOKIE
