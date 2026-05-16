/**
 * Vue Theme Editor Component
 * Built entirely with Vue's programmatic h() API + Naive UI
 * This avoids needing .vue SFC files which require vue-loader
 */
import {
  CheckmarkCircle as CheckIcon,
  ColorPalette as PaletteIcon,
  Refresh as ResetIcon,
  Save as SaveIcon,
} from "@vicons/ionicons5"
import {
  NButton,
  NCard,
  NColorPicker,
  NConfigProvider,
  NGi,
  NGrid,
  NIcon,
  NSlider,
  NSpace,
  NTag,
  NText,
  type GlobalThemeOverrides,
} from "naive-ui"
import { computed, defineComponent, h, ref, watch, type PropType } from "vue"

/* ── 预设主题色 ── */
const THEME_PRESETS = [
  { name: "sky", label: "天空蓝", color: "#38BDF8", desc: "清新 · 现代" },
  { name: "violet", label: "梦幻紫", color: "#a78bfa", desc: "浪漫 · 二次元" },
  { name: "pink", label: "樱花粉", color: "#f472b6", desc: "甜美 · 少女" },
  { name: "rose", label: "玫瑰红", color: "#fb7185", desc: "热情 · 活力" },
  { name: "emerald", label: "翡翠绿", color: "#34d399", desc: "清新 · 自然" },
  { name: "amber", label: "琥珀金", color: "#fbbf24", desc: "温暖 · 活泼" },
  { name: "orange", label: "落日橙", color: "#fb923c", desc: "热情 · 明亮" },
  { name: "teal", label: "薄荷青", color: "#2dd4bf", desc: "清凉 · 治愈" },
  { name: "indigo", label: "靛青蓝", color: "#818cf8", desc: "深邃 · 优雅" },
  { name: "cyan", label: "水色青", color: "#22d3ee", desc: "清澈 · 灵动" },
]

/* ── 颜色工具 ── */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")
  return `#${toHex(r + (255 - r) * amount)}${toHex(g + (255 - g) * amount)}${toHex(b + (255 - b) * amount)}`
}

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")
  return `#${toHex(r * (1 - amount))}${toHex(g * (1 - amount))}${toHex(b * (1 - amount))}`
}

