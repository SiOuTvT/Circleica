/**
 * 创作者角色标签映射（全站唯一事实来源）
 *
 * 覆盖全站实际用到的角色值；库里若出现映射里没有的值，`roleLabel` 原样返回原词
 * （不硬套中文标签、不返回 undefined、不返回空串）。
 * 只改展示层，不修改数据库里存的原始角色值。
 */
export const ROLE_LABELS: Record<string, string> = {
  director: "导演",
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  music: "音乐",
  songs: "主题曲",
  translator: "翻译",
  editor: "编辑",
  qa: "校对",
  staff: "其他",
  other: "其他",
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role
}

/**
 * 制作组 / 创作者详情页与图鉴卡的职位行顺序。
 * 不在列表里的角色归到末尾「其他」一行；某职位下 0 人时该行整行不渲染。
 */
export const ROLE_ROW_ORDER = [
  "director",
  "scenario",
  "art",
  "chardesign",
  "music",
  "translator",
  "editor",
  "qa",
  "other",
] as const
