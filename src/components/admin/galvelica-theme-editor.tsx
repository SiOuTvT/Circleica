"use client"

import { useMemo, useState } from "react"
import { Loader2, Palette } from "lucide-react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { GAL_PRESET_TAG_COLORS, GAL_THEME_COLOR_DEFAULT } from "@/lib/galvelica-palette"
import { computeContrastFg, hexToRgb } from "@/lib/theme-colors-shared"

/**
 * 副站主题色编辑器（仅颜色维度）。
 * 隔离决策：主站 ThemeEditor 的 radius/shadow/alpha 走全局 :root token，
 * 改了会波及主站 → 副站这里只允许改主色（--gal-accent），
 * 以 SiteSetting[galvelica:themeColor] 独立存储，两站数据/视觉互不覆盖。
 */
export function GalvelicaThemeEditor({ initialColor }: { initialColor: string }) {
  const [color, setColor] = useState(initialColor || GAL_THEME_COLOR_DEFAULT)
  const [hexInput, setHexInput] = useState(initialColor || GAL_THEME_COLOR_DEFAULT)
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => {
    const safe = /^#[0-9a-fA-F]{6}$/.test(color) ? color : GAL_THEME_COLOR_DEFAULT
    const [r, g, b] = hexToRgb(safe)
    return {
      safe,
      fg: computeContrastFg(safe),
      soft: `rgba(${r}, ${g}, ${b}, 0.14)`,
      border: `rgba(${r}, ${g}, ${b}, 0.45)`,
    }
  }, [color])

  function pick(v: string) {
    setColor(v)
    setHexInput(v)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { ok, error } = await apiFetchSafe("/api/admin/site-settings", {
        method: "POST",
        body: { "galvelica:themeColor": preview.safe },
      })
      if (!ok) {
        toast.error(error || "保存失败")
        setSaving(false)
        return
      }
      toast.success("副站主题色已更新")
      setColor(preview.safe)
      setHexInput(preview.safe)
    } catch {
      toast.error("网络错误")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* 取色器 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Palette className="h-4 w-4 text-[var(--gal-accent,#34C3AE)]" />
          副站主色
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          作为 Galvelica 副站的品牌主色（按钮、链接、标题强调、边框高亮）。仅作用于副站，不会影响主站主题。
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {GAL_PRESET_TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              aria-label={`设为 ${c}`}
              title={c}
              className={`h-8 w-8 rounded-full transition-all cursor-pointer ${
                color.toLowerCase() === c.toLowerCase()
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                  : "hover:scale-110"
              }`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={preview.safe}
            onChange={(e) => pick(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent"
            title="自定义颜色"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value)
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setColor(e.target.value)
            }}
            placeholder="#34C3AE"
            className="w-32 rounded-lg border-2 border-input bg-transparent px-3 py-2 text-xs font-mono text-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || color.toLowerCase() === (initialColor || GAL_THEME_COLOR_DEFAULT).toLowerCase()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            保存主题色
          </button>
        </div>
      </div>

      {/* 副站风格实时预览 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">副站预览</h3>
        <div
          className="mt-4 flex flex-col gap-3 rounded-2xl border-2 p-5"
          style={{ borderColor: preview.border, background: preview.soft }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.24em]" style={{ color: preview.safe }}>
            ARCHIVE · 预览
          </p>
          <p className="text-lg font-semibold text-foreground">同人视觉小说资料库</p>
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: preview.safe, color: preview.fg }}
            >
              主按钮
            </span>
            <span
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: preview.border, color: preview.safe }}
            >
              描边按钮
            </span>
            <span className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground">辅助</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          说明：圆角/阴影/透明度为全站共享 token，副站不提供覆盖（避免影响主站），只调整主色。
        </p>
      </div>
    </div>
  )
}
