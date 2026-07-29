/**
 * 创作者角色标签映射（Studio / Creator / Collection 共用）
 * 单一事实来源，避免在各组件重复定义导致漂移。
 */
export const ROLE_LABELS: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  music: "音乐",
  songs: "主题曲",
  director: "导演",
  other: "其他",
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role
}
