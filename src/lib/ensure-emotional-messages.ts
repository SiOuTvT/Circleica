import { prisma } from "./prisma"

/** 预设情感消息种子数据 */
const SEED_DATA = [
  // Toast
  { key: "favorite_added",    category: "toast",   title: "收藏成功",     subtitle: "已加入你的收藏",       imageUrl: "", emoji: "❤️",   enabled: true },
  { key: "favorite_removed",  category: "toast",   title: "取消收藏",     subtitle: "已移出收藏夹",         imageUrl: "", emoji: "💔",   enabled: true },
  { key: "checkin_success",   category: "toast",   title: "签到成功",     subtitle: "今天也要开心哦",       imageUrl: "", emoji: "✅",   enabled: true },
  { key: "checkin_duplicate", category: "toast",   title: "已经签到过了", subtitle: "明天再来吧~",          imageUrl: "", emoji: "☀️",   enabled: true },
  { key: "follow_success",    category: "toast",   title: "关注成功",     subtitle: "将收到ta的动态通知",    imageUrl: "", emoji: "🤝",   enabled: true },
  { key: "unfollow_success",  category: "toast",   title: "取消关注",     subtitle: "已取消关注",           imageUrl: "", emoji: "👋",   enabled: true },
  { key: "comment_success",   category: "toast",   title: "评论成功",     subtitle: "你的评论已发布",       imageUrl: "", emoji: "💬",   enabled: true },
  // Empty
  { key: "empty_favorites",   category: "empty",   title: "收藏夹空空如也",   subtitle: "去探索好玩的游戏吧",       imageUrl: "", emoji: "💝",   enabled: true },
  { key: "empty_comments",    category: "empty",   title: "还没有评论",       subtitle: "来抢沙发吧~",             imageUrl: "", emoji: "🛋️",  enabled: true },
  { key: "empty_forum",       category: "empty",   title: "论坛暂时没有帖子", subtitle: "来发第一个帖子吧",         imageUrl: "", emoji: "📝",   enabled: true },
  { key: "empty_notifications", category: "empty", title: "暂无新通知",       subtitle: "有新动态时会通知你",       imageUrl: "", emoji: "🔔",   enabled: true },
  { key: "empty_play_status", category: "empty",   title: "游戏清单空空的",   subtitle: "添加想玩/在玩/玩过的游戏", imageUrl: "", emoji: "🎮",   enabled: true },
  // Error
  { key: "error_404",         category: "error",   title: "页面不存在",       subtitle: "你迷路了吗？",         imageUrl: "", emoji: "🫠",   enabled: true },
  { key: "error_500",         category: "error",   title: "服务器开小差了",   subtitle: "请稍后再试",           imageUrl: "", emoji: "🔧",   enabled: true },
  { key: "error_network",     category: "error",   title: "网络连接失败",     subtitle: "请检查网络设置",       imageUrl: "", emoji: "📡",   enabled: true },
  { key: "error_unauthorized",category: "error",   title: "请先登录",         subtitle: "登录后才能进行操作",   imageUrl: "", emoji: "🔒",   enabled: true },
  // Success
  { key: "success_register",  category: "success", title: "注册成功",         subtitle: "欢迎加入！",           imageUrl: "", emoji: "🎉",   enabled: true },
  { key: "success_profile",   category: "success", title: "资料更新成功",     subtitle: "你的个人资料已保存",   imageUrl: "", emoji: "✨",   enabled: true },
]

let initPromise: Promise<void> | null = null

/**
 * 确保预设情感消息存在
 * 首次访问时自动创建，使用 Promise 锁防止并发重复创建
 */
export async function ensureEmotionalMessages() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const existing = await prisma.emotionalMessage.findMany({
        where: { key: { in: SEED_DATA.map((s) => s.key) } },
        select: { key: true },
      })
      const existingKeys = new Set(existing.map((e) => e.key))
      const toCreate = SEED_DATA.filter((s) => !existingKeys.has(s.key))

      if (toCreate.length > 0) {
        await prisma.emotionalMessage.createMany({
          data: toCreate,
          skipDuplicates: true,
        })
        console.log(`[emotional-messages] Created ${toCreate.length} preset messages`)
      }
    } catch (error) {
      console.error("[emotional-messages] Failed:", error)
      initPromise = null // 失败时允许重试
    }
  })()

  return initPromise
}
