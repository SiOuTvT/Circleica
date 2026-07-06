"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { applyThemeColor } from "@/lib/theme-colors"
import { Check, Database, FileText, Loader2, Palette, RotateCcw, Save } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

/* ── 预设主题色 ── */
const THEME_PRESETS = [
  { name: "peach", label: "暖桃", color: "#E0A87C", desc: "温柔 · 质感" },
  { name: "rose", label: "柔玫瑰", color: "#e8789a", desc: "温暖 · 怀旧" },
  { name: "lavender", label: "雾蓝紫", color: "#9B8EC4", desc: "梦幻 · 小众" },
  { name: "copper", label: "暖铜", color: "#C49464", desc: "复古 · 高级" },
  { name: "amber", label: "暖琥珀", color: "#D4A050", desc: "温暖 · 复古" },
  { name: "mist", label: "雾蓝", color: "#7CA8C8", desc: "安静 · 治愈" },
  { name: "tea", label: "茶绿", color: "#8CB888", desc: "清新 · 自然" },
  { name: "slate", label: "烟灰蓝", color: "#8898A8", desc: "沉稳 · 内敛" },
  { name: "mint", label: "薄荷", color: "#78C0B0", desc: "清凉 · 干净" },
  { name: "apricot", label: "杏橘", color: "#E89868", desc: "活泼 · 温暖" },
]

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const DEFAULT_SETTINGS = {
  themeColor: "#E0A87C",
  themeRadius: 12,
  themeShadowIntensity: 50,
  themeAlpha: 15,
}

interface ThemeSettings {
  themeColor: string
  themeRadius: number
  themeShadowIntensity: number
  themeAlpha: number
}

interface ThemeEditorProps {
  initialSettings: ThemeSettings
  onSave: (settings: ThemeSettings) => Promise<void>
}

