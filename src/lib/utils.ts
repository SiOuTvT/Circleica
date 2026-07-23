import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 把生成的 id 注入到 children 中第一个可标记（labelable）的原生表单控件
 * （input / select / textarea），用于让 <label htmlFor> 与控件正确关联。
 * 仅向下钻取一层宿主元素（如 <div className="relative"> 包裹 input + 按钮），
 * 遇到自定义组件即停止，避免误改第三方组件内部 DOM。
 */
export function withLabelableId(node: ReactNode, id: string): ReactNode {
  if (Array.isArray(node)) return node.map((n) => withLabelableId(n, id))
  if (!isValidElement(node)) return node
  const el = node as ReactElement<any>
  const tag = el.type
  if (tag === "input" || tag === "select" || tag === "textarea") {
    return cloneElement(el, { id })
  }
  if (typeof tag === "string") {
    const kids = (el.props as { children?: ReactNode }).children
    return cloneElement(el, {}, withLabelableId(kids, id))
  }
  return node
}

/**
 * 根据用户名生成随机柔和背景色（HSL）
 * 使用柔和的色调，避免过于鲜艳的颜色
 */
export function getRandomAvatarColor(name: string): string {
  // 基于用户名生成一致的哈希值
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // 生成柔和的色相（0-360度）
  const hue = Math.abs(hash) % 360
  
  // 使用较低的饱和度和中等亮度，确保颜色柔和
  const saturation = 40 + (Math.abs(hash) % 20) // 40-60%
  const lightness = 45 + (Math.abs(hash) % 15)  // 45-60%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/**
 * 获取头像文字颜色（白色或深色，取决于背景亮度）
 */
export function getAvatarTextColor(bgColor: string): string {
  // 从 HSL 颜色中提取亮度
  const match = bgColor.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/)
  if (match) {
    const lightness = parseInt(match[1], 10)
    return lightness > 55 ? "#1a1a1a" : "#ffffff"
  }
  return "#ffffff"
}
