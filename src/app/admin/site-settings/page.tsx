"use client"

import { applyThemeColor, type ThemeVars } from "@/lib/theme-colors"
import { Image as ImageIcon, Palette, Save, Settings, Trash2, Upload } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

/* ── 预设主题色卡 ── */
const PRESET_COLORS = [
  { name: "暗夜紫", hex: "#6c5ce7" },
  { name: "翡翠绿", hex: "#00b894" },
  { name: "珊瑚粉", hex: "#e17055" },
  { name: "天空蓝", hex: "#0984e3" },
  { name: "琥珀金", hex: "#d4a017" },
  { name: "玫瑰红", hex: "#d63384" },
  { name: "薄荷蓝", hex: "#00cec9" },
  { name: "深靛蓝", hex: "#2d3436" },
  { name: "烈焰橙", hex: "#e84393" },
  { name: "柠檬黄", hex: "#fdcb6e" },
  { name: "薰衣草", hex: "#a29bfe" },
  { name: "天际线", hex: "#74b9ff" },
  { name: "橄榄绿", hex: "#55a630" },
  { name: "酒红色", hex: "#9b1b30" },
  { name: "岩灰色", hex: "#636e72" },
  { name: "亮橙色", hex: "#f39c12" },
]

const THEME_DEFAULTS: ThemeVars = {
  color: "#6c5ce7",
  radius: 12,
  shadowIntensity: 50,
  alpha: 15,
}

