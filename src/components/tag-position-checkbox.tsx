"use client"

import { getPositionsByGroup } from "@/lib/tag-positions"
import { Home, ClipboardList, Link, Search, Cloud, Trophy, User, Folder, Download } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

type IconType = ComponentType<SVGProps<SVGSVGElement>>

const ICON_MAP: Record<string, IconType> = {
  Home, ClipboardList, Link, Search, Cloud, Trophy, User, Folder, Download,
}

const POSITION_GROUPS = getPositionsByGroup()

export function PositionCheckboxGroup({
  selected,
  onChange,
  disabled,
}: {
  selected: string[]
  onChange: (positions: string[]) => void
  disabled?: boolean
}) {
  function toggle(key: string) {
    if (disabled) return
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key]
    )
  }

  return (
    <div className="space-y-3">
      {Object.entries(POSITION_GROUPS).map(([groupName, positions]) => (
        <div key={groupName}>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{groupName}</p>
          <div className="flex flex-wrap gap-1.5">
            {positions.map((pos) => {
              const checked = selected.includes(pos.key)
              const Icon = ICON_MAP[pos.icon]
              return (
                <button
                  key={pos.key}
                  type="button"
                  onClick={() => toggle(pos.key)}
                  disabled={disabled}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-all ${
                    checked
                      ? "bg-primary/15 text-primary ring-primary/30"
                      : "bg-secondary text-muted-foreground ring-border hover:bg-accent hover:text-foreground"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  title={pos.description}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
                  <span>{pos.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
