import { logger } from "./logger"
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
  // ── 原文案管理迁移 ──
  { key: "copy_empty_forum_comment",    category: "empty",   title: "还没有人回复",       subtitle: "来说点什么吧~",                   imageUrl: "", emoji: "💬",   enabled: true },
  { key: "copy_empty_notification_unread", category: "empty", title: "所有消息都看过了",   subtitle: "",                               imageUrl: "", emoji: "✅",   enabled: true },
  { key: "copy_empty_resource",         category: "empty",   title: "还没有人分享资源",   subtitle: "等一等~",                         imageUrl: "", emoji: "📦",   enabled: true },
  { key: "copy_empty_collection",       category: "empty",   title: "合集正在筹备中",     subtitle: "敬请期待~",                       imageUrl: "", emoji: "📚",   enabled: true },
  { key: "copy_empty_generic",          category: "empty",   title: "暂时空空如也",       subtitle: "",                               imageUrl: "", emoji: "🫥",   enabled: true },
  { key: "copy_cover_missing",          category: "empty",   title: "封面还没上传",       subtitle: "",                               imageUrl: "", emoji: "🖼️",  enabled: true },
  { key: "copy_confirm_title",          category: "toast",   title: "确认一下",           subtitle: "",                               imageUrl: "", emoji: "❓",   enabled: true },
  { key: "copy_confirm_desc",           category: "toast",   title: "确定要这样做吗？",   subtitle: "",                               imageUrl: "", emoji: "",     enabled: true },
  { key: "copy_confirm_delete_warn",    category: "toast",   title: "删了就找不回来了",   subtitle: "",                               imageUrl: "", emoji: "⚠️",  enabled: true },
  { key: "copy_error_send_fail",        category: "error",   title: "发送失败了",         subtitle: "再试试？",                        imageUrl: "", emoji: "😵",   enabled: true },
  { key: "copy_error_action_fail",      category: "error",   title: "出了点问题",         subtitle: "等一下再试试？",                   imageUrl: "", emoji: "😕",   enabled: true },
  { key: "copy_error_image_too_large",  category: "error",   title: "图片太大啦",         subtitle: "最多 5MB 哦",                     imageUrl: "", emoji: "📏",   enabled: true },
  { key: "copy_error_upload_fail",      category: "error",   title: "上传失败了",         subtitle: "再试试？",                        imageUrl: "", emoji: "📤",   enabled: true },
  { key: "copy_reset_sent_title",       category: "success", title: "邮件已发出~",        subtitle: "",                               imageUrl: "", emoji: "📧",   enabled: true },
  { key: "copy_reset_sent_desc",        category: "success", title: "如果这个邮箱注册过", subtitle: "你应该很快就能收到邮件了",         imageUrl: "", emoji: "",     enabled: true },
  { key: "copy_reset_sent_help",        category: "success", title: "没收到？",           subtitle: "看看垃圾箱，或者联系我们帮忙~",     imageUrl: "", emoji: "💡",   enabled: true },
  { key: "copy_reset_expired",          category: "error",   title: "链接过期啦",         subtitle: "",                               imageUrl: "", emoji: "⏰",   enabled: true },
  { key: "copy_reset_expired_desc",     category: "error",   title: "重新申请一个吧~",    subtitle: "",                               imageUrl: "", emoji: "",     enabled: true },
  { key: "copy_reset_success",          category: "success", title: "密码重置成功！",     subtitle: "",                               imageUrl: "", emoji: "🔓",   enabled: true },
  { key: "copy_profile_password_section", category: "toast", title: "修改密码",           subtitle: "",                               imageUrl: "", emoji: "🔑",   enabled: true },
  { key: "copy_profile_password_hint",  category: "toast",   title: "不想改的话留空就好~", subtitle: "",                               imageUrl: "", emoji: "",     enabled: true },
  { key: "copy_profile_anonymous",      category: "empty",   title: "热心网友",           subtitle: "",                               imageUrl: "", emoji: "👤",   enabled: true },
  { key: "copy_profile_lazy_bio",       category: "empty",   title: "这个人很懒",         subtitle: "什么都没留下",                     imageUrl: "", emoji: "😴",   enabled: true },
  { key: "copy_notification_title",     category: "toast",   title: "消息中心",           subtitle: "",                               imageUrl: "", emoji: "🔔",   enabled: true },
  { key: "copy_search_result_count",    category: "toast",   title: "找到 {count} 个结果~", subtitle: "",                             imageUrl: "", emoji: "🔍",   enabled: true },
  { key: "copy_comment_placeholder",    category: "toast",   title: "写下评论…",          subtitle: "",                               imageUrl: "", emoji: "",     enabled: true },
  { key: "copy_comment_login_prompt",   category: "toast",   title: "登录后发表评论",     subtitle: "",                               imageUrl: "", emoji: "🔐",   enabled: true },
  { key: "copy_achievement_unlock_title", category: "success", title: "成就解锁",         subtitle: "",                               imageUrl: "", emoji: "🏆",   enabled: true },
  { key: "copy_achievement_unlock_body",  category: "success", title: "你解锁了「{name}」！", subtitle: "",                            imageUrl: "", emoji: "",     enabled: true },
  { key: "copy_achievement_unlock_toast", category: "success", title: "解锁新成就",       subtitle: "",                               imageUrl: "", emoji: "🎉",   enabled: true },
  { key: "copy_achievement_empty",      category: "empty",   title: "暂无成就",           subtitle: "继续探索吧~",                     imageUrl: "", emoji: "🗺️",  enabled: true },
  { key: "copy_achievement_locked",     category: "empty",   title: "???",                subtitle: "",                               imageUrl: "", emoji: "🔒",   enabled: true },
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
        logger.db.info(`[emotional-messages] Created ${toCreate.length} preset messages`)
      }
    } catch (error) {
      logger.db.error("[emotional-messages] Failed:", error)
      initPromise = null // 失败时允许重试
    }
  })()

  return initPromise
}