export function ThemeEditor({ initialSettings, onSave }: ThemeEditorProps) {
  const [draft, setDraft] = useState<ThemeSettings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(initialSettings) }, [initialSettings])

  // 实时预览
  useEffect(() => {
    applyThemeColor(draft.themeColor, draft.themeRadius, draft.themeShadowIntensity, draft.themeAlpha)
  }, [draft])

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(initialSettings)
  const [tr, tg, tb] = hexToRgb(draft.themeColor)
  const rounded = `${draft.themeRadius}px`

  function updateDraft(patch: Partial<ThemeSettings>) {
    setDraft(prev => ({ ...prev, ...patch }))
  }

  function handleReset() {
    setDraft(DEFAULT_SETTINGS)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ ...draft })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1200px]">
      {/* 标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <Palette className="h-7 w-7" style={{ color: draft.themeColor }} />
            主题设置
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">自定义网站的颜色、圆角、阴影和透明度，所有修改都会实时预览</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> 恢复默认
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : saved ? (
              <Check className="h-4 w-4 mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {saved ? "已保存" : "确认保存"}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* 左侧：控件 */}
        <div className="flex flex-col gap-6">
          {/* 主题色预设 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🎨 主题颜色</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3 sm:grid-cols-5">
                {THEME_PRESETS.map(preset => {
                  const isActive = draft.themeColor.toLowerCase() === preset.color.toLowerCase()
                  return (
                    <button
                      key={preset.name}
                      onClick={() => updateDraft({ themeColor: preset.color })}
                      className="flex flex-col items-center gap-2 rounded-xl p-2.5 transition-all"
                      style={{
                        border: `2px solid ${isActive ? draft.themeColor : "hsl(var(--border))"}`,
                        background: isActive ? `rgba(${tr},${tg},${tb},0.1)` : "transparent",
                      }}
                    >
                      <div className="relative">
                        <div
                          className="h-9 w-9 rounded-full"
                          style={{ backgroundColor: preset.color, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)" }}
                        />
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground">{preset.desc}</span>
                    </button>
                  )
                })}
              </div>
              {/* 自定义颜色 */}
              <div className="mt-4 flex items-center gap-4 border-t pt-4" style={{ borderColor: "hsl(var(--border))" }}>
                <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg">
                  <div className="h-full w-full" style={{ backgroundColor: draft.themeColor }} />
                  <input
                    type="color"
                    value={draft.themeColor}
                    onChange={e => updateDraft({ themeColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <div>
                  <p className="text-sm font-medium text-foreground">自定义颜色</p>
                  <code className="text-xs text-muted-foreground">{draft.themeColor}</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 圆角 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📐 圆角大小</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">圆角大小</span>
                <code className="text-sm font-semibold">{draft.themeRadius}px</code>
              </div>
              <input
                type="range" min={0} max={30} step={1}
                value={draft.themeRadius}
                onChange={e => updateDraft({ themeRadius: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">0px = 直角，12px = 默认圆角，24px = 大圆角</p>
            </CardContent>
          </Card>

          {/* 阴影强度 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🌫️ 阴影强度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">阴影强度</span>
                <code className="text-sm font-semibold">{draft.themeShadowIntensity}%</code>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={draft.themeShadowIntensity}
                onChange={e => updateDraft({ themeShadowIntensity: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">控制卡片、按钮等元素的阴影深度</p>
            </CardContent>
          </Card>

          {/* 背景透明度 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">💧 背景透明度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">背景透明度</span>
                <code className="text-sm font-semibold">{draft.themeAlpha}%</code>
              </div>
              <input
                type="range" min={0} max={50} step={1}
                value={draft.themeAlpha}
                onChange={e => updateDraft({ themeAlpha: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">标签、按钮等元素的背景着色深度（0% = 无着色）</p>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：预览 */}
        <div className="flex flex-col gap-6">
          {/* 实时预览 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">👁️ 实时预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" style={{ borderRadius: rounded }}>主要按钮</Button>
                <Button size="sm" variant="secondary" style={{ borderRadius: rounded }}>次要按钮</Button>
                <Badge variant="outline" className="px-2.5" style={{ borderRadius: rounded }}>标签样式</Badge>
                <Badge variant="outline" className="px-2.5" style={{ borderRadius: rounded }}>游戏分类</Badge>
              </div>
              <div
                className="rounded-xl border p-4"
                style={{ borderRadius: rounded, borderColor: `rgba(${tr},${tg},${tb},0.2)` }}
              >
                <div className="flex gap-4">
                  <div
                    className="h-16 w-16 shrink-0"
                    style={{
                      borderRadius: rounded,
                      backgroundColor: `rgba(${tr},${tg},${tb},0.2)`,
                      opacity: 0.5,
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">游戏卡片预览</p>
                    <p className="text-xs text-muted-foreground">这是圆角和阴影的预览效果</p>
                    <div className="mt-2 flex gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">tag1</Badge>
                      <Badge variant="secondary" className="text-[10px]">tag2</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {[5, 10, 15, 20, 30].map(pct => (
                  <div
                    key={pct}
                    className="flex flex-1 items-center justify-center rounded-lg py-2.5 font-mono text-xs"
                    style={{ backgroundColor: `rgba(${tr},${tg},${tb},${pct / 100})`, borderRadius: rounded }}
                  >
                    {pct}%
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 当前生效主题 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" strokeWidth={2} /> 当前生效主题</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: initialSettings.themeColor, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)" }}
                  />
                  <code className="text-xs text-muted-foreground">{initialSettings.themeColor}</code>
                </div>
                <span className="text-xs text-muted-foreground">圆角: <strong>{initialSettings.themeRadius}px</strong></span>
                <span className="text-xs text-muted-foreground">阴影: <strong>{initialSettings.themeShadowIntensity}%</strong></span>
                <span className="text-xs text-muted-foreground">透明: <strong>{initialSettings.themeAlpha}%</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* 待保存变更 */}
          {hasChanges && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" strokeWidth={2} /> 待保存变更</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {draft.themeColor !== initialSettings.themeColor && (
                  <p className="text-sm">
                    颜色: <span className="line-through text-muted-foreground">{initialSettings.themeColor}</span> → <strong>{draft.themeColor}</strong>
                  </p>
                )}
                {draft.themeRadius !== initialSettings.themeRadius && (
                  <p className="text-sm">
                    圆角: <span className="line-through text-muted-foreground">{initialSettings.themeRadius}px</span> → <strong>{draft.themeRadius}px</strong>
                  </p>
                )}
                {draft.themeShadowIntensity !== initialSettings.themeShadowIntensity && (
                  <p className="text-sm">
                    阴影: <span className="line-through text-muted-foreground">{initialSettings.themeShadowIntensity}%</span> → <strong>{draft.themeShadowIntensity}%</strong>
                  </p>
                )}
                {draft.themeAlpha !== initialSettings.themeAlpha && (
                  <p className="text-sm">
                    透明: <span className="line-through text-muted-foreground">{initialSettings.themeAlpha}%</span> → <strong>{draft.themeAlpha}%</strong>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
