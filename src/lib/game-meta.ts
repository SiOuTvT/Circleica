/**
 * 游戏基础信息字段的展示标签映射（后台表单 + 前台详情卡共用，单一事实来源）。
 * 避免平台 / 语言 / 制作状态 / 年龄分级在各处重复 hardcode。
 */

/** 平台代码 → 可读标签（VNDB platforms 代码，存储仍用代码数组） */
export const PLATFORM_LABELS: Record<string, string> = {
  win: "Windows",
  lin: "Linux",
  mac: "macOS",
  ios: "iOS",
  and: "Android",
  web: "Web",
  mob: "Mobile",
  psp: "PSP",
  ps2: "PS2",
  ps3: "PS3",
  ps4: "PS4",
  ps5: "PS5",
  psv: "PS Vita",
  xbo: "Xbox One",
  x360: "Xbox 360",
  switch: "Switch",
  wii: "Wii",
  drc: "Dreamcast",
  vnd: "Visual Novel",
}

/** 平台展示顺序（决定后台多选按钮排列与详情卡 chip 顺序） */
export const PLATFORM_ORDER = [
  "win", "lin", "mac", "ios", "and", "web", "mob",
  "psp", "ps2", "ps3", "ps4", "ps5", "psv",
  "xbo", "x360", "switch", "wii", "drc", "vnd",
]

/** 语言代码 → 可读标签（覆盖 VNDB languages / olang 常见代码） */
export const LANGUAGE_LABELS: Record<string, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  ko: "한국어",
  ar: "العربية",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  "pt-br": "Português (BR)",
  ru: "Русский",
  vi: "Tiếng Việt",
  de: "Deutsch",
  nl: "Nederlands",
  pl: "Polski",
  th: "ไทย",
  id: "Indonesia",
  ms: "Melayu",
  tr: "Türkçe",
  cs: "Čeština",
  da: "Dansk",
  fi: "Suomi",
  hu: "Magyar",
  el: "Ελληνικά",
  he: "עברית",
  fa: "فارسی",
  hi: "हिन्दी",
  ro: "Română",
  sk: "Slovenčina",
  sv: "Svenska",
  no: "Norsk",
  uk: "Українська",
}

/** 语言展示顺序（决定后台多选按钮排列与详情卡 chip 顺序） */
export const LANGUAGE_ORDER = [
  "ja", "en", "zh", "zh-Hans", "zh-Hant", "ko",
  "es", "fr", "de", "it", "pt", "pt-br", "ru", "ar",
  "vi", "th", "id", "ms", "tr", "nl", "pl", "hu", "cs",
  "el", "he", "fa", "hi", "ro", "sk", "sv", "no", "uk", "da", "fi",
]

/** 未知语言代码兜底为大写显示 */
export function langLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase()
}

/** 制作状态（GameStatus 枚举） → 可读标签 */
export const GAME_STATUS_LABELS: Record<string, string> = {
  FINISHED: "已完结",
  ONGOING: "连载中",
  HIATUS: "休刊 / 暂停",
  CANCELLED: "已取消",
}

/** 制作状态下拉顺序 */
export const GAME_STATUS_ORDER = ["FINISHED", "ONGOING", "HIATUS", "CANCELLED"]

/** 制作状态 → 语义色（用于详情卡小圆点） */
export const GAME_STATUS_COLORS: Record<string, string> = {
  FINISHED: "var(--color-success, #22c55e)",
  ONGOING: "var(--color-info, #3b82f6)",
  HIATUS: "var(--color-warning, #f59e0b)",
  CANCELLED: "var(--color-error, #ef4444)",
}

/** 年龄分级值 → 可读标签（存储值为 "0"/"12"/"15"/"18"，空串=未知） */
export const AGE_RATING_LABELS: Record<string, string> = {
  "": "未知",
  "0": "全年龄",
  "12": "12+",
  "15": "15+",
  "18": "18+",
}

/** 年龄分级下拉顺序 */
export const AGE_RATING_ORDER = ["", "0", "12", "15", "18"]
