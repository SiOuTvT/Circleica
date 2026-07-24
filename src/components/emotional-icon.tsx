"use client"

import { createElement } from "react"
import { getIconForEmoji } from "@/lib/emoji-icons"

/**
 * 渲染情感消息中的 emoji 为 Lucide Icon
 * 如果 emoji 有对应的 Lucide 图标，渲染图标；否则渲染原始 emoji 文字
 */
export function EmotionalIcon({
  emoji,
  className = "h-4 w-4 inline-block align-text-bottom",
}: {
  emoji?: string | null
  className?: string
}) {
  if (!emoji) return null
  const Icon = getIconForEmoji(emoji)
  if (!Icon) return <span>{emoji}</span>
  return createElement(Icon, { className, strokeWidth: 2 })
}

/**
 * 渲染情感消息文本（emoji + title）
 * 用于 toast、空状态、提示等场景
 */
export function EmotionalText({
  emoji,
  title,
  className,
}: {
  emoji?: string | null
  title: string
  className?: string
}) {
  return (
    <span className={className}>
      <EmotionalIcon emoji={emoji} />
      {emoji && " "}
      {title}
    </span>
  )
}
