"use client"

import { useThemeColor } from "@/components/theme-provider"
import { applyThemeColor, THEME_PRESETS } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"
import { Check, Palette, Save } from "lucide-react"
import { useEffect, useState } from "react"

export default function ThemeSettingsPage() {
  const { themeColor, setThemeColor, currentPreset } = useThemeColor()
  const [selectedColor, setSelectedColor] = useState(themeColor)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync with context when it changes
  useEffect(() => {
    setSelectedColor(themeColor)
  }, [themeColor])

  const handlePreview = (color: string) => {
    setSelectedColor(color)
    // Live preview - apply immediately
    applyThemeColor(color)
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor: selectedColor }),
      })
      // Update context + localStorage
      setThemeColor(selectedColor)
      localStorage.setItem("site-theme-color", selectedColor)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error("Failed to save theme", e)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = selectedColor.toLowerCase() !== themeColor.toLowerCase()

  const selectedPreset = THEME_PRESETS.find(
    (p) => p.color.toLowerCase() === selectedColor.toLowerCase()
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <Palette className="h-6 w-6" style={{ color: "var(--clr-blue)" }} />
          主题设置
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择网站的主题颜色，选好后点击「确认保存」应用
        </p>
      </div>

      {/* 主题色选择 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">主题颜色</h2>
        <p className="text-sm text-muted-foreground mb-6">
          点击色块预览效果，再点击「确认保存」生效
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {THEME_PRESETS.map((preset) => {
            const isActive = selectedColor.toLowerCase() === preset.color.toLowerCase()
            return (
              <button
                key={preset.name}
                onClick={() => handlePreview(preset.color)}
                className={cn(
                  "group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all hover:scale-[1.03]",
                  isActive
                    ? "border-[var(--clr-blue)] bg-[var(--clr-glow)] shadow-lg"
                    : "border-border bg-background hover:border-primary/40 hover:shadow-md"
                )}
              >
                {/* 色块 */}
                <div className="relative">
                  <div
                    className="h-16 w-16 rounded-full shadow-inner transition-transform group-hover:scale-110"
                    style={{ backgroundColor: preset.color }}
                  />
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-7 w-7 text-white drop-shadow-md" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* 标签 */}
                <div className="text-center">
                  <span className="text-sm font-semibold text-foreground">{preset.label}</span>
                  <span className="mt-0.5 block text-xs font-mono text-muted-foreground">
                    {preset.color}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 确认保存按钮 */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleConfirm}
            disabled={!hasChanges || saving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all",
              hasChanges
                ? "bg-[var(--clr-blue)] text-white shadow-md hover:opacity-90 hover:shadow-lg cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            )}
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : saved ? "✓ 已保存" : "确认保存"}
          </button>
          {hasChanges && (
            <span className="text-sm text-muted-foreground">
              已选择「{selectedPreset?.label ?? "自定义"}」，需要点击保存才能生效
            </span>
          )}
          {!hasChanges && !saved && (
            <span className="text-sm text-muted-foreground">
              当前未修改主题色
            </span>
          )}
        </div>
      </section>

      {/* 当前主题信息 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">当前生效主题</h2>
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-lg shadow-inner border border-border"
            style={{ backgroundColor: themeColor }}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {currentPreset?.label ?? "自定义颜色"}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{themeColor}</p>
          </div>
        </div>
      </section>

      {/* 预览区 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">效果预览</h2>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg bg-[var(--clr-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90">
            主要按钮
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:opacity-80"
            style={{
              backgroundColor: `color-mix(in srgb, var(--clr-blue) 15%, transparent)`,
              color: "var(--clr-blue)",
              boxShadow: `0 0 0 1px color-mix(in srgb, var(--clr-blue) 30%, transparent)`,
            }}
          >
            次要按钮
          </button>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `color-mix(in srgb, var(--clr-blue) 15%, transparent)`,
              color: "var(--clr-blue)",
              boxShadow: `0 0 0 1px color-mix(in srgb, var(--clr-blue) 30%, transparent)`,
            }}
          >
            标签示例
          </span>
          <a
            href="#"
            className="text-sm font-semibold underline underline-offset-4"
            style={{ color: "var(--clr-blue)" }}
          >
            链接文本
          </a>
        </div>
      </section>
    </div>
  )
}