export default function SiteSettingsPage() {
  const [placeholderUrl, setPlaceholderUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── 主题色状态 ──
  const [themeColor, setThemeColor] = useState(THEME_DEFAULTS.color)
  const [customColor, setCustomColor] = useState("")
  const [radius, setRadius] = useState(THEME_DEFAULTS.radius)
  const [shadowIntensity, setShadowIntensity] = useState(THEME_DEFAULTS.shadowIntensity)
  const [alpha, setAlpha] = useState(THEME_DEFAULTS.alpha)
  const [themeChanged, setThemeChanged] = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        setPlaceholderUrl(data.default_placeholder_image || "")
        const tc = data.themeColor || THEME_DEFAULTS.color
        setThemeColor(tc)
        setRadius(data.themeRadius ?? THEME_DEFAULTS.radius)
        setShadowIntensity(data.themeShadowIntensity ?? THEME_DEFAULTS.shadowIntensity)
        setAlpha(data.themeAlpha ?? THEME_DEFAULTS.alpha)
        // 初始化自定义色值：如果不在预设里则显示
        if (!PRESET_COLORS.some(c => c.hex === tc)) {
          setCustomColor(tc)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_placeholder_image: placeholderUrl }),
      })
      alert("已保存")
    } catch {
      alert("保存失败")
    } finally {
      setSaving(false)
    }
  }, [placeholderUrl])

  /* ── 主题色选择 ── */
  const selectColor = useCallback((hex: string) => {
    setThemeColor(hex)
    setCustomColor("")
    setThemeChanged(true)
    applyThemeColor(hex, radius, shadowIntensity, alpha)
  }, [radius, shadowIntensity, alpha])

  const handleCustomColor = useCallback((value: string) => {
    setCustomColor(value)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setThemeColor(value)
      setThemeChanged(true)
      applyThemeColor(value, radius, shadowIntensity, alpha)
    }
  }, [radius, shadowIntensity, alpha])

  const handleRadius = useCallback((v: number) => {
    setRadius(v)
    setThemeChanged(true)
    applyThemeColor(themeColor, v, shadowIntensity, alpha)
  }, [themeColor, shadowIntensity, alpha])

  const handleShadow = useCallback((v: number) => {
    setShadowIntensity(v)
    setThemeChanged(true)
    applyThemeColor(themeColor, radius, v, alpha)
  }, [themeColor, radius, alpha])

  const handleAlpha = useCallback((v: number) => {
    setAlpha(v)
    setThemeChanged(true)
    applyThemeColor(themeColor, radius, shadowIntensity, v)
  }, [themeColor, radius, shadowIntensity])

  /* ── 保存主题色到服务端 + localStorage ── */
  const handleThemeSave = useCallback(async () => {
    setThemeSaving(true)
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeColor,
          themeRadius: radius,
          themeShadowIntensity: shadowIntensity,
          themeAlpha: alpha,
        }),
      })
      // 同步 localStorage
      localStorage.setItem("site-theme-color", themeColor)
      localStorage.setItem("site-theme-settings", JSON.stringify({
        themeColor,
        themeRadius: radius,
        themeShadowIntensity: shadowIntensity,
        themeAlpha: alpha,
      }))
      setThemeChanged(false)
      alert("主题色已保存，全站将立即生效")
    } catch {
      alert("保存失败")
    } finally {
      setThemeSaving(false)
    }
  }, [themeColor, radius, shadowIntensity, alpha])

  /* ── 重置默认 ── */
  const handleReset = useCallback(() => {
    setThemeColor(THEME_DEFAULTS.color)
    setCustomColor("")
    setRadius(THEME_DEFAULTS.radius)
    setShadowIntensity(THEME_DEFAULTS.shadowIntensity)
    setAlpha(THEME_DEFAULTS.alpha)
    setThemeChanged(true)
    applyThemeColor(THEME_DEFAULTS.color, THEME_DEFAULTS.radius, THEME_DEFAULTS.shadowIntensity, THEME_DEFAULTS.alpha)
  }, [])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()
      if (data.url) {
        setPlaceholderUrl(data.url)
      } else {
        alert("上传失败: " + (data.error || "未知错误"))
      }
    } catch {
      alert("上传失败")
    } finally {
      setUploading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">站点设置</h1>
      </div>

      {/* ════════ 主题色设置 ════════ */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">主题色设置</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          选择站点主题色，修改后需点击「保存主题色」才会对全站生效。
        </p>

        {/* ── 预设色卡网格 ── */}
        <div>
          <label className="mb-2 block text-sm font-medium">预设颜色</label>
          <div className="grid grid-cols-8 gap-2">
            {PRESET_COLORS.map(({ name, hex }) => {
              const isActive = themeColor === hex && !customColor
              return (
                <button
                  key={hex}
                  type="button"
                  title={`${name} ${hex}`}
                  onClick={() => selectColor(hex)}
                  className={`group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
                    isActive
                      ? "ring-2 ring-primary scale-105 bg-accent"
                      : "hover:bg-muted/50 hover:scale-105"
                  }`}
                >
                  <span
                    className="block h-8 w-8 rounded-full border border-border/50 shadow-sm"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {name}
                  </span>
                  {isActive && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 自定义颜色输入 ── */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">自定义颜色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor || themeColor}
                onChange={e => handleCustomColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-background p-1"
              />
              <input
                value={customColor}
                onChange={e => handleCustomColor(e.target.value)}
                placeholder="#6c5ce7"
                maxLength={7}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            重置默认
          </button>
        </div>

        {/* ── 实时预览 ── */}
        <div>
          <label className="mb-2 block text-sm font-medium">效果预览</label>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground"
                style={{
                  backgroundColor: themeColor,
                  borderRadius: `${radius}px`,
                  opacity: 1 - alpha / 100 * 0.3,
                }}
              >
                主题按钮
              </span>
              <span
                className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: themeColor,
                  color: themeColor,
                  borderRadius: `${radius}px`,
                }}
              >
                描边按钮
              </span>
              <span className="text-sm" style={{ color: themeColor }}>
                主题链接文字
              </span>
            </div>
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: themeColor,
                borderRadius: `${radius}px`,
                opacity: shadowIntensity / 100,
              }}
            />
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>圆角: {radius}px</span>
              <span>·</span>
              <span>阴影: {shadowIntensity}%</span>
              <span>·</span>
              <span>透明度: {alpha}%</span>
            </div>
          </div>
        </div>

        {/* ── 滑块控制 ── */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-medium">
              圆角
              <span className="text-xs text-muted-foreground">{radius}px</span>
            </label>
            <input
              type="range"
              min={0} max={24} value={radius}
              onChange={e => handleRadius(+e.target.value)}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-medium">
              阴影强度
              <span className="text-xs text-muted-foreground">{shadowIntensity}%</span>
            </label>
            <input
              type="range"
              min={0} max={100} value={shadowIntensity}
              onChange={e => handleShadow(+e.target.value)}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-medium">
              辉光透明度
              <span className="text-xs text-muted-foreground">{alpha}%</span>
            </label>
            <input
              type="range"
              min={0} max={100} value={alpha}
              onChange={e => handleAlpha(+e.target.value)}
              className="w-full accent-primary"
            />
          </div>
        </div>

        {/* ── 保存主题色 ── */}
        <button
          onClick={handleThemeSave}
          disabled={themeSaving || !themeChanged}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Palette className="h-4 w-4" />
          {themeSaving ? "保存中…" : "保存主题色"}
        </button>
      </div>

      {/* ════════ 默认占位图 ════════ */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">默认占位图</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          当游戏没有封面时使用此图片。留空则使用前端默认的 SVG 占位图。
        </p>

        {/* 预览 */}
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-28 overflow-hidden rounded-lg border border-border bg-muted">
            {placeholderUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={placeholderUrl} alt="占位图预览" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "上传中…" : "上传图片"}
            </button>
            {placeholderUrl && (
              <button
                onClick={() => setPlaceholderUrl("")}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                清除
              </button>
            )}
          </div>
        </div>

        {/* 手动输入 URL */}
        <div>
          <label className="mb-1 block text-sm font-medium">或手动输入图片 URL</label>
          <input
            value={placeholderUrl}
            onChange={e => setPlaceholderUrl(e.target.value)}
            placeholder="https://example.com/placeholder.png"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "保存中…" : "保存设置"}
        </button>
      </div>
    </div>
  )
}