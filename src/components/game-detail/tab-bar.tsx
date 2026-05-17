"use client"

import { useEffect, useRef } from "react"

interface Tab {
  key: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  activeKey: string
  onTabChange: (key: string) => void
  commentCount?: number
}

export function TabBar({ tabs, activeKey, onTabChange, commentCount }: TabBarProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 滑块动画
  useEffect(() => {
    const container = containerRef.current
    const slider = sliderRef.current
    if (!container || !slider) return
    const idx = tabs.findIndex(t => t.key === activeKey)
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-tab-btn]')
    const btn = buttons[idx]
    if (!btn) return
    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    slider.style.width = `${btnRect.width}px`
    slider.style.transform = `translateX(${btnRect.left - containerRect.left - 4}px)`
  }, [activeKey, tabs])

  return (
    <div
      ref={containerRef}
      className="relative inline-flex gap-1 rounded-2xl p-1"
      style={{
        backgroundColor: "var(--tab-trough, hsl(var(--secondary)))",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* 滑块 */}
      <div
        ref={sliderRef}
        className="absolute top-1 left-0 h-[calc(100%-8px)] rounded-xl transition-all duration-300 ease-out"
        style={{
          backgroundColor: "var(--tab-active, hsl(var(--background)))",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
        }}
      />
      {tabs.map((t) => (
        <button
          key={t.key}
          data-tab-btn
          onClick={() => onTabChange(t.key)}
          className="relative z-10 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors duration-300"
          style={{
            color: activeKey === t.key
              ? "var(--tab-active-text, hsl(var(--foreground)))"
              : "var(--tab-inactive-text, hsl(var(--muted-foreground)))",
            fontWeight: activeKey === t.key ? 700 : 500,
          }}
        >
          {t.label}
          {t.key === "comments" && commentCount !== undefined && commentCount > 0 && (
            <span className="ml-1.5 text-[10px] opacity-60">{commentCount}</span>
          )}
        </button>
      ))}
    </div>
  )
}