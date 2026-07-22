/**
 * 统一时区工具（Single Source of Truth）
 *
 * 全站所有"按天"的比较、分组、连续计算，一律以 Asia/Shanghai 为准。
 * 禁止在逻辑代码中混用 toISOString()(UTC) 与 toLocaleDateString(Shanghai)，
 * 否则会因服务器时区不同而产生跨日偏差（M5 / M18）。
 */

const SHANGHAI_TZ = "Asia/Shanghai"

/** 将任意时间转换为 Asia/Shanghai 的 YYYY-MM-DD 字符串 */
export function toShanghaiDate(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input)
  return d.toLocaleDateString("sv-SE", { timeZone: SHANGHAI_TZ })
}

/** 在 Shanghai 日历日基础上平移若干天，返回新的 YYYY-MM-DD 字符串 */
export function shiftShanghaiDate(dateStr: string, days: number): string {
  // 以 Shanghai 当天 00:00 为基准，避免被本地时区解析影响
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return toShanghaiDate(d)
}

/**
 * 统一的"展示用"日期格式化（Single Source of Truth）
 *
 * 全站所有面向用户的日期/时间展示都必须走这里，禁止在组件里手写
 * `new Date(x).toLocaleDateString("zh-CN", ...)` —— 否则会因服务器时区不同
 * 而与上海时区产生偏差，且各处的格式会各自为政（架构一致性审查）。
 */
type DateInput = Date | string | number | null | undefined

function toDate(input: DateInput): Date | null {
  if (input == null) return null
  const d = input instanceof Date ? input : new Date(input)
  return isNaN(d.getTime()) ? null : d
}

function fmtZh(input: DateInput, opts: Intl.DateTimeFormatOptions): string {
  const d = toDate(input)
  if (!d) return ""
  return new Intl.DateTimeFormat("zh-CN", { timeZone: SHANGHAI_TZ, ...opts }).format(d)
}

/** YYYY-MM-DD（紧凑，用于表格/列表） */
export function formatDate(input: DateInput): string {
  const d = toDate(input)
  if (!d) return ""
  return new Intl.DateTimeFormat("sv-SE", { timeZone: SHANGHAI_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
}

/** YYYY-MM-DD HH:mm（紧凑，用于表格/列表的日期时间） */
export function formatDateTime(input: DateInput): string {
  const d = toDate(input)
  if (!d) return ""
  return new Intl.DateTimeFormat("sv-SE", { timeZone: SHANGHAI_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d)
}

/** YYYY年M月D日（用户友好的完整日期） */
export function formatZhDate(input: DateInput): string {
  return fmtZh(input, { year: "numeric", month: "long", day: "numeric" })
}

/** YYYY年M月D日 HH:mm（用户友好的完整日期时间） */
export function formatZhDateTime(input: DateInput): string {
  return fmtZh(input, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
}

/** M月D日（紧凑的月日，用于相对弱化展示） */
export function formatMonthDay(input: DateInput): string {
  return fmtZh(input, { month: "long", day: "numeric" })
}
