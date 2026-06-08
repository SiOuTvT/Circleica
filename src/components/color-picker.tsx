"use client"

import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { useEffect, useState } from "react"

export function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  const [hexInput, setHexInput] = useState(value)

  function handleHexChange(v: string) {
    setHexInput(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v)
    }
  }

  function handlePresetClick(c: string) {
    setHexInput(c)
    onChange(c)
  }

  useEffect(() => {
    setHexInput(value)
  }, [value])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TAG_PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => handlePresetClick(c)}
            className={`h-6 w-6 rounded-full transition-all ${
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-background scale-110"
                : "hover:scale-110"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            setHexInput(e.target.value)
            onChange(e.target.value)
          }}
          className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent"
          title="点击打开调色盘"
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className="w-24 rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground font-mono ring-1 ring-border outline-none focus:ring-ring"
        />
        <div className="h-6 w-6 rounded-full ring-1 ring-border" style={{ background: value }} title="当前颜色预览" />
      </div>
    </div>
  )
}
