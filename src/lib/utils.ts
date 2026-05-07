import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * 获取头像文字颜色（白色或深色，取决于背景）
 */
export function getAvatarTextColor(): string {
  return "#ffffff"
}
