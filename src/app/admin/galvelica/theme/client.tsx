"use client"

/**
 * 副站主题页 client 壳：读取服务端传入的初始设置，保存时 POST /api/admin/site-settings
 * （body 全部为 galvelica: 独立命名空间键，复用现有路由原样 upsert，绝不触碰主站 themeColor 等）。
 */
import { useCallback } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { GalvelicaThemeEditor } from "@/components/admin/galvelica-theme-editor"
import type { GalvelicaThemeSettings } from "@/lib/site-settings"

export function GalvelicaThemeClient({ initialSettings }: { initialSettings: GalvelicaThemeSettings }) {
  const handleSave = useCallback(async (settings: GalvelicaThemeSettings) => {
    const { ok } = await apiFetchSafe("/api/admin/site-settings", {
      method: "POST",
      body: {
        "galvelica:themeColor": settings.themeColor,
        "galvelica:themeRadius": String(settings.themeRadius),
        "galvelica:themeShadowIntensity": String(settings.themeShadowIntensity),
        "galvelica:themeAlpha": String(settings.themeAlpha),
      },
    })
    if (!ok) throw new Error("Save failed")
    toast.success("副站主题已保存")
  }, [])

  return <GalvelicaThemeEditor initialSettings={initialSettings} onSave={handleSave} />
}
