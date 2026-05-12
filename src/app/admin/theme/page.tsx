"use client"

import { useThemeColor } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Check, Palette } from "lucide-react"

export default function ThemeSettingsPage() {
  const { themeColor, setThemeColor, presets, currentPreset } = useThemeColor()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <Palette className="h-6 w-6 text-primary" />
          主题设置
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择网站的主题颜色，更改后全站将实时响应
        </p>
      </div>

      {/* 主题色选择 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">主题颜色</h2>
        <p className="text-sm text-muted-foreground mb-6">
          点击下方色块即可切换主题色，前台所有页面将实时更新
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {presets.map((preset) => {
            const isActive = currentPreset?.name === preset.name
            return (
              <button
                key={preset.name}
                onClick={() => setThemeColor(preset.color)}
                className={cn(
                  "group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all hover:scale-[1.03]",
                  isActive
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
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
                  <span className="text-sm font-medium text-foreground">{preset.label}</span>
                  <span className="mt-0.5 block text-xs font-mono text-muted-foreground">
                    {preset.color}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 当前主题信息 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">当前主题</h2>
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-lg shadow-inner"
            style={{ backgroundColor: themeColor }}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
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
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90">
            主要按钮
          </button>
          <button className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary ring-1 ring-primary/20 transition-all hover:bg-primary/15">
            次要按钮
          </button>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/20">
            标签示例
          </span>
          <a href="#" className="text-sm font-medium text-primary underline underline-offset-4">
            链接文本
          </a>
        </div>
      </section>
    </div>
  )
}