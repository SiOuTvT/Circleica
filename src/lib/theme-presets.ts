/** 主题色预设（setup-wizard + theme-editor 共用）
 *  精选 8 套，统一「深邃、微饱和、可作近黑底上小面积点缀」的克制逻辑。
 *  薄荷绿为旗舰默认，呼应 Galvelica 的档案馆气质。 */
export const THEME_PRESETS = [
  { name: "mint", label: "薄荷", color: "#5FA8A0", desc: "安静 · 档案馆" },
  { name: "dusk", label: "黛蓝", color: "#6E8CA8", desc: "沉静 · 夜色" },
  { name: "haze", label: "雾紫", color: "#8E84B0", desc: "朦胧 · 梦境" },
  { name: "ochre", label: "赭石", color: "#C0905E", desc: "温润 · 旧纸" },
  { name: "pine", label: "松绿", color: "#5C8A7E", desc: "幽深 · 林间" },
  { name: "rose", label: "灰玫", color: "#B08696", desc: "温柔 · 余晖" },
  { name: "slate", label: "烟灰蓝", color: "#8898A8", desc: "沉稳 · 内敛" },
  { name: "amber", label: "暖琥珀", color: "#D4A050", desc: "温暖 · 复古" },
] as const
