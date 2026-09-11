import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getPublicSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { ValidationError } from "@/lib/errors"

// 全表 siteSetting 含 email_provider_* / r2_secret_access_key 等明文凭据，不可经 GET 落到前端 RSC payload。
// 故 GET 只返回公开白名单字段（PUBLIC_SETTING_KEYS），由 getPublicSiteSettings() 收敛凭据暴露面。
//
// POST 能写 siteSetting 全表，所以必须挡掉凭据类 key：凭据字段只应由 /api/admin/services 管理，
// 它带 write-only（永不回显）与掩码回写保护；从本接口进去会直接绕过那套保护，把明文凭据写进库。
// 用黑名单而非白名单：白名单要枚举全部合法 key，漏一个就会让主题或页面保存直接坏掉。
const CREDENTIAL_KEY_PREFIXES = ["r2_", "redis_", "email_provider"]

// 中文页面名：与 src/app/admin/pages/pages-manager.tsx 的 PAGES 标签一致。
// 那份定义在 "use client" 组件里，服务端路由无法直接 import，故按同一份标签在此列出。
const PAGE_LABELS: Record<string, string> = {
  page_about: "关于",
  page_rules: "社区规则",
  page_contact: "联系我们",
}

/** detail 里带值时做长度收敛，避免超长内容污染审计列表 */
function truncate(value: string): string {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value
}

export const GET = withHandler(async () => {
  await requireAdminRole("ADMIN")
  const settings = await getPublicSiteSettings()
  return json(settings)
})

export const POST = withHandler(async (req) => {
  // 站点设置（含站点页面富文本 page_about/page_rules/page_contact，前台全站渲染）
  // 属于 SUPER_ADMIN 专属：proxy 层已按 SUPER_ADMIN_ROUTES 拦截页面访问，
  // API 层必须同级校验，否则普通 ADMIN 可直接 POST 绕过页面限制篡改全站内容。
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)

  // 入参形状守卫（只挡形状，不挡内容）：safeParseJson 被全站共用，不能改；这层只在路由内挡。
  // 1) body 必须是普通对象——挡掉字符串/数组/null（字符索引、TypeError 变 500）。
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("请求体必须是一组配置项")
  }
  // 2) key 必须像配置名——挡掉误传的列表索引（"0"/"1" 等）往表里灌；带冒号的 galvelica:tagColor 仍合法。
  const KEY_SHAPE = /^[A-Za-z][A-Za-z0-9_:]*$/
  const bad = Object.keys(body).filter((k) => !KEY_SHAPE.test(k) || k.length < 3)
  if (bad.length > 0) throw new ValidationError("配置项名称不合法：" + bad.slice(0, 3).join(", "))

  // 命中凭据类 key 一律拒绝（不静默跳过：静默会让调用方以为保存成功）
  const blocked = Object.keys(body).filter((k) =>
    CREDENTIAL_KEY_PREFIXES.some((p) => k.startsWith(p))
  )
  if (blocked.length > 0) throw new ValidationError("凭据类配置请通过「服务配置」页面修改")

  const updated = await updateSiteSettings(body)

  // 审计：按本次实际提交的 key 分类，命中的类别各写一条。
  // detail 只按规则输出，绝不把 body 的值整段塞进去（值可能很长或含敏感串）。
  const keys = Object.keys(body)
  const themeKeys = keys.filter((k) => k.startsWith("theme"))
  const pageKeys = keys.filter((k) => k.startsWith("page_"))
  const otherKeys = keys.filter((k) => !k.startsWith("theme") && !k.startsWith("page_"))

  const writeAudit = (action: string, detail: string) => {
    void logAudit({ userId: "ADMIN", action, target: "site-settings", detail })
      .catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
  }

  if (themeKeys.length > 0) {
    writeAudit(
      "site.themeUpdate",
      `主题：${themeKeys.map((k) => `${k}=${truncate(String(body[k] ?? ""))}`).join(", ")}`
    )
  }

  if (pageKeys.length > 0) {
    writeAudit(
      "site.pageUpdate",
      pageKeys.map((k) => `《${PAGE_LABELS[k] ?? k.replace(/^page_/, "")}》内容已更新`).join("")
    )
  }

  if (otherKeys.length > 0) {
    const shown = otherKeys.slice(0, 8).join(", ")
    writeAudit(
      "site.settingsUpdate",
      otherKeys.length > 8
        ? `更新 ${otherKeys.length} 项：${shown} 等 ${otherKeys.length} 项`
        : `更新 ${otherKeys.length} 项：${shown}`
    )
  }

  return json(updated)
})
