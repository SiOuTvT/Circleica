/**
 * 统一的相对时间格式化函数
 * 用于全站所有需要显示"X分钟前"、"X天前"的地方
 */
export function timeAgo(dateStr: string | Date): string {
  const now = Date.now()
  const then = typeof dateStr === "string" ? new Date(dateStr).getTime() : dateStr.getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))

  if (diff < 60) return "刚刚"
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 个月前`
  return `${Math.floor(diff / 31536000)} 年前`
}

/**
 * 游戏详情页专用：带"发布"后缀的相对时间
 */
export function timeAgoPublished(dateStr: string | Date): string {
  const now = Date.now()
  const then = typeof dateStr === "string" ? new Date(dateStr).getTime() : dateStr.getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))

  if (diff < 86400) return "今天发布"
  if (diff < 172800) return "昨天发布"
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前发布`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 个月前发布`
  return `${Math.floor(diff / 31536000)} 年前发布`
}
