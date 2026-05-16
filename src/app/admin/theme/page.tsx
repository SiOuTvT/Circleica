"use client"

import { useThemeSettings, type FullThemeSettings } from "@/components/theme-provider"
import { applyThemeColor } from "@/lib/theme-colors"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"

// Dynamically import the Vue bridge to avoid SSR issues
const VueReactBridge = dynamic(
  () => import("@/components/vue-react-bridge").then((mod) => mod.VueReactBridge),
  { ssr: false }
)

/* ── 主页面 ── */
export default function ThemeSettingsPage() {
  const { settings: ctxSettings, applyAll } = useThemeSettings()
  const [draft, setDraft] = useState<FullThemeSettings>(ctxSettings)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Use refs so Vue component can read/write without re-creating the app
  const draftRef = useRef(draft)
  const ctxSettingsRef = useRef(ctxSettings)
  const savingRef = useRef(saving)
  const refreshRef = useRef<(() => void) | null>(null)

  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => { ctxSettingsRef.current = ctxSettings }, [ctxSettings])
  useEffect(() => { savingRef.current = saving }, [saving])
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    setDraft(ctxSettings)
  }, [ctxSettings])

  // Live preview on draft change
  useEffect(() => {
    applyThemeColor(draft.themeColor, draft.themeRadius, draft.themeShadowIntensity, draft.themeAlpha)
  }, [draft])

  const handleSave = useCallback(async (settingsToSave: FullThemeSettings) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToSave),
      })
      if (res.ok) {
        applyAll(settingsToSave)
      } else {
        throw new Error("Save failed")
      }
    } finally {
      setSaving(false)
    }
  }, [applyAll])

  const createApp = useCallback((container: HTMLDivElement) => {
    const { createApp, h, ref, watch, computed } = require("vue") as typeof import("vue")
    const { ThemeEditor } = require("@/components/vue-theme-editor")

    // Create reactive refs inside Vue that sync with React state
    const vueInitialSettings = ref({ ...ctxSettingsRef.current })
    const vueSaving = ref(savingRef.current)

    // Keep a refresh function to update Vue refs from React
    refreshRef.current = () => {
      vueInitialSettings.value = { ...ctxSettingsRef.current }
      vueSaving.value = savingRef.current
    }

    const app = createApp({
      setup() {
        return () => h(ThemeEditor, {
          initialSettings: vueInitialSettings.value,
          saving: vueSaving.value,
          onSettingsChange: (newSettings: FullThemeSettings) => {
            // Update React state from Vue
            draftRef.current = newSettings
            setDraft(newSettings)
          },
          onSave: async (settingsToSave: FullThemeSettings) => {
            await handleSave(settingsToSave)
            // After save, update Vue's initial settings to the new saved values
            vueInitialSettings.value = { ...settingsToSave }
          },
        })
      },
    })

    app.mount(container)
    return app
  }, [handleSave])

  // Sync React state changes back to Vue
  useEffect(() => {
    refreshRef.current?.()
  }, [ctxSettings, saving])

  if (!mounted) return null

  return (
    <div style={{ padding: 0 }}>
      <VueReactBridge createApp={createApp} />
    </div>
  )
}