function hexToHsl(h: string): string {
  const [r, g, b] = hexToRgb(h)
  const r1 = r / 255, g1 = g / 255, b1 = b / 255
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1)
  let hv = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r1: hv = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6; break
      case g1: hv = ((b1 - r1) / d + 2) / 6; break
      case b1: hv = ((r1 - g1) / d + 4) / 6; break
    }
  }
  return `${Math.round(hv * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/* ── Theme Editor Component ── */
export const ThemeEditor = defineComponent({
  name: "ThemeEditor",
  props: {
    /** Initial settings from React context */
    initialSettings: {
      type: Object as PropType<{
        themeColor: string
        themeRadius: number
        themeShadowIntensity: number
        themeAlpha: number
      }>,
      required: true,
    },
    /** Callback to notify React when settings change (for live preview) */
    onSettingsChange: {
      type: Function as PropType<(settings: { themeColor: string; themeRadius: number; themeShadowIntensity: number; themeAlpha: number }) => void>,
      required: true,
    },
    /** Callback to save settings */
    onSave: {
      type: Function as PropType<(settings: { themeColor: string; themeRadius: number; themeShadowIntensity: number; themeAlpha: number }) => Promise<void>>,
      required: true,
    },
    /** Whether save is in progress */
    saving: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const draft = ref({ ...props.initialSettings })
    const saved = ref(false)
    const localSaving = ref(false)

    // Sync from React when initial settings change
    watch(
      () => props.initialSettings,
      (val) => {
        draft.value = { ...val }
      },
      { deep: true }
    )

    const hasChanges = computed(() => {
      return JSON.stringify(draft.value) !== JSON.stringify(props.initialSettings)
    })

    const naiveOverrides = computed<GlobalThemeOverrides>(() => ({
      common: {
        primaryColor: draft.value.themeColor,
        primaryColorHover: draft.value.themeColor,
        primaryColorPressed: draft.value.themeColor,
        primaryColorSuppl: draft.value.themeColor,
        borderRadius: "8px",
      },
      Button: { borderRadiusMedium: "8px", borderRadiusSmall: "6px" },
      Card: { borderRadius: "12px" },
      Slider: { handleSize: "18px", railHeight: "6px" },
    }))

    // Notify React of draft changes for live preview
    watch(draft, (val) => {
      props.onSettingsChange({ ...val })
    }, { deep: true })

    const updateDraft = (patch: Partial<typeof draft.value>) => {
      draft.value = { ...draft.value, ...patch }
    }

    const handleReset = () => {
      draft.value = {
        themeColor: "#38BDF8",
        themeRadius: 12,
        themeShadowIntensity: 50,
        themeAlpha: 15,
      }
    }

    const handleSave = async () => {
      localSaving.value = true
      try {
        await props.onSave({ ...draft.value })
        saved.value = true
        setTimeout(() => { saved.value = false }, 2500)
      } catch (e) {
        console.error("Failed to save theme", e)
      } finally {
        localSaving.value = false
      }
    }

    return () => {
      const rounded = `${draft.value.themeRadius}px`
      const [tr, tg, tb] = hexToRgb(draft.value.themeColor)

      return h(NConfigProvider, { themeOverrides: naiveOverrides.value }, () =>
        h("div", { style: { display: "flex", flexDirection: "column", gap: "32px", maxWidth: "1200px" } }, [

          /* ── 标题栏 ── */
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" } }, [
            h("div", null, [
              h("h1", { style: { display: "flex", alignItems: "center", gap: "12px", fontSize: "24px", fontWeight: 700, margin: 0 } }, [
                h(NIcon, { size: 28, color: draft.value.themeColor }, () => h(PaletteIcon)),
                "主题设置",
              ]),
              h(NText, { depth: 3, style: { marginTop: "4px", display: "block" } }, () => "自定义网站的颜色、圆角、阴影和透明度，所有修改都会实时预览"),
            ]),
            h(NSpace, null, () => [
              h(NButton, { quaternary: true, iconPlacement: "left", onClick: handleReset }, {
                icon: () => h(NIcon, null, () => h(ResetIcon)),
                default: () => "恢复默认",
              }),
              h(NButton, {
                type: "primary",
                strong: true,
                loading: localSaving.value || props.saving,
                disabled: !hasChanges.value,
                onClick: handleSave,
              }, {
                icon: saved.value ? () => h(NIcon, null, () => h(CheckIcon)) : () => h(NIcon, null, () => h(SaveIcon)),
                default: () => saved.value ? "已保存" : "确认保存",
              }),
            ]),
          ]),

          /* ── Main Grid ── */
          h(NGrid, { xGap: 32, yGap: 32, cols: "1 640:2" }, () => [
            /* ── Left: Controls ── */
            h(NGi, null, () =>
              h(NSpace, { vertical: true, size: 24 }, () => [

                /* 主题色预设 */
                h(NCard, { title: "🎨 主题颜色", size: "small" }, () => [
                  h(NGrid, { xGap: 12, yGap: 12, cols: "2 480:5" }, () =>
                    THEME_PRESETS.map((preset) => {
                      const isActive = draft.value.themeColor.toLowerCase() === preset.color.toLowerCase()
                      return h(NGi, { key: preset.name }, () =>
                        h("div", {
                          onClick: () => updateDraft({ themeColor: preset.color }),
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px",
                            borderRadius: "12px",
                            border: `2px solid ${isActive ? draft.value.themeColor : "var(--border)"}`,
                            backgroundColor: isActive ? `rgba(${tr},${tg},${tb},0.1)` : "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          },
                        }, [
                          h("div", { style: { position: "relative" } }, [
                            h("div", {
                              style: {
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: preset.color,
                                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
                              },
                            }),
                            isActive ? h("div", {
                              style: {
                                position: "absolute",
                                inset: "0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              },
                            }, h(NIcon, { size: 20, color: "#fff", style: { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" } }, () => h(CheckIcon))) : null,
                          ]),
                          h(NText, { strong: true, style: { fontSize: "12px" } }, () => preset.label),
                          h(NText, { depth: 3, style: { fontSize: "10px" } }, () => preset.desc),
                        ])
                      )
                    })
                  ),
                  /* 自定义颜色选择器 */
                  h("div", { style: { marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" } }, [
                    h(NColorPicker, {
                      value: draft.value.themeColor,
                      onUpdateValue: (val: string) => { if (val) updateDraft({ themeColor: val }) },
                      showAlpha: false,
                      size: "large",
                      style: { width: "60px" },
                      modes: ["hex"],
                    }),
                    h("div", null, [
                      h(NText, { strong: true }, () => "自定义颜色"),
                      h("br"),
                      h(NText, { code: true, depth: 3 }, () => draft.value.themeColor),
                    ]),
                  ]),
                ]),

                /* 圆角滑块 */
                h(NCard, { title: "📐 圆角大小", size: "small" }, () =>
                  h(NSpace, { vertical: true, size: 12 }, () => [
                    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, [
                      h(NText, null, () => "Border Radius"),
                      h(NText, { code: true, strong: true }, () => `${draft.value.themeRadius}px`),
                    ]),
                    h(NSlider, {
                      value: draft.value.themeRadius,
                      min: 0,
                      max: 30,
                      step: 1,
                      onUpdateValue: (v: number) => updateDraft({ themeRadius: v }),
                      marks: { 0: "0px", 12: "默认", 24: "大圆角", 30: "30px" },
                    }),
                    h(NText, { depth: 3, style: { fontSize: "12px" } }, () => "0px = 直角，12px = 默认圆角，24px = 大圆角"),
                  ])
                ),

                /* 阴影强度滑块 */
                h(NCard, { title: "🌫️ 阴影强度", size: "small" }, () =>
                  h(NSpace, { vertical: true, size: 12 }, () => [
                    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, [
                      h(NText, null, () => "Shadow Intensity"),
                      h(NText, { code: true, strong: true }, () => `${draft.value.themeShadowIntensity}%`),
                    ]),
                    h(NSlider, {
                      value: draft.value.themeShadowIntensity,
                      min: 0,
                      max: 100,
                      step: 5,
                      onUpdateValue: (v: number) => updateDraft({ themeShadowIntensity: v }),
                      marks: { 0: "无", 50: "默认", 100: "最强" },
                    }),
                    h(NText, { depth: 3, style: { fontSize: "12px" } }, () => "控制卡片、按钮等元素的阴影深度"),
                  ])
                ),

                /* 背景透明度滑块 */
                h(NCard, { title: "💧 背景透明度", size: "small" }, () =>
                  h(NSpace, { vertical: true, size: 12 }, () => [
                    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, [
                      h(NText, null, () => "Background Alpha"),
                      h(NText, { code: true, strong: true }, () => `${draft.value.themeAlpha}%`),
                    ]),
                    h(NSlider, {
                      value: draft.value.themeAlpha,
                      min: 0,
                      max: 50,
                      step: 1,
                      onUpdateValue: (v: number) => updateDraft({ themeAlpha: v }),
                      marks: { 0: "无", 15: "默认", 50: "最深" },
                    }),
                    h(NText, { depth: 3, style: { fontSize: "12px" } }, () => "标签、按钮等元素的背景着色深度（0% = 无着色）"),
                  ])
                ),
              ])
            ),

            /* ── Right: Preview ── */
            h(NGi, null, () =>
              h(NSpace, { vertical: true, size: 24 }, () => [

                /* 实时预览沙盒 */
                h(NCard, { title: "👁️ 实时预览", size: "small" }, () =>
                  h("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } }, [
                    /* 按钮行 */
                    h(NSpace, null, () => [
                      h(NButton, { type: "primary", strong: true, style: { borderRadius: rounded } }, () => "主要按钮"),
                      h(NButton, { secondary: true, style: { borderRadius: rounded } }, () => "次要按钮"),
                      h(NTag, { round: true, type: "info", style: { borderRadius: rounded } }, () => "标签样式"),
                      h(NTag, { round: true, type: "success", style: { borderRadius: rounded } }, () => "游戏分类"),
                    ]),
                    /* 卡片预览 */
                    h(NCard, {
                      size: "small",
                      style: { borderRadius: rounded, borderColor: `rgba(${tr},${tg},${tb},0.2)` },
                    }, () =>
                      h("div", { style: { display: "flex", alignItems: "flex-start", gap: "16px" } }, [
                        h("div", {
                          style: {
                            width: "64px", height: "64px", borderRadius: rounded,
                            backgroundColor: lightenHex(draft.value.themeColor, 0.2),
                            opacity: 0.5, flexShrink: "0",
                          },
                        }),
                        h("div", { style: { flex: "1" } }, [
                          h(NText, { strong: true }, () => "游戏卡片预览"),
                          h("br"),
                          h(NText, { depth: 3, style: { fontSize: "13px" } }, () => "这是圆角和阴影的预览效果"),
                          h(NSpace, { size: "small", style: { marginTop: "8px" } }, () => [
                            h(NTag, { size: "small", round: true, type: "info" }, () => "tag1"),
                            h(NTag, { size: "small", round: true, type: "info" }, () => "tag2"),
                          ]),
                        ]),
                      ])
                    ),
                    /* 透明度色块 */
                    h(NSpace, null, () =>
                      [5, 10, 15, 20, 30].map((pct) =>
                        h("div", {
                          key: pct,
                          style: {
                            height: "40px", flex: "1", minWidth: "60px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "12px", fontFamily: "monospace", borderRadius: rounded,
                            backgroundColor: `rgba(${tr},${tg},${tb},${pct / 100})`,
                          },
                        }, `${pct}%`)
                      )
                    ),
                  ])
                ),

                /* 当前生效主题 */
                h(NCard, { title: "💾 当前生效主题", size: "small" }, () =>
                  h(NGrid, { cols: 2, xGap: 16, yGap: 12 }, () => [
                    h(NGi, null, () =>
                      h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, [
                        h("div", {
                          style: {
                            width: "20px", height: "20px", borderRadius: "50%",
                            backgroundColor: props.initialSettings.themeColor,
                            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
                          },
                        }),
                        h(NText, { code: true, depth: 3 }, () => props.initialSettings.themeColor),
                      ])
                    ),
                    h(NGi, null, () => h(NText, { depth: 3 }, () => ["圆角: ", h(NText, { strong: true }, () => `${props.initialSettings.themeRadius}px`)])),
                    h(NGi, null, () => h(NText, { depth: 3 }, () => ["阴影: ", h(NText, { strong: true }, () => `${props.initialSettings.themeShadowIntensity}%`)])),
                    h(NGi, null, () => h(NText, { depth: 3 }, () => ["透明: ", h(NText, { strong: true }, () => `${props.initialSettings.themeAlpha}%`)])),
                  ])
                ),

                /* 变更预览 diff */
                hasChanges.value ? h(NCard, { title: "📝 待保存变更", size: "small", style: { borderColor: "var(--clr-warm, #f59e0b)" } }, () =>
                  h(NSpace, { vertical: true, size: 8 }, () => {
                    const items: any[] = []
                    if (draft.value.themeColor !== props.initialSettings.themeColor) {
                      items.push(h(NText, { key: "color" }, () => [
                        "颜色: ",
                        h(NText, { delete: true, depth: 3 }, () => props.initialSettings.themeColor),
                        " → ",
                        h(NText, { strong: true }, () => draft.value.themeColor),
                      ]))
                    }
                    if (draft.value.themeRadius !== props.initialSettings.themeRadius) {
                      items.push(h(NText, { key: "radius" }, () => [
                        "圆角: ",
                        h(NText, { delete: true, depth: 3 }, () => `${props.initialSettings.themeRadius}px`),
                        " → ",
                        h(NText, { strong: true }, () => `${draft.value.themeRadius}px`),
                      ]))
                    }
                    if (draft.value.themeShadowIntensity !== props.initialSettings.themeShadowIntensity) {
                      items.push(h(NText, { key: "shadow" }, () => [
                        "阴影: ",
                        h(NText, { delete: true, depth: 3 }, () => `${props.initialSettings.themeShadowIntensity}%`),
                        " → ",
                        h(NText, { strong: true }, () => `${draft.value.themeShadowIntensity}%`),
                      ]))
                    }
                    if (draft.value.themeAlpha !== props.initialSettings.themeAlpha) {
                      items.push(h(NText, { key: "alpha" }, () => [
                        "透明: ",
                        h(NText, { delete: true, depth: 3 }, () => `${props.initialSettings.themeAlpha}%`),
                        " → ",
                        h(NText, { strong: true }, () => `${draft.value.themeAlpha}%`),
                      ]))
                    }
                    return items
                  })
                ) : null,
              ])
            ),
          ]),
        ])
      )
    }
  },
})