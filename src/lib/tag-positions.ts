/**
 * 前台方位定义 —— 标签组可绑定的渲染位置
 * 
 * 设计思路：将 Galgame / ACG 资源站前台所有可能展示标签的方位
 * 按"页面 + 区域"进行科学合并分类，形成一套可扩展的位置枚举。
 * 后台通过复选框勾选，前台按 position 查询对应标签组。
 */

export interface TagPositionDef {
  key: string
  label: string
  description: string
  icon: string       // emoji icon
  group: string      // 所属分类（用于后台分组展示）
}

export const TAG_POSITIONS: TagPositionDef[] = [
  // ── 核心展示区 ──────────────────────────────
  {
    key: "home_card",
    label: "首页游戏卡片",
    description: "全站首页每个游戏封面卡片下方的标签行",
    icon: "🏠",
    group: "核心展示区",
  },
  {
    key: "detail_header",
    label: "详情页信息栏",
    description: '游戏详情页右侧核心信息区域的标签展示',
    icon: "📋",
    group: "核心展示区",
  },
  {
    key: "detail_related",
    label: "相关游戏推荐",
    description: '游戏详情页底部「相关游戏」区域中，用于关联筛选的标签',
    icon: "🔗",
    group: "核心展示区",
  },

  // ── 搜索与发现 ──────────────────────────────
  {
    key: "search_filter",
    label: "搜索筛选面板",
    description: "全站高级搜索页的左侧/顶部标签筛选区域",
    icon: "🔍",
    group: "搜索与发现",
  },
  {
    key: "tag_cloud",
    label: "标签云 / 标签墙",
    description: "标签聚合页面中以云/墙形式展示的标签组",
    icon: "☁️",
    group: "搜索与发现",
  },
  {
    key: "ranking",
    label: "排行榜 / 热门推荐",
    description: '排行榜、热门、趋势等推荐页面中用于内容分类的标签',
    icon: "🏆",
    group: "搜索与发现",
  },

  // ── 用户中心 ──────────────────────────────
  {
    key: "profile_game",
    label: "个人中心游戏列表",
    description: '用户个人主页的游戏收藏/评分/游玩状态列表中展示的标签',
    icon: "👤",
    group: "用户中心",
  },
  {
    key: "collection_view",
    label: "收藏集视图",
    description: '用户自定义收藏集中，游戏卡片上展示的标签',
    icon: "📁",
    group: "用户中心",
  },

  // ── 资源与下载 ──────────────────────────────
  {
    key: "resource_card",
    label: "资源下载卡片",
    description: '点击「下载资源」后弹出的下载卡片顶部标签行',
    icon: "📥",
    group: "资源与下载",
  },

]

/** 获取所有 position key 列表 */
export const ALL_POSITION_KEYS = TAG_POSITIONS.map(p => p.key)

/** 按分组聚合方位列表（用于后台复选框分组展示） */
export function getPositionsByGroup(): Record<string, TagPositionDef[]> {
  const groups: Record<string, TagPositionDef[]> = {}
  for (const pos of TAG_POSITIONS) {
    if (!groups[pos.group]) groups[pos.group] = []
    groups[pos.group].push(pos)
  }
  return groups
}

/** 校验 position key 是否合法 */
export function isValidPosition(key: string): boolean {
  return ALL_POSITION_KEYS.includes(key)
}