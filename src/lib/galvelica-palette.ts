/**
 * 副站专属标签预设色板（铜绿调和、低饱和、档案感）。
 * 仅用于副站标签编辑器的快捷取色 + 「重置为调色板」批量动作；
 * 不进入主站，不影响主站 `TAG_PRESET_COLORS`。形状对齐（string[]）。
 *
 * 客户端安全模块：禁止 import next/headers / prisma / redis 等仅服务端可用的依赖，
 * 否则会被后台标签编辑组件（"use client"）引入而破坏 next build（webpack 报
 * "You're importing a module that depends on next/headers"）。
 */
export const GAL_PRESET_TAG_COLORS = [
  "#5FA8A0", "#8a9a5b", "#c08552", "#b08968", "#7d8fa3",
  "#9c7a9e", "#6b8e9e", "#a8846a", "#5f8a7d", "#947c6a",
]

/** 副站标签的数据库默认色（新建时未改色即落库此值），用于「重置为调色板」批量识别。 */
export const GAL_DEFAULT_TAG_COLOR = "#a78bfa"
